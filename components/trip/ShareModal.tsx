'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, ExternalLink, MessageSquareShare, X } from 'lucide-react';
import { createTripShare } from '@/lib/supabase-trips';
import { BadgeGlobeCanvas, createBadgeGifFile } from '@/components/trip/BadgeGlobe';

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

function BadgeBrand() {
  return (
    <div className="inline-flex items-center rounded-2xl border border-white/14 bg-[#091a2e]/80 px-3 py-2 shadow-[0_12px_28px_rgba(8,15,31,0.18)] backdrop-blur-sm">
      <div className="min-w-0 leading-none">
        <div className="text-[13px] font-semibold tracking-[-0.03em] text-white">
          way<span className="text-[#FF6584]">flo</span>
        </div>
      </div>
    </div>
  );
}

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
  const [gifLoading, setGifLoading] = useState(false);
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

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const shareBadgeGif = async () => {
    if (!shareUrl || gifLoading) return;

    setGifLoading(true);
    setStatusMessage('');
    setError('');

    try {
      const file = await createBadgeGifFile({
        destination,
        shareText,
        shareUrl,
      });

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
        setStatusMessage('Animated GIF ready to share.');
        return;
      }

      downloadFile(file);
      setStatusMessage('Animated GIF downloaded.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create animated badge');
    } finally {
      setGifLoading(false);
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
          className="flex w-full max-w-[540px] flex-col border border-[#3F3D56] bg-white shadow-[0_40px_120px_rgba(46,40,51,0.32)]"
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-4 border-b border-[#3F3D56] px-5 py-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#8A869C]">Share trip</div>
              <h3 className="mt-0.5 text-xl font-black tracking-tight text-[#3F3D56]">
                {destination ? `Share your ${destination} trip` : 'Invite people to your trip'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 border border-[#3F3D56] bg-white p-2 text-[#3F3D56] transition hover:bg-[#F7F6FF]"
              aria-label="Close share modal"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4 p-5">
            {/* ── Badge preview card ── */}
            <div className="overflow-hidden border border-[#3F3D56] bg-white">
              {/* Hero — globe background */}
              <div className="relative h-48 overflow-hidden bg-[#091a2e] sm:h-52">
                {/* Globe */}
                <div className="absolute right-[-48px] top-1/2 h-[300px] w-[300px] -translate-y-1/2 sm:right-[-36px]">
                  <BadgeGlobeCanvas className="h-full w-full" />
                </div>

                {/* Left-to-right fade so text stays readable */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#091a2e] via-[#091a2e]/75 to-transparent" />
                {/* Subtle top vignette */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />

                {/* Content overlay */}
                <div className="relative z-10 flex h-full flex-col justify-between p-5">
                  {/* Brand logo + title top-right */}
                  <div className="flex items-center justify-between">
                    <div />
                    <BadgeBrand />
                  </div>

                  {/* Text */}
                  <div>
                    {destination && (
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#FF6584]">
                        {destination}
                      </div>
                    )}
                    <p className="max-w-[58%] text-[15px] font-black leading-snug text-white">
                      {SHARE_BADGE_TEXT}
                    </p>
                  </div>
                </div>
              </div>

              {/* URL bar */}
              <div className="flex items-center gap-3 border-t border-[#3F3D56] bg-[#FBFAFF] px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#8A869C]">Public link</div>
                  <div className="mt-0.5 truncate text-xs font-semibold text-[#3F3D56]">
                    {loading || shareLoading ? (
                      <span className="text-[#8A869C]">Generating link…</span>
                    ) : shareUrl ? (
                      shareUrl
                    ) : (
                      <span className="text-[#8A869C]">Link not available</span>
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
              <div className="border border-[#C14D72] bg-[#FFF0F4] px-4 py-2.5 text-xs font-medium text-[#C14D72]">
                {error}
              </div>
            )}

            {/* ── Action buttons ── */}
            {statusMessage && (
              <div className="border border-[#6C63FF] bg-[#EEEDFE] px-4 py-2.5 text-xs font-medium text-[#3F3D56]">
                {statusMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={copyLink}
                disabled={!shareUrl}
                className="flex items-center justify-center gap-2 border border-[#3F3D56] bg-white px-4 py-3 text-sm font-semibold text-[#3F3D56] transition hover:bg-[#FBFAFF] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied
                  ? <Check size={15} className="text-[#3fa55d]" />
                  : <Copy size={15} />}
                {copied ? 'Copied!' : 'Copy link'}
              </button>

              <button
                type="button"
                onClick={shareBadgeGif}
                disabled={!shareUrl}
                className="flex items-center justify-center gap-2 border border-[#3F3D56] bg-[#3F3D56] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#302F43] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MessageSquareShare size={15} />
                {gifLoading ? 'Preparing GIF...' : 'Share GIF'}
              </button>

              <button
                type="button"
                onClick={shareWhatsApp}
                disabled={!shareUrl}
                className="col-span-2 flex items-center justify-center gap-2 border border-[#3F3D56] bg-[#FF6584] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#FF7B97] disabled:cursor-not-allowed disabled:opacity-50"
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
