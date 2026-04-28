export function getAppUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (siteUrl) {
    return siteUrl;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();

  if (vercelUrl) {
    return vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
  }

  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT?.trim() || '3000';

    return `http://localhost:${port}`;
  }

  throw new Error('NEXT_PUBLIC_APP_URL is not configured');
}

export function buildAppUrl(path: string) {
  return new URL(path, getAppUrl()).toString();
}
