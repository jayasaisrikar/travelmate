'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, ExternalLink, MessageSquareShare, X } from 'lucide-react';
import { createTripShare } from '@/lib/supabase-trips';
import { Brand } from '@/components/common/Brand';

type ShareModalProps = {
  tripId: string;
  destination: string;
  shareUrl?: string;
  shareToken?: string;
  shareLoading?: boolean;
  isOpen: boolean;
  onClose: () => void;
};

const SHARE_BADGE_TEXT = 'Check out my trip and submit your suggestions on TravelMate.';

function TravelGlobe() {
  return (
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full drop-shadow-2xl">
      <defs>
        <radialGradient id="sg-ocean" cx="34%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#c2e8f8" />
          <stop offset="22%" stopColor="#60b8e0" />
          <stop offset="52%" stopColor="#1e75b0" />
          <stop offset="100%" stopColor="#083858" />
        </radialGradient>
        <radialGradient id="sg-shine" cx="30%" cy="22%" r="52%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0.07)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id="sg-rim" cx="50%" cy="50%" r="50%">
          <stop offset="85%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.18)" />
        </radialGradient>
        <clipPath id="sg-clip">
          <circle cx="120" cy="120" r="117" />
        </clipPath>
      </defs>

      {/* Ocean base */}
      <circle cx="120" cy="120" r="117" fill="url(#sg-ocean)" />

      {/* Latitude & longitude grid */}
      <g clipPath="url(#sg-clip)" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.75">
        {/* Equator */}
        <line x1="3" y1="120" x2="237" y2="120" />
        {/* Latitude parallels */}
        <ellipse cx="120" cy="88"  rx="102" ry="19" />
        <ellipse cx="120" cy="56"  rx="70"  ry="12" />
        <ellipse cx="120" cy="24"  rx="28"  ry="5"  />
        <ellipse cx="120" cy="152" rx="102" ry="19" />
        <ellipse cx="120" cy="184" rx="70"  ry="12" />
        <ellipse cx="120" cy="216" rx="28"  ry="5"  />
        {/* Longitude meridians */}
        <ellipse cx="120" cy="120" rx="38"  ry="117" />
        <ellipse cx="120" cy="120" rx="74"  ry="117" />
        <ellipse cx="120" cy="120" rx="101" ry="117" />
      </g>

      {/* Continents */}
      <g clipPath="url(#sg-clip)">
        {/* North America */}
        <path
          fill="rgba(52,158,74,0.86)"
          d="M38 70 C44 58 60 50 78 54 C92 57 102 67 106 79 C110 89 107 101 101 110
             C94 120 83 126 71 128 C59 130 48 124 41 114 C34 104 32 92 36 81 Z"
        />
        {/* Central America tail */}
        <path fill="rgba(46,140,65,0.76)" d="M68 130 C73 124 80 126 84 133 C87 139 85 148 80 154 C74 160 65 161 60 156 C55 150 55 141 59 136 Z" />
        {/* Europe */}
        <path
          fill="rgba(66,168,84,0.84)"
          d="M130 58 C138 50 152 48 161 54 C169 59 172 69 169 78 C166 86 157 92 148 93
             C139 94 131 88 128 80 C125 72 126 63 130 58 Z"
        />
        {/* Africa */}
        <path
          fill="rgba(78,172,90,0.82)"
          d="M134 100 C142 93 155 94 162 103 C169 111 168 124 162 133
             C155 142 143 145 135 139 C127 133 125 120 127 110 C129 104 131 101 134 100 Z"
        />
        {/* Asia */}
        <path
          fill="rgba(62,162,80,0.84)"
          d="M162 50 C174 41 194 39 207 46 C218 52 223 64 220 75
             C217 85 207 93 195 95 C183 97 170 91 163 81 C157 73 156 60 162 50 Z"
        />
        {/* Australia */}
        <path
          fill="rgba(72,162,86,0.80)"
          d="M192 150 C201 143 215 144 222 152 C229 159 229 171 223 179
             C217 187 204 189 195 184 C186 179 183 167 186 158 C187 153 189 151 192 150 Z"
        />
      </g>

      {/* Specular shine */}
      <circle cx="120" cy="120" r="117" fill="url(#sg-shine)" />
      {/* Rim light */}
      <circle cx="120" cy="120" r="117" fill="url(#sg-rim)" />
      {/* Outer border */}
      <circle cx="120" cy="120" r="117" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
    </svg>
  );
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ${src}`));
    image.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function formatBadgeUrl(shareUrl: string) {
  if (shareUrl.length <= 78) {
    return shareUrl;
  }

  const parsed = new URL(shareUrl);
  const token = parsed.pathname.split('/').filter(Boolean).pop() || '';
  return `${parsed.origin}/share/${token}`;
}

async function createBadgeFile({
  destination,
  shareText,
  shareUrl,
}: {
  destination: string;
  shareText: string;
  shareUrl: string;
}) {
  const width = 1200;
  const height = 630;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas is unavailable in this browser.');
  }

  const [logo, title] = await Promise.all([loadImage('/images/logo.png'), loadImage('/images/title.png')]);
  const badgeUrl = formatBadgeUrl(shareUrl);

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#d9e7ef');
  bg.addColorStop(0.46, '#bfd2dd');
  bg.addColorStop(1, '#96adbc');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const topGlow = ctx.createRadialGradient(610, 140, 20, 610, 140, 540);
  topGlow.addColorStop(0, 'rgba(255,255,255,0.55)');
  topGlow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#f6d23c';
  ctx.fillRect(0, 0, 96, 96);
  ctx.fillStyle = '#fff1fb';
  ctx.fillRect(0, 96, 76, 84);
  ctx.fillStyle = '#f8e7f1';
  ctx.fillRect(76, 96, 112, 84);

  ctx.fillStyle = '#8da7b8';
  ctx.fillRect(0, 540, width, 90);

  // Globe
  const globeX = 870;
  const globeY = 340;
  const globeRadius = 210;
  ctx.save();
  ctx.beginPath();
  ctx.arc(globeX, globeY, globeRadius, 0, Math.PI * 2);
  ctx.clip();

  const globe = ctx.createRadialGradient(globeX - 55, globeY - 65, 16, globeX, globeY, globeRadius + 8);
  globe.addColorStop(0, '#d9eef8');
  globe.addColorStop(0.18, '#8ec3dd');
  globe.addColorStop(0.52, '#2f6f96');
  globe.addColorStop(1, '#18324a');
  ctx.fillStyle = globe;
  ctx.fillRect(globeX - globeRadius - 10, globeY - globeRadius - 10, globeRadius * 2 + 20, globeRadius * 2 + 20);

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1.25;
  for (let i = -3; i <= 3; i += 1) {
    const y = globeY + i * 38;
    ctx.beginPath();
    ctx.ellipse(globeX, y, globeRadius * (1 - Math.abs(i) * 0.09), 12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = -3; i <= 3; i += 1) {
    const x = globeX + i * 42;
    ctx.beginPath();
    ctx.ellipse(x, globeY, 16, globeRadius, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(62,165,93,0.94)';
  ctx.beginPath();
  ctx.moveTo(globeX - 105, globeY - 70);
  ctx.bezierCurveTo(globeX - 168, globeY - 103, globeX - 142, globeY - 152, globeX - 55, globeY - 138);
  ctx.bezierCurveTo(globeX - 30, globeY - 136, globeX - 25, globeY - 105, globeX - 55, globeY - 84);
  ctx.bezierCurveTo(globeX - 82, globeY - 67, globeX - 95, globeY - 56, globeX - 105, globeY - 70);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(63,178,95,0.92)';
  ctx.beginPath();
  ctx.moveTo(globeX - 18, globeY - 130);
  ctx.bezierCurveTo(globeX + 24, globeY - 165, globeX + 84, globeY - 156, globeX + 110, globeY - 114);
  ctx.bezierCurveTo(globeX + 135, globeY - 74, globeX + 109, globeY - 40, globeX + 68, globeY - 32);
  ctx.bezierCurveTo(globeX + 18, globeY - 22, globeX - 12, globeY - 84, globeX - 18, globeY - 130);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(66,171,97,0.88)';
  ctx.beginPath();
  ctx.moveTo(globeX + 28, globeY + 10);
  ctx.bezierCurveTo(globeX + 64, globeY - 10, globeX + 117, globeY + 6, globeX + 129, globeY + 56);
  ctx.bezierCurveTo(globeX + 138, globeY + 96, globeX + 109, globeY + 125, globeX + 73, globeY + 132);
  ctx.bezierCurveTo(globeX + 38, globeY + 139, globeX + 6, globeY + 109, globeX + 15, globeY + 74);
  ctx.bezierCurveTo(globeX + 20, globeY + 51, globeX + 18, globeY + 24, globeX + 28, globeY + 10);
  ctx.closePath();
  ctx.fill();

  const shine = ctx.createRadialGradient(globeX - 72, globeY - 72, 14, globeX - 72, globeY - 72, globeRadius);
  shine.addColorStop(0, 'rgba(255,255,255,0.48)');
  shine.addColorStop(0.5, 'rgba(255,255,255,0.10)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.fillRect(globeX - globeRadius, globeY - globeRadius, globeRadius * 2, globeRadius * 2);

  ctx.restore();

  // Soft left overlay for text contrast
  const textFade = ctx.createLinearGradient(0, 0, 760, 0);
  textFade.addColorStop(0, 'rgba(255,255,255,0.92)');
  textFade.addColorStop(0.72, 'rgba(255,255,255,0.72)');
  textFade.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = textFade;
  ctx.fillRect(0, 0, 760, height);

  // Top brand pill
  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, 56, 48, 360, 82, 12);
  ctx.fill();
  ctx.strokeStyle = '#2e2833';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.drawImage(logo, 78, 66, 36, 36);
  ctx.drawImage(title, 126, 69, 214, 38);

  // Share preview tag
  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, 838, 48, 260, 82, 12);
  ctx.fill();
  ctx.stroke();
  ctx.font = '700 18px Inter, Arial, sans-serif';
  ctx.fillStyle = '#a79aaa';
  ctx.fillText('SHARE PREVIEW', 878, 96);

  // Badge tag and headline
  ctx.fillStyle = '#2e2833';
  drawRoundedRect(ctx, 90, 194, 188, 34, 6);
  ctx.fill();
  ctx.font = '800 16px Inter, Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('SHARE BADGE', 116, 217);

  if (destination) {
    ctx.font = '800 17px Inter, Arial, sans-serif';
    ctx.fillStyle = '#3fa55d';
    ctx.fillText(destination.toUpperCase(), 90, 182);
  }

  ctx.font = '900 53px Inter, Arial, sans-serif';
  ctx.fillStyle = '#111111';
  const headlineLines = wrapText(ctx, shareText, 560);
  let textY = 258;
  for (const line of headlineLines.slice(0, 3)) {
    ctx.fillText(line, 90, textY);
    textY += 58;
  }

  ctx.font = '500 22px Inter, Arial, sans-serif';
  ctx.fillStyle = '#111111';
  const helperLines = wrapText(ctx, 'Tap the link to view the itinerary and drop suggestions.', 520);
  helperLines.forEach((line, index) => {
    ctx.fillText(line, 90, 360 + index * 28);
  });

  // URL panel
  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, 90, 410, 1014, 122, 8);
  ctx.fill();
  ctx.stroke();
  ctx.font = '700 14px Inter, Arial, sans-serif';
  ctx.fillStyle = '#a79aaa';
  ctx.fillText('PUBLIC LINK', 110, 440);
  ctx.font = '700 22px Inter, Arial, sans-serif';
  ctx.fillStyle = '#111111';
  const urlLines = wrapText(ctx, badgeUrl, 920);
  ctx.fillText(urlLines[0] || badgeUrl, 110, 476);
  ctx.font = '700 14px Inter, Arial, sans-serif';
  ctx.fillStyle = '#a79aaa';
  ctx.fillText('LINK READY', 110, 518);

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('Failed to render share image.'));
          return;
        }

        resolve(new File([blob], `travelmate-${destination ? destination.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'trip'}.png`, { type: 'image/png' }));
      },
      'image/png',
      1
    );
  });
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
  shareToken: initialShareToken = '',
  shareLoading = false,
  isOpen,
  onClose,
}: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState(initialShareUrl);
  const [shareToken, setShareToken] = useState(initialShareToken);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  const shareText = useMemo(
    () => `${SHARE_BADGE_TEXT} ${destination ? `I'm planning ${destination} with TravelMate.` : ''}`.trim(),
    [destination]
  );

  useEffect(() => {
    if (initialShareUrl) setShareUrl(initialShareUrl);
    if (initialShareToken) setShareToken(initialShareToken);
  }, [initialShareToken, initialShareUrl]);

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
        setShareToken(data.shareToken);
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

  const shareBadgeImage = async () => {
    if (!shareUrl || imageLoading) return;

    setImageLoading(true);
    setStatusMessage('');
    setError('');

    try {
      const file = await createBadgeFile({
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
          title: `TravelMate trip: ${destination}`,
          text: shareText,
          url: shareUrl,
          files: [file],
        });
        setStatusMessage('Badge image ready to share.');
        return;
      }

      downloadFile(file);
      setStatusMessage('Badge image downloaded.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create share image');
    } finally {
      setImageLoading(false);
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
          className="flex w-full max-w-[540px] flex-col border border-[#2e2833] bg-white shadow-[0_40px_120px_rgba(46,40,51,0.32)]"
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-4 border-b border-[#2e2833] px-5 py-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#a79aaa]">Share trip</div>
              <h3 className="mt-0.5 text-xl font-black tracking-tight text-[#2e2833]">
                {destination ? `Share your ${destination} trip` : 'Invite people to your trip'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 border border-[#2e2833] bg-white p-2 text-[#2e2833] transition hover:bg-[#f5f0f8]"
              aria-label="Close share modal"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4 p-5">
            {/* ── Badge preview card ── */}
            <div className="border border-[#2e2833] overflow-hidden">
              {/* Hero — globe background */}
              <div className="relative h-48 overflow-hidden bg-[#091a2e] sm:h-52">
                {/* Globe */}
                <div className="absolute right-[-48px] top-1/2 h-[300px] w-[300px] -translate-y-1/2 sm:right-[-36px]">
                  <TravelGlobe />
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
                    <div className="brightness-0 invert">
                      <Brand asLink={false} compact showWordmark={true} className="shrink-0" />
                    </div>
                  </div>

                  {/* Text */}
                  <div>
                    {destination && (
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#f6d23c]">
                        {destination}
                      </div>
                    )}
                    <p className="max-w-[58%] text-[15px] font-black leading-snug text-white">
                      {SHARE_BADGE_TEXT}
                    </p>
                    <p className="mt-1.5 max-w-[52%] text-[11px] leading-relaxed text-white/50">
                      Tap the link to view the itinerary &amp; drop suggestions.
                    </p>
                  </div>
                </div>
              </div>

              {/* URL bar */}
              <div className="flex items-center gap-3 border-t border-[#2e2833] bg-[#fafaf8] px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#a79aaa]">Public link</div>
                  <div className="mt-0.5 truncate text-xs font-semibold text-[#2e2833]">
                    {loading || shareLoading ? (
                      <span className="text-[#a79aaa]">Generating link…</span>
                    ) : shareUrl ? (
                      shareUrl
                    ) : (
                      <span className="text-[#a79aaa]">Link not available</span>
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
              <div className="border border-[#c0475f] bg-[#fff3f7] px-4 py-2.5 text-xs font-medium text-[#c0475f]">
                {error}
              </div>
            )}

            {/* ── Action buttons ── */}
            {statusMessage && (
              <div className="border border-[#5aa7e8] bg-[#eef7ff] px-4 py-2.5 text-xs font-medium text-[#2e2833]">
                {statusMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={copyLink}
                disabled={!shareUrl}
                className="flex items-center justify-center gap-2 border border-[#2e2833] bg-white px-4 py-3 text-sm font-semibold text-[#2e2833] transition hover:bg-[#fafaf8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied
                  ? <Check size={15} className="text-[#3fa55d]" />
                  : <Copy size={15} />}
                {copied ? 'Copied!' : 'Copy link'}
              </button>

              <button
                type="button"
                onClick={shareBadgeImage}
                disabled={!shareUrl}
                className="flex items-center justify-center gap-2 border border-[#2e2833] bg-[#2e2833] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1f1b23] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MessageSquareShare size={15} />
                {imageLoading ? 'Preparing image...' : 'Share image'}
              </button>

              <button
                type="button"
                onClick={shareWhatsApp}
                disabled={!shareUrl}
                className="col-span-2 flex items-center justify-center gap-2 border border-[#2e2833] bg-[#f6d23c] px-4 py-3 text-sm font-semibold text-[#2e2833] transition hover:bg-[#f4c927] disabled:cursor-not-allowed disabled:opacity-50"
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
