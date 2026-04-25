import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PublicTripShare } from '@/components/trip/PublicTripShare';
import { supabase } from '@/services/supabase';
import {
  buildPublicShareUrl,
  buildSharePreview,
  countTripSuggestionsByShareId,
  getTripShareByToken,
  type TripRow,
} from '@/services/trip-sharing';

export const dynamic = 'force-dynamic';

function getPublicBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return 'http://localhost:3000';
}

async function loadSharePage(token: string) {
  const { share, error: shareError } = await getTripShareByToken(token);

  if (shareError || !share) {
    return null;
  }

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('id', share.trip_id)
    .maybeSingle();

  if (tripError || !trip) {
    return null;
  }

  const { count } = await countTripSuggestionsByShareId(share.id);
  const preview = share.share_title && share.share_description
    ? {
        title: share.share_title,
        description: share.share_description,
      }
    : await buildSharePreview(trip as TripRow);

  return {
    share,
    trip: trip as TripRow,
    suggestionsCount: count ?? 0,
    preview,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const data = await loadSharePage(token);

  if (!data) {
    return {
      title: 'Shared trip not found | wayflo',
      description: 'This shared trip link is unavailable or has been removed.',
    };
  }

  const shareUrl = buildPublicShareUrl(getPublicBaseUrl(), data.share.token);

  return {
    title: data.preview.title,
    description: data.preview.description,
    openGraph: {
      title: data.preview.title,
      description: data.preview.description,
      url: shareUrl,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: data.preview.title,
      description: data.preview.description,
    },
  };
}

export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await loadSharePage(token);

  if (!data) {
    notFound();
  }

  const shareUrl = buildPublicShareUrl(getPublicBaseUrl(), data.share.token);

  return (
    <PublicTripShare
      shareToken={data.share.token}
      shareUrl={shareUrl}
      shareBadge="Check out my trip on wayflo and send your suggestions."
      shareTitle={data.preview.title}
      shareDescription={data.preview.description}
      suggestionsCount={data.suggestionsCount}
      trip={data.trip}
    />
  );
}
