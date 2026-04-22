import { authenticator } from "otplib";
import QRCode from "qrcode";

authenticator.options = { window: 1 }; // allow 1 step clock drift

export function generateTotpSecret(): string {
  return authenticator.generateSecret(20);
}

export function verifyTotpCode(secret: string, code: string): boolean {
  return authenticator.verify({ secret, token: code });
}

export async function totpQrDataUrl(
  secret: string,
  email: string,
  issuer: string,
): Promise<string> {
  const otpauth = authenticator.keyuri(email, issuer, secret);
  return QRCode.toDataURL(otpauth);
}
