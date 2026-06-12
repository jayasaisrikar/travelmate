'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

import { importBookingConfirmation, parseBookingConfirmation } from '@/lib/supabase-trips';
import type { BookingConfirmationExtraction } from '@/lib/travel-types';

function listSummary(items: Array<string | null | undefined>, emptyLabel = 'Not provided') {
  const filtered = items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return filtered.length > 0 ? filtered.join(' · ') : emptyLabel;
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#3a2540] bg-[#fffbf2] px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9b8b92]">{label}</div>
      <div className="mt-1 text-sm font-medium leading-6 text-[#3a2540]">{value}</div>
    </div>
  );
}

function ConfirmationPreview({ confirmation }: { confirmation: BookingConfirmationExtraction }) {
  const firstFlight = confirmation.flightSegments[0];
  const firstReservation = confirmation.reservations[0];
  const firstTransport = confirmation.transportLegs[0];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <PreviewRow
        label="Destination"
        value={listSummary([confirmation.destinationName, confirmation.destinationAddress], confirmation.destinationName)}
      />
      <PreviewRow
        label="Trip window"
        value={listSummary(
          [
            confirmation.tripWindow.arrivalDate,
            confirmation.tripWindow.departureDate,
            confirmation.tripWindow.arrivalTime ? `Arrive ${confirmation.tripWindow.arrivalTime}` : null,
            confirmation.tripWindow.departureTime ? `Depart ${confirmation.tripWindow.departureTime}` : null,
          ],
          'Not provided'
        )}
      />
      <PreviewRow
        label="Arrival"
        value={listSummary(
          [
            confirmation.arrivalMethod,
            firstFlight ? [firstFlight.airline, firstFlight.flightNumber].filter(Boolean).join(' ') : null,
            firstTransport ? [firstTransport.kind, firstTransport.provider].filter(Boolean).join(' ') : null,
          ],
          'Not provided'
        )}
      />
      <PreviewRow
        label="Stay"
        value={listSummary(
          [confirmation.stay?.name, confirmation.stay?.address, confirmation.stay?.confirmationCode],
          'Not provided'
        )}
      />
      <PreviewRow
        label="Reservations"
        value={countLabel(confirmation.reservations.length, 'reservation')}
      />
      <PreviewRow
        label="Confidence"
        value={confirmation.confidence}
      />

      {firstFlight && (
        <div className="sm:col-span-2 border border-[#3a2540] bg-[#ffedd5] px-4 py-3 text-sm leading-6 text-[#3a2540]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ea580c]">Flight</div>
          {listSummary(
            [
              firstFlight.airline,
              firstFlight.flightNumber,
              [firstFlight.departurePlace, firstFlight.arrivalPlace].filter(Boolean).join(' -> '),
              [firstFlight.departureDate, firstFlight.departureTime, firstFlight.arrivalDate, firstFlight.arrivalTime]
                .filter(Boolean)
                .join(' '),
            ],
            'No flight details captured'
          )}
        </div>
      )}

      {firstReservation && (
        <div className="sm:col-span-2 border border-[#3a2540] bg-[#fffbf2] px-4 py-3 text-sm leading-6 text-[#3a2540]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9b8b92]">Reservation</div>
          {listSummary(
            [
              firstReservation.kind,
              firstReservation.vendor,
              firstReservation.confirmationCode ? `Confirmation ${firstReservation.confirmationCode}` : null,
              firstReservation.date,
            ],
            'No reservation details captured'
          )}
        </div>
      )}

      <div className="sm:col-span-2 border border-dashed border-[#eaddc7] bg-[#fffbf2] px-4 py-3 text-sm leading-6 text-[#7c6a72]">
        {confirmation.summary}
      </div>
    </div>
  );
}

