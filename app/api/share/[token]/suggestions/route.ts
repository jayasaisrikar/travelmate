import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/services/supabase';
import { sendEmail } from '@/services/mailer';
import { createTripSuggestion, getTripShareByToken } from '@/services/trip-sharing';

function normalizeField(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { share, error: shareError } = await getTripShareByToken(token);

    if (shareError) {
      return NextResponse.json({ error: shareError.message }, { status: 500 });
    }

    if (!share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const guestName = normalizeField(body?.guestName) || null;
    const guestEmail = normalizeField(body?.guestEmail) || null;
    const message = normalizeField(body?.message);

    if (!message) {
      return NextResponse.json({ error: 'Suggestion message is required' }, { status: 400 });
    }

    if (message.length > 1200) {
      return NextResponse.json(
        { error: 'Suggestion message must be 1200 characters or less' },
        { status: 400 }
      );
    }

    const { suggestion, error } = await createTripSuggestion({
      share,
      tripId: share.trip_id,
      guestName,
      guestEmail,
      message,
    });

    if (error || !suggestion) {
      return NextResponse.json(
        { error: error?.message || 'Failed to submit suggestion' },
        { status: 500 }
      );
    }

    const [{ data: ownerProfile }, { data: tripRecord }] = await Promise.all([
      supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', share.owner_user_id)
        .maybeSingle(),
      supabase
        .from('trips')
        .select('destination')
        .eq('id', share.trip_id)
        .maybeSingle(),
    ]);

    const destination = typeof tripRecord?.destination === 'string' ? tripRecord.destination : 'their trip';
    const ownerEmail = typeof ownerProfile?.email === 'string' ? ownerProfile.email.trim() : '';
    const guestDisplayName = guestName || 'A guest';
    const suggestionLink = new URL(`/share/${token}`, request.nextUrl.origin).toString();

    const mailTasks: Promise<unknown>[] = [];

    if (ownerEmail) {
      const escapedMessage = escapeHtml(message).replace(/\n/g, '<br />');
      const escapedDestination = escapeHtml(destination);
      const escapedGuestDisplayName = escapeHtml(guestDisplayName);
      mailTasks.push(sendEmail({
        to: ownerEmail,
        subject: `New suggestion for your ${destination} trip`,
        replyTo: guestEmail || undefined,
        text: `${guestDisplayName} left a new suggestion on your ${destination} trip.\n\nMessage:\n${message}\n\nOpen the trip share page: ${suggestionLink}`,
        html: `
          <p>${escapedGuestDisplayName} left a new suggestion on your <strong>${escapedDestination}</strong> trip.</p>
          <p><strong>Message</strong></p>
          <p>${escapedMessage}</p>
          <p><a href="${suggestionLink}">Open the trip share page</a></p>
        `.trim(),
      }));
    }

    if (guestEmail) {
      const escapedMessage = escapeHtml(message).replace(/\n/g, '<br />');
      const escapedDestination = escapeHtml(destination);
      mailTasks.push(sendEmail({
        to: guestEmail,
        subject: `Your suggestion for ${destination} was received`,
        text: `Thanks for sharing your suggestion on the ${destination} trip. The owner has been notified.\n\nYour message:\n${message}`,
        html: `
          <p>Thanks for sharing your suggestion on the <strong>${escapedDestination}</strong> trip.</p>
          <p>The owner has been notified.</p>
          <p><strong>Your message</strong></p>
          <p>${escapedMessage}</p>
        `.trim(),
      }));
    }

    if (mailTasks.length > 0) {
      const mailResults = await Promise.allSettled(mailTasks);
      for (const result of mailResults) {
        if (result.status === 'rejected') {
          console.warn('Failed to send trip suggestion email', result.reason);
        }
      }
    }

    return NextResponse.json({ success: true, suggestion }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit suggestion' },
      { status: 500 }
    );
  }
}
