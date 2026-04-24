/**
 * FTP connector — passive mode (PASV) using Node.js `net` module directly.
 * No external FTP package required.
 */

import * as net from "node:net";
import * as zlib from "node:zlib";
import { promisify } from "node:util";
import type { SupplierFeed, SupplierCredentials } from "../../../db/schema/suppliers.js";
import type { DownloadResult } from "./types.js";

const gunzip = promisify(zlib.gunzip);

const TIMEOUT_MS = 30_000;

// ── FtpClient ─────────────────────────────────────────────────────────────────

class FtpClient {
  private socket: net.Socket;
  private buffer = "";

  constructor() {
    this.socket = new net.Socket();
    this.socket.setEncoding("binary");
  }

  async connect(host: string, port: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.socket.destroy();
        reject(new Error(`FTP connect timeout to ${host}:${port}`));
      }, TIMEOUT_MS);

      this.socket.once("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });

      this.socket.connect(port, host, () => {
        clearTimeout(timer);
        this.socket.on("data", (chunk: string) => {
          this.buffer += chunk;
        });
        this.readResponse().then(resolve).catch(reject);
      });
    });
  }

  async sendCommand(cmd: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`FTP command timeout: ${cmd.split(" ")[0]}`));
      }, TIMEOUT_MS);

      this.socket.write(cmd + "\r\n", "binary", (err) => {
        if (err) {
          clearTimeout(timer);
          reject(err);
          return;
        }
        clearTimeout(timer);
        this.readResponse().then(resolve).catch(reject);
      });
    });
  }

  async readResponse(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("FTP read response timeout"));
      }, TIMEOUT_MS);

      const check = (): void => {
        // RFC 959: final response line is "DDD " (3 digits + space)
        // Multi-line responses use "DDD-" for continuation lines
        const lines = this.buffer.split("\r\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]!;
          if (line.length >= 4 && /^\d{3} /.test(line)) {
            // Found the final line — consume everything up to and including it
            this.buffer = lines.slice(i + 1).join("\r\n");
            clearTimeout(timer);
            resolve(line);
            return;
          }
        }
        // Not yet complete — wait for more data
        this.socket.once("data", check);
      };

      // Detach any lingering once-listener and re-attach
      check();
    });
  }

  async downloadData(host: string, port: number): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const dataSocket = new net.Socket();
      const chunks: Buffer[] = [];

      const timer = setTimeout(() => {
        dataSocket.destroy();
        reject(new Error(`FTP data connection timeout to ${host}:${port}`));
      }, TIMEOUT_MS);

      dataSocket.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });

      dataSocket.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      dataSocket.on("close", () => {
        clearTimeout(timer);
        resolve(Buffer.concat(chunks));
      });

      dataSocket.connect(port, host);
    });
  }

  destroy(): void {
    try {
      this.socket.destroy();
    } catch {
      // ignore
    }
  }
}

// ── Helper: parse 227 PASV response ──────────────────────────────────────────

function parsePasvResponse(response: string): { host: string; port: number } {
  const match = /\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/.exec(response);
  if (!match) {
    throw new Error(`Failed to parse PASV response: ${response}`);
  }
  const [, h1, h2, h3, h4, p1, p2] = match;
  const host = `${h1}.${h2}.${h3}.${h4}`;
  const port = parseInt(p1!, 10) * 256 + parseInt(p2!, 10);
  return { host, port };
}

// ── Helper: expect a specific response code ───────────────────────────────────

function expectCode(response: string, code: number): void {
  if (!response.startsWith(String(code))) {
    throw new Error(`FTP: expected ${code}, got: ${response}`);
  }
}

// ── Main connector ────────────────────────────────────────────────────────────

export async function runFtpConnector(
  feed: SupplierFeed,
  creds: SupplierCredentials,
): Promise<DownloadResult> {
  const remoteConfig = feed.remoteConfig;
  if (!remoteConfig) {
    throw new Error("FTP connector: remoteConfig is required but was null");
  }

  const client = new FtpClient();

  try {
    // 1. Connect and handshake
    const welcome = await client.connect(remoteConfig.host, remoteConfig.port);
    expectCode(welcome, 220);

    const userResp = await client.sendCommand(`USER ${creds.username ?? ""}`);
    expectCode(userResp, 331);

    const passResp = await client.sendCommand(`PASS ${creds.password ?? ""}`);
    expectCode(passResp, 230);

    // Binary mode
    const typeResp = await client.sendCommand("TYPE I");
    expectCode(typeResp, 200);

    // 2. LIST directory to find matching file
    const pasvResp1 = await client.sendCommand("PASV");
    expectCode(pasvResp1, 227);
    const { host: dataHost1, port: dataPort1 } = parsePasvResponse(pasvResp1);

    const dataPromise1 = client.downloadData(dataHost1, dataPort1);

    const listResp = await client.sendCommand(`LIST ${remoteConfig.remotePath}`);
    expectCode(listResp, 150);

    const listBuf = await dataPromise1;

    // Wait for 226 Transfer complete
    const listDone = await client.readResponse();
    expectCode(listDone, 226);

    const listing = listBuf.toString("binary");
    const lines = listing.split(/\r?\n/).filter((l) => l.trim().length > 0);

    // 3. Find matching file — treat filePattern as a regex
    const pattern = new RegExp(remoteConfig.filePattern);
    const matchingLines = lines.filter((line) => {
      // Standard ls -l format: last field is the file name
      const parts = line.split(/\s+/);
      const name = parts[parts.length - 1] ?? "";
      return pattern.test(name);
    });

    if (matchingLines.length === 0) {
      throw new Error(
        `FTP: no files matching pattern "${remoteConfig.filePattern}" in ${remoteConfig.remotePath}`,
      );
    }

    // Pick last match (most recent in listing order)
    const lastLine = matchingLines[matchingLines.length - 1]!;
    const lastParts = lastLine.split(/\s+/);
    const fileName = lastParts[lastParts.length - 1]!;

    // 4. Download the file
    const pasvResp2 = await client.sendCommand("PASV");
    expectCode(pasvResp2, 227);
    const { host: dataHost2, port: dataPort2 } = parsePasvResponse(pasvResp2);

    const dataPromise2 = client.downloadData(dataHost2, dataPort2);

    const retrResp = await client.sendCommand(
      `RETR ${remoteConfig.remotePath}/${fileName}`,
    );
    expectCode(retrResp, 150);

    const fileBuf = await dataPromise2;

    // Wait for 226
    const retrDone = await client.readResponse();
    expectCode(retrDone, 226);

    // 5. Decompress if needed
    let finalBuf: Buffer = fileBuf;
    if (remoteConfig.unzip) {
      finalBuf = await gunzip(fileBuf) as Buffer;
    }

    // 6. Decode
    const content = finalBuf.toString(remoteConfig.encoding as BufferEncoding);

    // 7. Quit
    try {
      await client.sendCommand("QUIT");
    } catch {
      // Ignore quit errors
    }

    return { content, fileName };
  } finally {
    client.destroy();
  }
}
