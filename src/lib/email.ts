import { config } from "../config.js";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendViaResend(opts: SendEmailOptions): Promise<void> {
  const { Resend } = await import("resend");
  const resend = new Resend(config.RESEND_API_KEY);

  const payload = {
    from: config.EMAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    ...(opts.text !== undefined ? { text: opts.text } : {}),
  };

  const { error } = await resend.emails.send(payload as Parameters<typeof resend.emails.send>[0]);
  if (error) throw new Error(`Resend error: ${error.message}`);
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  if (config.RESEND_API_KEY) {
    return sendViaResend(opts);
  }
  // Dev fallback — never silently drop emails.
  console.log("[email:dev]", JSON.stringify({ to: opts.to, subject: opts.subject }));
}

export function passwordResetEmail(resetUrl: string): Omit<SendEmailOptions, "to"> {
  return {
    subject: "Reset your password",
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
    text: `Reset your password: ${resetUrl}`,
  };
}

export function magicLinkEmail(loginUrl: string): Omit<SendEmailOptions, "to"> {
  return {
    subject: "Your sign-in link",
    html: `<p>Click <a href="${loginUrl}">here</a> to sign in. This link expires in 15 minutes.</p>`,
    text: `Sign in here: ${loginUrl}`,
  };
}
