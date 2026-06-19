'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { createTripRoom, type TripRoom } from '@/services/social';
import { isVerificationRequiredError } from '@/hooks/useVerificationGate';

interface CreateOpenTripModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (room: TripRoom) => void;
  onNeedsVerification: () => void;
}

export function CreateOpenTripModal({ open, onClose, onCreated, onNeedsVerification }: CreateOpenTripModalProps) {
  const [destination, setDestination] = useState('');
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [destinationError, setDestinationError] = useState('');

  if (!open) return null;

  function reset() {
    setDestination('');
    setTitle('');
    setError('');
    setDestinationError('');
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  async function handleSubmit() {
    const trimmedDestination = destination.trim();
    if (!trimmedDestination) {
      setDestinationError('Destination is required');
      return;
    }
    setDestinationError('');
    setError('');
    setSubmitting(true);
    try {
      const room = await createTripRoom({
        destination: trimmedDestination,
        title: title.trim() || undefined,
      });
      onCreated(room);
      reset();
      onClose();
    } catch (e) {
      if (isVerificationRequiredError(e)) {
        onNeedsVerification();
        reset();
        onClose();
        return;
      }
      setError(e instanceof Error ? e.message : 'Could not create trip');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="create-open-trip-title">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <h2 id="create-open-trip-title" className="text-lg font-semibold text-[#3F3D56]">
            Create an Open Trip
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 text-sm leading-6 text-[#6F6C82]">
          Open Trips are public — anyone can discover and join. Give it a destination and an optional title.
        </p>

        <label htmlFor="open-trip-destination" className="mt-4 block text-sm font-medium text-[#53506A]">
          Destination
        </label>
        <input
          id="open-trip-destination"
          value={destination}
          onChange={(e) => {
            setDestination(e.target.value);
            if (destinationError) setDestinationError('');
          }}
          placeholder="e.g. Mumbai"
          disabled={submitting}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-[#3F3D56] disabled:opacity-60"
        />
        {destinationError && <p className="mt-1.5 text-xs font-semibold text-[#C14D72]">{destinationError}</p>}

        <label htmlFor="open-trip-title" className="mt-4 block text-sm font-medium text-[#53506A]">
          Title (optional)
        </label>
        <input
          id="open-trip-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Weekend in Mumbai"
          disabled={submitting}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-[#3F3D56] disabled:opacity-60"
        />

        {error && <p className="mt-3 text-sm font-semibold text-[#C14D72]">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#6F6C82] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-xl bg-[#6C63FF] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create Open Trip'}
          </button>
        </div>
      </div>
    </div>
  );
}
