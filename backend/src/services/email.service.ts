import { Resend } from "resend";
import { env } from "../config/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.log(`[email:dev-fallback] to=${to} subject="${subject}"\n${html}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("Failed to send email via Resend:", error);
  }
}

function layout(title: string, bodyHtml: string) {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1d4ed8;">SiteTracker</h2>
      <h3>${title}</h3>
      ${bodyHtml}
      <p style="color: #64748b; font-size: 12px; margin-top: 32px;">If you didn't expect this email, you can safely ignore it.</p>
    </div>
  `;
}

export function sendInviteEmail(to: string, name: string, setPasswordUrl: string) {
  return send(
    to,
    "You've been invited to SiteTracker",
    layout(
      "Set your password",
      `<p>Hi ${name},</p>
       <p>An administrator created a SiteTracker account for you. Click below to set your password and get started.</p>
       <p><a href="${setPasswordUrl}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Set your password</a></p>
       <p>This link expires in 1 hour.</p>`
    )
  );
}

export function sendPasswordResetEmail(to: string, resetUrl: string) {
  return send(
    to,
    "Reset your SiteTracker password",
    layout(
      "Password reset requested",
      `<p>We received a request to reset your password. Click below to choose a new one.</p>
       <p><a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Reset password</a></p>
       <p>This link expires in 1 hour. If you didn't request this, no action is needed.</p>`
    )
  );
}

export function sendPasswordChangedEmail(to: string) {
  return send(
    to,
    "Your SiteTracker password was changed",
    layout(
      "Password changed",
      `<p>Your password was just changed. If this wasn't you, please contact an administrator immediately.</p>`
    )
  );
}
