import { Resend } from 'resend';

type MailAddress = string | string[];

export interface SendEmailInput {
  to: MailAddress;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string | null;
}

function getEnvironmentValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return '';
}

function getFromAddress() {
  const from = getEnvironmentValue('EMAIL_FROM');

  if (!from) {
    throw new Error('EMAIL_FROM is not configured');
  }

  return from;
}

function getResendClient() {
  const apiKey = getEnvironmentValue('RESEND_API_KEY');

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  return new Resend(apiKey);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }

  return 'Unknown Resend error';
}

export async function sendEmail(input: SendEmailInput) {
  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    replyTo: input.replyTo ?? undefined,
  });

  if (error) {
    throw new Error(`Resend email failed: ${getErrorMessage(error)}`);
  }
}