export function BookingConfirmationImportCard() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [from, setFrom] = useState('');
  const [text, setText] = useState('');
  const [receivedAt, setReceivedAt] = useState('');
  const [parsedConfirmation, setParsedConfirmation] = useState<BookingConfirmationExtraction | null>(null);
  const [parseError, setParseError] = useState('');
  const [importError, setImportError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const canParse = useMemo(() => text.trim().length > 0 || subject.trim().length > 0 || from.trim().length > 0, [
    from,
    subject,
    text,
  ]);

  const handleParse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setParseError('');
    setImportError('');
    setStatus('');

    try {
      const parsed = await parseBookingConfirmation({
        subject: subject.trim() || undefined,
        from: from.trim() || undefined,
        text: text.trim() || undefined,
        receivedAt: receivedAt.trim() || undefined,
      });

      setParsedConfirmation(parsed);
      setStatus('Confirmation parsed. Review the preview and create the trip when ready.');
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse the confirmation');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!parsedConfirmation) {
      setImportError('Parse a confirmation before importing it.');
      return;
    }

    setLoading(true);
    setImportError('');
    setStatus('');

    try {
      const result = await importBookingConfirmation({
        subject: subject.trim() || undefined,
        from: from.trim() || undefined,
        text: text.trim() || undefined,
        receivedAt: receivedAt.trim() || undefined,
        parsedConfirmation,
      });

      setStatus('Trip created from the booking confirmation.');
      router.push(`/trip/${result.trip.id}`);
      router.refresh();
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-[#3a2540] bg-white p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6"
    >
      <div className="flex flex-col gap-3 border-b border-[#3a2540] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 border border-[#3a2540] bg-[#f43f5e] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#3a2540]">
            <Sparkles size={14} />
            Booking import
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight">Create a trip from a confirmation email</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7c6a72]">
            Paste a booking confirmation and we’ll extract the destination, dates, stay, flight, and transfer details before creating the trip.
          </p>
        </div>

        <div className="text-sm font-medium text-[#7c6a72]">
          {parsedConfirmation ? 'Parsed and ready' : 'Paste email text to begin'}
        </div>
      </div>

      <form className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]" onSubmit={handleParse}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#7c6a72]">
                Subject
              </label>
              <input
                value={subject}
                onChange={event => setSubject(event.target.value)}
                placeholder="Your booking confirmation"
                className="w-full border border-[#3a2540] bg-[#fffbf2] px-4 py-3 text-base text-[#3a2540] outline-none placeholder:text-[#9b8b92] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#7c6a72]">
                From
              </label>
              <input
                value={from}
                onChange={event => setFrom(event.target.value)}
                placeholder="noreply@airline.com"
                className="w-full border border-[#3a2540] bg-[#fffbf2] px-4 py-3 text-base text-[#3a2540] outline-none placeholder:text-[#9b8b92] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#7c6a72]">
              Email body
            </label>
            <textarea
              value={text}
              onChange={event => setText(event.target.value)}
              rows={12}
              placeholder="Paste the full confirmation email here"
              className="w-full resize-y border border-[#3a2540] bg-[#fffbf2] px-4 py-3 text-base leading-7 text-[#3a2540] outline-none placeholder:text-[#9b8b92] focus:bg-white"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={loading || !canParse}
              className="inline-flex items-center justify-center gap-2 border border-[#3a2540] bg-[#3a2540] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2c1b33] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Parse confirmation
            </button>

            <button
              type="button"
              onClick={handleImport}
              disabled={loading || !parsedConfirmation}
              className="border border-[#3a2540] bg-white px-4 py-3 text-sm font-semibold text-[#3a2540] transition hover:bg-[#fffbf2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create trip from parsed data
            </button>
          </div>

          {status && (
            <div className="border border-[#ea580c] bg-[#ffedd5] px-4 py-3 text-sm font-medium text-[#3a2540]">
              {status}
            </div>
          )}

          {parseError && (
            <div className="border border-[#be123c] bg-[#ffe4e6] px-4 py-3 text-sm font-medium text-[#be123c]">
              {parseError}
            </div>
          )}

          {importError && (
            <div className="border border-[#be123c] bg-[#ffe4e6] px-4 py-3 text-sm font-medium text-[#be123c]">
              {importError}
            </div>
          )}
        </div>

        <div className="border border-[#eaddc7] bg-[#fffbf2] p-4">
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#9b8b92]">Preview</div>
          <div className="mt-3">
            {parsedConfirmation ? (
              <ConfirmationPreview confirmation={parsedConfirmation} />
            ) : (
              <div className="rounded-[22px] border border-dashed border-[#eaddc7] bg-white px-4 py-6 text-sm leading-6 text-[#7c6a72]">
                Your extracted destination, dates, stay, and reservation details will appear here after parsing.
              </div>
            )}
          </div>
        </div>
      </form>
    </motion.section>
  );
}
