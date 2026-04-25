import { NextResponse } from 'next/server';
import { lookupDestinationPhotoUrl } from '@/services/place-photo';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim();

  if (!query) {
    return NextResponse.json({ imageUrl: null }, { status: 200 });
  }
  const imageUrl = await lookupDestinationPhotoUrl(query);

  return NextResponse.json(
    { imageUrl },
    {
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    }
  );
}
