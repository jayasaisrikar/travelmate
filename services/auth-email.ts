import { buildAppUrl } from '@/services/app-url';
import { sendEmail } from '@/services/mailer';
import { supabaseAdmin } from '@/services/supabase-admin';

import { createSignupVerificationLink } from '@/services/signup-verification';

const E2E_TEST_MODE = process.env.E2E_TEST_MODE === '1';

type SignupEmailResult = {
  email: string;
  redirectTo: string;
  verificationLink?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getDisplayFrom() {
  const from = process.env.EMAIL_FROM?.trim();

  if (!from) {
    throw new Error('EMAIL_FROM is not configured');
  }

  return from;
}

function buildResetRedirectUrl() {
  return buildAppUrl('/reset-password');
}

function buildSignupTemplate(email: string, actionLink: string) {
  const safeEmail = escapeHtml(email);
  const safeLink = escapeHtml(actionLink);

  return {
    subject: 'Confirm your wayflo account',
    text:
      `Welcome to wayflo, ${email}.\n\n` +
      `Confirm your account by opening this link:\n${actionLink}\n\n` +
      `If you did not request this account, you can ignore this email.`,
    html: `
      <p>Welcome to wayflo, <strong>${safeEmail}</strong>.</p>
      <p>Confirm your account by opening this link:</p>
      <p><a href="${safeLink}">${safeLink}</a></p>
      <p>If you did not request this account, you can ignore this email.</p>
    `.trim(),
  };
}

function buildRecoveryTemplate(email: string, actionLink: string) {
  const safeEmail = escapeHtml(email);
  const safeLink = escapeHtml(actionLink);

  return {
    subject: 'Reset your wayflo password',
    text:
      `We received a password reset request for ${email}.\n\n` +
      `Reset your password here:\n${actionLink}\n\n` +
      `If you did not request this, you can ignore this email.`,
    html: `
      <p>We received a password reset request for <strong>${safeEmail}</strong>.</p>
      <p>Reset your password here:</p>
      <p><a href="${safeLink}">${safeLink}</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `.trim(),
  };
}

export async function sendSignupConfirmationEmail(input: {
  email: string;
  password: string;
}): Promise<SignupEmailResult> {
  if (E2E_TEST_MODE) {
    const verificationLink = await createSignupVerificationLink('e2e-user', input.email);

    return {
      email: input.email,
      redirectTo: buildAppUrl('/login?message=verify-email'),
      verificationLink,
    };
  }

  const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: false,
  });

  if (createUserError || !createdUser.user) {
    throw createUserError ?? new Error('Failed to create signup account');
  }

  try {
    const verificationLink = await createSignupVerificationLink(createdUser.user.id, input.email);
    const template = buildSignupTemplate(input.email, verificationLink);

    await sendEmail({
      to: input.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
      replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
    });
  } catch (error) {
    await Promise.allSettled([
      supabaseAdmin.from('signup_verification_tokens').delete().eq('email', input.email),
      supabaseAdmin.auth.admin.deleteUser(createdUser.user.id),
    ]);

    throw error;
  }

  return {
    email: input.email,
    redirectTo: buildAppUrl('/login?message=verify-email'),
    verificationLink: null,
  };
}

export async function sendPasswordResetEmail(input: { email: string }) {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: input.email,
    options: {
      redirectTo: buildResetRedirectUrl(),
    },
  });

  if (error || !data) {
    throw error ?? new Error('Failed to generate recovery email link');
  }

  const actionLink = data.properties.action_link;
  const template = buildRecoveryTemplate(input.email, actionLink);

  await sendEmail({
    to: input.email,
    subject: template.subject,
    text: template.text,
    html: template.html,
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
  });

  return {
    email: input.email,
    redirectTo: data.properties.redirect_to,
  };
}
