'use client';

import { motion } from 'framer-motion';
import { BadgeCheck, Clock3, MapPin, MessageCircle, ShieldAlert } from 'lucide-react';
import { WaveButton } from '@/components/social/WaveButton';
import { MessageButton } from '@/components/social/MessageButton';
import type { TravelerWithSignal } from '@/services/social';
import {
  getVerificationLevelMeta,
  getVerificationStatusMeta,
  isTrustedSocialVerificationLevel,
} from '@/services/social-verification';

interface TravelerCardProps {
  traveler: TravelerWithSignal;
  /** Show compact horizontal layout instead of the default vertical card */
  compact?: boolean;
}

const styleLabels: Record<string, string> = {
  solo:     'Solo',
  couple:   'Couple',
  group:    'Group',
  flexible: 'Flexible',
};

const styleColors: Record<string, string> = {
  solo:     'bg-[#F4F3FF] text-[#6C63FF]',
  couple:   'bg-[#FFF0F4] text-[#C14D72]',
  group:    'bg-[#F0FFF8] text-[#1B7A5A]',
  flexible: 'bg-[#FFFBF0] text-[#A07800]',
};

function Avatar({ name, url, size = 48 }: { name: string | null; url: string | null; size?: number }) {
  if (url) {
    return (
      // Avatar URLs can come from user-provided or remote storage sources.
      // We keep a plain <img> here to avoid over-constraining avatar hosts.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ?? 'Traveler'}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  const initials = (name ?? '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6C63FF] to-[#FF6584] font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

function VerificationChip({ traveler }: { traveler: TravelerWithSignal }) {
  const status = traveler.verification_status ?? 'not_started';
  const levelMeta = getVerificationLevelMeta(traveler.verification_level);
  const statusMeta = getVerificationStatusMeta(status);

  if (status === 'pending' || status === 'in_review' || status === 'resubmitted') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusMeta.pillClassName} ${statusMeta.textClassName}`}
      >
        <Clock3 size={11} className={statusMeta.iconClassName} />
        {statusMeta.label}
      </span>
    );
  }

  if (status === 'declined' || status === 'expired' || status === 'abandoned') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusMeta.pillClassName} ${statusMeta.textClassName}`}
      >
        <ShieldAlert size={11} className={statusMeta.iconClassName} />
        {statusMeta.label}
      </span>
    );
  }

  if (traveler.verified || isTrustedSocialVerificationLevel(traveler.verification_level)) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${levelMeta.pillClassName} ${levelMeta.textClassName}`}
      >
        <BadgeCheck size={11} className={levelMeta.iconClassName} />
        {levelMeta.label}
      </span>
    );
  }

  if (traveler.verification_level === 'basic') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${levelMeta.pillClassName} ${levelMeta.textClassName}`}
      >
        <BadgeCheck size={11} className={levelMeta.iconClassName} />
        {levelMeta.label}
      </span>
    );
  }

  return null;
}

export function TravelerCard({ traveler, compact = false }: TravelerCardProps) {
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 rounded-2xl border border-[#DDDCE8] bg-white p-3 shadow-sm"
      >
        <Avatar name={traveler.display_name} url={traveler.avatar_url} size={40} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-[#1A1726]">
              {traveler.display_name ?? 'Traveler'}
            </span>
            <VerificationChip traveler={traveler} />
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-[#8A869C]">
            <MapPin size={11} />
            <span className="truncate">{traveler.destination}</span>
            {traveler.travel_month && (
              <span className="truncate">· {traveler.travel_month}</span>
            )}
          </div>
        </div>

        {traveler.is_self ? (
          <span className="rounded-full bg-[#F4F3FF] px-2.5 py-1 text-[11px] font-semibold text-[#6C63FF]">Your trip</span>
        ) : (
          <WaveButton
            userId={traveler.id}
            initialStatus={traveler.connection_status}
          />
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col rounded-2xl border border-[#DDDCE8] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={traveler.display_name} url={traveler.avatar_url} size={48} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[#1A1726]">
                {traveler.display_name ?? 'Traveler'}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {traveler.travel_style && (
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    styleColors[traveler.travel_style] ?? 'bg-[#F4F3FF] text-[#6C63FF]'
                  }`}
                >
                  {styleLabels[traveler.travel_style]}
                </span>
              )}
            </div>
          </div>
        </div>

        {traveler.is_self ? (
          <span className="rounded-full bg-[#F4F3FF] px-2.5 py-1 text-[11px] font-semibold text-[#6C63FF]">Your trip</span>
        ) : (
          <div className="flex shrink-0 items-center gap-1.5">
            <MessageButton userId={traveler.id} travelerName={traveler.display_name} />
            <WaveButton
              userId={traveler.id}
              initialStatus={traveler.connection_status}
            />
          </div>
        )}
      </div>

      {/* Bio */}
      {traveler.bio && (
        <p className="mt-3 text-sm leading-5 text-[#6F6C82] line-clamp-2">{traveler.bio}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <VerificationChip traveler={traveler} />
      </div>

      {/* Destination badge */}
      <div className="mt-4 flex items-center gap-1.5 rounded-xl bg-[#F8F7FF] px-3 py-2">
        <MapPin size={14} className="shrink-0 text-[#6C63FF]" />
        <span className="text-sm font-semibold text-[#3F3D56]">{traveler.destination}</span>
        {traveler.travel_month && (
          <span className="ml-auto text-xs text-[#8A869C]">{traveler.travel_month}</span>
        )}
      </div>

      <div className="mt-3 [&>button]:w-full [&>button]:justify-center [&>button]:py-2">
        {traveler.is_self ? (
          <button
            type="button"
            disabled
            title="This is your own traveler profile"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDDCE8] bg-[#F4F3F4] px-3 py-1.5 text-xs font-semibold text-[#8A869C] disabled:cursor-not-allowed"
          >
            <MessageCircle size={13} />
            Message traveler
          </button>
        ) : (
          <MessageButton userId={traveler.id} travelerName={traveler.display_name} />
        )}
      </div>
    </motion.div>
  );
}
