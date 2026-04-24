/**
 * SFTP connector.
 *
 * Uses the `ssh2` package loaded at runtime via createRequire to avoid
 * compile-time errors when the package is not yet installed.
 *
 * Install before use:
 *   npm install ssh2
 *   npm install --save-dev @types/ssh2
 */

import { createRequire } from "node:module";
import * as zlib from "node:zlib";
import { promisify } from "node:util";
import type { SupplierFeed, SupplierCredentials } from "../../../db/schema/suppliers.js";
import type { DownloadResult } from "./types.js";

const _require = createRequire(import.meta.url);
const gunzip = promisify(zlib.gunzip);

// ── Minimal ssh2 type stubs (avoids compile-time dependency on @types/ssh2) ──

interface SFTPEntryAttrs {
  mtime?: number;
}
interface SFTPEntry {
  filename: string;
  attrs: SFTPEntryAttrs;
}
interface SFTPWrapper {
  readdir(
    path: string,
    callback: (err: Error | null, list: SFTPEntry[]) => void,
  ): void;
  createReadStream(path: string): NodeJS.ReadableStream;
}
interface SshConnectConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string | Buffer;
  passphrase?: string;
}
interface SshClient {
  on(event: "ready", listener: () => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  sftp(callback: (err: Error | null, sftp: SFTPWrapper) => void): void;
  connect(config: SshConnectConfig): void;
  end(): void;
}
interface Ssh2Module {
  Client: new () => SshClient;
}

// ── Runtime loader ─────────────────────────────────────────────────────────────

function loadSsh2(): Ssh2Module {
  try {
    return _require("ssh2") as Ssh2Module;
  } catch {
    throw new Error(
      "SFTP connector requires the 'ssh2' package. " +
        "Install with: npm install ssh2 && npm install --save-dev @types/ssh2",
    );
  }
}

// ── Helper ─────────────────────────────────────────────────────────────────────

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  }
  return Buffer.concat(chunks);
}

// ── Main connector ─────────────────────────────────────────────────────────────

export async function runSftpConnector(
  feed: SupplierFeed,
  creds: SupplierCredentials,
): Promise<DownloadResult> {
  const remoteConfig = feed.remoteConfig;
  if (!remoteConfig) {
    throw new Error("SFTP connector: remoteConfig is required but was null");
  }

  const { Client: SshClient } = loadSsh2();
  const conn = new SshClient();

  try {
    // 1. Connect and obtain the SFTP subsystem
    const sftp = await new Promise<SFTPWrapper>((resolve, reject) => {
      conn.on("ready", () => {
        conn.sftp((err, sftpStream) => {
          if (err) reject(err);
          else resolve(sftpStream);
        });
      });
      conn.on("error", reject);

      const connectOpts: SshConnectConfig = {
        host: remoteConfig.host,
        port: remoteConfig.port,
        username: creds.username ?? "",
      };

      if (creds.privateKey) {
        connectOpts.privateKey = creds.privateKey;
        if (creds.passphrase) connectOpts.passphrase = creds.passphrase;
      } else {
        connectOpts.password = creds.password ?? "";
      }

      conn.connect(connectOpts);
    });

    // 2. List remote directory
    const readdir = promisify(sftp.readdir.bind(sftp));
    const entries = await readdir(remoteConfig.remotePath);

    // 3. Filter by filePattern (regex) and pick most recent
    const pattern = new RegExp(remoteConfig.filePattern);
    const matched = entries
      .filter((entry) => pattern.test(entry.filename))
      .sort((a, b) => (b.attrs.mtime ?? 0) - (a.attrs.mtime ?? 0));

    if (matched.length === 0) {
      throw new Error(
        `SFTP: no files matching "${remoteConfig.filePattern}" in ${remoteConfig.remotePath}`,
      );
    }

    const fileName = matched[0]!.filename;

    // 4. Download file
    const remotePath = `${remoteConfig.remotePath}/${fileName}`;
    const readStream = sftp.createReadStream(remotePath);
    const fileBuf = await streamToBuffer(readStream);

    // 5. Optionally decompress
    let finalBuf: Buffer = fileBuf;
    if (remoteConfig.unzip) {
      finalBuf = (await gunzip(fileBuf)) as Buffer;
    }

    // 6. Decode
    const content = finalBuf.toString(remoteConfig.encoding as BufferEncoding);

    conn.end();
    return { content, fileName };
  } catch (err) {
    try { conn.end(); } catch { /* ignore */ }
    throw err;
  }
}
