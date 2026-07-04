import { sendEmail } from '@/services/mailer';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildWaitlistTemplate(email: string) {
  const safeEmail = escapeHtml(email);

  return {
    subject: "You're on the Wayflo waiting list 🎉",
    text:
      `You're on the list!\n\n` +
      `Thanks for joining the Wayflo waiting list, ${email}. ` +
      `We're putting the finishing touches on the new flow and we'll email you the moment you can start planning.\n\n` +
      `See you soon,\nThe Wayflo team`,
    html: `
      <div style="margin:0;padding:24px 16px;background:#F6F5FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <div style="max-width:560px;margin:0 auto;background:linear-gradient(135deg,#EEEDFE 0%,#FFFFFF 52%,#FFE9EF 100%);border:1px solid #D8D4F2;border-radius:28px;overflow:hidden;box-shadow:0 24px 80px rgba(108,99,255,0.12);">
          <div style="padding:36px 36px 8px;">
            <div style="font-size:11px;font-weight:600;letter-spacing:0.24em;text-transform:uppercase;color:#FF6584;">
              Coming soon
            </div>
            <h1 style="margin:14px 0 0;font-size:28px;font-weight:300;letter-spacing:-0.02em;color:#3F3D56;">
              You're on the list! 🎉
            </h1>
          </div>
          <div style="padding:16px 36px 36px;">
            <p style="font-size:15px;line-height:1.8;margin:0 0 16px;color:#6F6C82;">
              Thanks for joining the Wayflo waiting list, <strong style="color:#3F3D56;">${safeEmail}</strong>.
            </p>
            <p style="font-size:15px;line-height:1.8;margin:0 0 24px;color:#6F6C82;">
              We're putting the finishing touches on the new flow and we'll email you the
              moment you can start planning.
            </p>
            <p style="font-size:15px;line-height:1.6;margin:0;color:#6F6C82;">
              See you soon,<br/><span style="color:#3F3D56;font-weight:600;">The Wayflo team</span>
            </p>
          </div>
        </div>
      </div>
    `.trim(),
  };
}

export async function sendWaitlistConfirmationEmail(input: { email: string }) {
  const template = buildWaitlistTemplate(input.email);

  await sendEmail({
    to: input.email,
    subject: template.subject,
    text: template.text,
    html: template.html,
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
  });

  return { email: input.email };
}
