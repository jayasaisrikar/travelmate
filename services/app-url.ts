export function getAppUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (siteUrl) {
    return siteUrl;
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  throw new Error('NEXT_PUBLIC_APP_URL is not configured');
}

export function buildAppUrl(path: string) {
  return new URL(path, getAppUrl()).toString();
}
