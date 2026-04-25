import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED_HOSTS = new Set([
  'upload.wikimedia.org',
  'commons.wikimedia.org',
  'en.wikipedia.org',
]);

function isAllowedImageUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== 'https:') {
      return false;
    }

    return ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url || !isAllowedImageUrl(url)) {
    return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'image/*',
      },
    });

    if (!response.ok || !response.body) {
      return NextResponse.json({ error: 'Failed to load image' }, { status: 502 });
    }

    const headers = new Headers();
    const contentType = response.headers.get('content-type');

    headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    headers.set('Content-Type', contentType || 'image/jpeg');

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load image' },
      { status: 502 }
    );
  }
}
