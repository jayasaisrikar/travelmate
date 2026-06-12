'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, ExternalLink, MessageSquareShare, X } from 'lucide-react';
import { createTripShare } from '@/lib/supabase-trips';
import { createBoardingPassFile } from '@/components/trip/BoardingPassCard';

type ShareModalProps = {
  tripId: string;
  destination: string;
  shareUrl?: string;
  shareToken?: string;
  shareLoading?: boolean;
  isOpen: boolean;
  onClose: () => void;
};

const SHARE_BADGE_TEXT = 'Check out my trip on wayflo and send your suggestions.';

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ShareModal({
  tripId,
  destination,
  shareUrl: initialShareUrl = '',
  shareLoading = false,
  isOpen,
  onClose,
}: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState(initialShareUrl);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [passSharing, setPassSharing] = useState(false);
  const [passUrl, setPassUrl] = useState('');
  const [passFile, setPassFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  const shareText = useMemo(
    () => `${SHARE_BADGE_TEXT} ${destination ? `I'm planning ${destination} with wayflo.` : ''}`.trim(),
    [destination]
  );

  useEffect(() => {
    if (initialShareUrl) setShareUrl(initialShareUrl);
  }, [initialShareUrl]);

  useEffect(() => {
    if (!isOpen || shareUrl || loading) return;

    let mounted = true;

    const loadShare = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await createTripShare(tripId);
        if (!mounted) return;
        setShareUrl(data.shareUrl);
      } catch (err: unknown) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to create share link');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadShare();
    return () => { mounted = false; };
  }, [isOpen, loading, shareUrl, tripId]);

  // Render the boarding-pass image once the public link exists.
  useEffect(() => {
    if (!isOpen || !shareUrl) return;

    let active = true;
    let objectUrl = '';

    createBoardingPassFile({ destination, shareText, shareUrl })
      .then(file => {
        if (!active) return;
        objectUrl = URL.createObjectURL(file);
        setPassFile(file);
        setPassUrl(objectUrl);
      })
      .catch(() => {
        /* preview is best-effort; sharing still works via link */
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, shareUrl, destination, shareText]);

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const shareBoardingPass = async () => {
    if (!shareUrl || passSharing) return;

    setPassSharing(true);
    setStatusMessage('');
    setError('');

    try {
      const file =
        passFile ?? (await createBoardingPassFile({ destination, shareText, shareUrl }));

      const canShareFiles =
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] });

      if (navigator.share && canShareFiles) {
        await navigator.share({
          title: `wayflo trip: ${destination}`,
          text: shareText,
          url: shareUrl,
          files: [file],
        });
        setStatusMessage('Boarding pass ready to share.');
        return;
      }

      downloadFile(file);
      setStatusMessage('Boarding pass downloaded.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create boarding pass');
    } finally {
      setPassSharing(false);
      window.setTimeout(() => setStatusMessage(''), 2400);
    }
  };

  const shareWhatsApp = () => {
    if (!shareUrl) return;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  if (!isOpen) return null;

  const isLinkReady = !loading && !shareLoading && !!shareUrl;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: 28, scale: 0.97, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 28, scale: 0.97, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
          className="flex w-full max-w-[540px] flex-col border border-[#3a2540] bg-white shadow-[0_40px_120px_rgba(46,40,51,0.32)]"
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-4 border-b border-[#3a2540] px-5 py-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#9b8b92]">Share trip</div>
              <h3 className="mt-0.5 text-xl font-black tracking-tight text-[#3a2540]">
                {destination ? `Share your ${destination} trip` : 'Invite people to your trip'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 border border-[#3a2540] bg-white p-2 text-[#3a2540] transition hover:bg-[#F7F6FF]"
              aria-label="Close share modal"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4 p-5">
            {/* ── Boarding-pass preview card ── */}
            <div className="overflow-hidden rounded-2xl border border-[#eaddc7] bg-[#fbf2e6]">
              {/* Hero — generated boarding pass */}
              <div className="relative flex aspect-[1000/420] items-center justify-center overflow-hidden p-4">
                {passUrl ? (
                  <motion.img
                    key={passUrl}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    src={passUrl}
                    alt={destination ? `Boarding pass for ${destination}` : 'Trip boarding pass'}
                    className="h-full w-full object-contain drop-shadow-[0_18px_40px_rgba(58,37,64,0.22)]"
                  />
                ) : (
                  <div className="flex w-full max-w-[460px] animate-pulse flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#eaddc7]">
                    <div className="h-3 w-24 rounded-full bg-[#f0e2d0]" />
                    <div className="h-9 w-40 rounded-md bg-[#f0e2d0]" />
                    <div className="mt-2 h-6 w-full rounded-md bg-[#f0e2d0]" />
                    <div className="h-3 w-32 rounded-full bg-[#f0e2d0]" />
                  </div>
                )}
              </div>

              {/* URL bar */}
              <div className="flex items-center gap-3 border-t border-[#eaddc7] bg-white px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#9b8b92]">Public link</div>
                  <div className="mt-0.5 truncate text-xs font-semibold text-[#3a2540]">
                    {loading || shareLoading ? (
                      <span className="text-[#9b8b92]">Generating link…</span>
                    ) : shareUrl ? (
                      shareUrl
                    ) : (
                      <span className="text-[#9b8b92]">Link not available</span>
                    )}
                  </div>
                </div>
                {isLinkReady && (
                  <span className="shrink-0 border border-[#3fa55d]/30 bg-[#edfaf2] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#3fa55d]">
                    Ready
                  </span>
                )}
              </div>
            </div>

            {/* ── Error banner ── */}
            {error && (
              <div className="border border-[#be123c] bg-[#ffe4e6] px-4 py-2.5 text-xs font-medium text-[#be123c]">
                {error}
              </div>
            )}

            {/* ── Action buttons ── */}
            {statusMessage && (
              <div className="border border-[#ea580c] bg-[#ffedd5] px-4 py-2.5 text-xs font-medium text-[#3a2540]">
                {statusMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={copyLink}
                disabled={!shareUrl}
                className="flex items-center justify-center gap-2 border border-[#3a2540] bg-white px-4 py-3 text-sm font-semibold text-[#3a2540] transition hover:bg-[#fffbf2] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied
                  ? <Check size={15} className="text-[#3fa55d]" />
                  : <Copy size={15} />}
                {copied ? 'Copied!' : 'Copy link'}
              </button>

              <button
                type="button"
                onClick={shareBoardingPass}
                disabled={!shareUrl}
                className="flex items-center justify-center gap-2 border border-[#3a2540] bg-[#3a2540] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2c1b33] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MessageSquareShare size={15} />
                {passSharing ? 'Preparing pass…' : 'Share pass'}
              </button>

              <button
                type="button"
                onClick={shareWhatsApp}
                disabled={!shareUrl}
                className="col-span-2 flex items-center justify-center gap-2 border border-[#3a2540] bg-[#f43f5e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#FF7B97] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ExternalLink size={15} />
                Share to WhatsApp
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
