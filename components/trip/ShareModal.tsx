'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, MessageSquareShare } from 'lucide-react';
import { createTripShare } from '@/lib/supabase-trips';
import { BadgeGlobeCanvas, createBadgeGifFile } from '@/components/trip/BadgeGlobe';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

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
  const [error, setError] = useState('');
  const toast = useToast();

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
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard.');
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error('Could not copy the link.');
    }
  };

  const shareBadgeGif = async () => {
    if (!shareUrl || gifLoading) return;

    setGifLoading(true);
    setError('');

    try {
      const file = await createBadgeGifFile({ destination, shareText, shareUrl });

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
        toast.success('Animated GIF ready to share.');
        return;
      }

      downloadFile(file);
      toast.success('Animated GIF downloaded.');
    } catch (err: unknown) {
      const messageText = err instanceof Error ? err.message : 'Failed to create animated badge';
      setError(messageText);
      toast.error(messageText);
    } finally {
      setGifLoading(false);
    }
  };

  const isLinkReady = !loading && !shareLoading && !!shareUrl;
  const whatsappHref = shareUrl
    ? `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`
    : undefined;

  const disabledActionClass =
    'pointer-events-none cursor-not-allowed opacity-50';

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      className="max-w-[540px]"
      title={destination ? `Share your ${destination} trip` : 'Invite people to your trip'}
      description="Share a public link so friends can view the trip and send suggestions."
    >
      <div className="space-y-4">
        {/* ── Badge preview card ── */}
        <div className="overflow-hidden rounded-2xl border border-[#DDDCE8] bg-white">
          <div className="relative h-48 overflow-hidden bg-[#091a2e] sm:h-52">
            <div className="absolute right-[-48px] top-1/2 h-[300px] w-[300px] -translate-y-1/2 sm:right-[-36px]">
              <BadgeGlobeCanvas className="h-full w-full" />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#091a2e] via-[#091a2e]/75 to-transparent" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />
            <div className="relative z-10 flex h-full flex-col justify-between p-5">
              <div className="flex items-center justify-between">
                <div />
                <BadgeBrand />
              </div>
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
          <div className="flex items-center gap-3 border-t border-[#DDDCE8] bg-[#FBFAFF] px-4 py-3">
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
              <span className="shrink-0 rounded-md border border-[#3fa55d]/30 bg-[#edfaf2] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#3fa55d]">
                Ready
              </span>
            )}
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-[#C14D72] bg-[#FFF0F4] px-4 py-2.5 text-xs font-medium text-[#C14D72]">
            ✕ {error}
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={copyLink}
            disabled={!isLinkReady}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#DDDCE8] bg-white px-3 py-3 text-xs font-semibold text-[#3F3D56] transition hover:bg-[#FBFAFF] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          >
            {copied ? <Check size={15} className="text-[#3fa55d]" /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>

          <button
            type="button"
            onClick={shareBadgeGif}
            disabled={!isLinkReady || gifLoading}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#3F3D56] bg-[#3F3D56] px-3 py-3 text-xs font-semibold text-white transition hover:bg-[#302F43] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          >
            <MessageSquareShare size={15} />
            {gifLoading ? 'Preparing…' : 'Share GIF'}
          </button>

          {/* Real anchor — navigates to WhatsApp, announced as a link (H-11). */}
          <a
            href={whatsappHref ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!isLinkReady}
            onClick={e => { if (!isLinkReady) e.preventDefault(); }}
            className={`col-span-2 flex items-center justify-center gap-2 rounded-xl border border-[#3F3D56] bg-[#FF6584] px-3 py-3 text-xs font-semibold text-white transition hover:bg-[#FF7B97] sm:text-sm ${!isLinkReady ? disabledActionClass : ''}`}
          >
            <ExternalLink size={15} />
            Share to WhatsApp
          </a>
        </div>
      </div>
    </Modal>
  );
}
