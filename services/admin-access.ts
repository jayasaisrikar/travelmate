const DEFAULT_ADMIN_EMAIL = 'admin@travelmate.com';

function normalizeEmail(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

export function getAdminEmail() {
  return normalizeEmail(process.env.ADMIN_EMAIL) || DEFAULT_ADMIN_EMAIL;
}

export function isAdminEmail(value: string | null | undefined) {
  return normalizeEmail(value) === getAdminEmail();
}

export function getAdminPassword() {
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (!password) {
    throw new Error('ADMIN_PASSWORD is not configured');
  }

  return password;
}

export function assertAdminCredentials(email: string, password: string) {
  if (!isAdminEmail(email) || password !== getAdminPassword()) {
    throw new Error('Invalid admin credentials');
  }

  return {
    email: getAdminEmail(),
    password: getAdminPassword(),
  };
}
