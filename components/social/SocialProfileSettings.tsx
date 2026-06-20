'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, Clock3, Eye, EyeOff, MapPin, Save, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react';
import {
  getMyProfile,
  setLocationConsent,
  startDiditVerification,
  upsertMyProfile,
  type TravelerProfile,
} from '@/services/social';
import {
  VERIFICATION_LEVEL_ORDER,
  getVerificationLevelMeta,
  getVerificationStatusMeta,
  isTrustedSocialVerificationLevel,
} from '@/services/social-verification';

const STYLE_OPTIONS = [
  { value: 'solo',     label: 'Solo',     emoji: '🎒' },
  { value: 'couple',   label: 'Couple',   emoji: '👫' },
  { value: 'group',    label: 'Group',    emoji: '👥' },
  { value: 'flexible', label: 'Flexible', emoji: '🌊' },
] as const;

type TravelStyle = typeof STYLE_OPTIONS[number]['value'];

interface SocialProfileSettingsProps {
  onProfileSaved?: (profile: TravelerProfile) => void;
}

export function SocialProfileSettings({ onProfileSaved }: SocialProfileSettingsProps = {}) {
  const [profile,   setProfile]   = useState<TravelerProfile | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [startingVerification, setStartingVerification] = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState('');
  const [locationConsent, setLocationConsentState] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [bio,         setBio]         = useState('');
  const [style,       setStyle]       = useState<TravelStyle | ''>('');
  const [isPublic,    setIsPublic]    = useState(false);

  useEffect(() => {
    getMyProfile()
      .then(p => {
        if (p) {
          setProfile(p);
          onProfileSaved?.(p);
          setDisplayName(p.display_name ?? '');
          setBio(p.bio ?? '');
          setStyle((p.travel_style as TravelStyle) ?? '');
          setIsPublic(p.is_public);
          setLocationConsentState(
            !!p.location_consent_at &&
              (!p.location_consent_revoked_at || p.location_consent_revoked_at < p.location_consent_at)
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [onProfileSaved]);

  const verificationLevel = profile?.verification_level ?? 'unverified';
  const verificationStatus = profile?.verification_status ?? 'not_started';
  const levelMeta = getVerificationLevelMeta(verificationLevel);
  const statusMeta = getVerificationStatusMeta(verificationStatus);
  const currentLevelIndex = Math.max(
    0,
    VERIFICATION_LEVEL_ORDER.indexOf(verificationLevel)
  );
  const hasUnsavedVisibilityChange = profile ? profile.is_public !== isPublic : false;
  const canStartVerification = Boolean(profile?.is_public) && !hasUnsavedVisibilityChange;
  const verificationComplete = isTrustedSocialVerificationLevel(profile?.verification_level) && profile?.verified;

  const handleStartVerification = async () => {
    setStartingVerification(true);
    setError('');
    setSaved(false);

    try {
      const { sessionUrl } = await startDiditVerification('/dashboard/community');
      window.location.assign(sessionUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start verification');
    } finally {
      setStartingVerification(false);
    }
  };

  const handleToggleLocationConsent = async () => {
    const next = !locationConsent;
    setSavingConsent(true);
    setError('');
    try {
      await setLocationConsent(next);
      setLocationConsentState(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update location check setting');
    } finally {
      setSavingConsent(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await upsertMyProfile({
        display_name: displayName.trim() || undefined,
        bio:          bio.trim() || undefined,
        travel_style: style || undefined,
        is_public:    isPublic,
      });
      setProfile(updated);
      onProfileSaved?.(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-[#F4F3FF]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Visibility toggle — most prominent setting */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#DDDCE8] bg-white p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isPublic ? 'bg-[#F4F3FF]' : 'bg-[#F4F3F4]'}`}>
            {isPublic ? <Eye size={18} className="text-[#6C63FF]" /> : <EyeOff size={18} className="text-[#8A869C]" />}
          </div>
          <div>
            <p className="font-semibold text-[#1A1726]">Traveler profile</p>
            <p className="text-xs text-[#6F6C82]">
              {isPublic ? 'You appear in the explore page' : 'Hidden — only you can see your profile'}
            </p>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          onClick={() => setIsPublic(prev => !prev)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF] focus-visible:ring-offset-2 ${
            isPublic ? 'bg-[#6C63FF]' : 'bg-[#DDDCE8]'
          }`}
          aria-label="Toggle traveler profile visibility"
        >
          <motion.span
            animate={{ x: isPublic ? 20 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
          />
        </button>
      </div>

      {/* Location check toggle */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#DDDCE8] bg-white p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${locationConsent ? 'bg-[#F4F3FF]' : 'bg-[#F4F3F4]'}`}>
            <MapPin size={18} className={locationConsent ? 'text-[#6C63FF]' : 'text-[#8A869C]'} />
          </div>
          <div>
            <p className="font-semibold text-[#1A1726]">Location check</p>
            <p className="text-xs text-[#6F6C82]">
              {locationConsent
                ? 'We check your location once during a trip to verify you were there'
                : 'Off — we will ask before checking your location on a trip'}
            </p>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={locationConsent}
          onClick={() => void handleToggleLocationConsent()}
          disabled={savingConsent}
          className={`relative flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
            locationConsent ? 'bg-[#6C63FF]' : 'bg-[#DDDCE8]'
          }`}
          aria-label="Toggle location check consent"
        >
          <motion.span
            animate={{ x: locationConsent ? 20 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
          />
        </button>
      </div>

      {/* Verification ladder */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-[#D8D3FF] bg-[#FBFAFF] p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#6C63FF]" />
              <p className="font-semibold text-[#1A1726]">Identity verification</p>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6F6C82]">
              Didit adds a trust badge to your public traveler profile. That badge carries through Explore, Rooms, and traveler cards so other travelers can see how much context they can trust.
            </p>
          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusMeta.pillClassName} ${statusMeta.textClassName}`}
            aria-label={`Verification status: ${statusMeta.label}`}
          >
            {verificationStatus === 'approved' ? (
              <BadgeCheck size={13} className={statusMeta.iconClassName} />
            ) : verificationStatus === 'declined' ? (
              <ShieldAlert size={13} className={statusMeta.iconClassName} />
            ) : (
              <Clock3 size={13} className={statusMeta.iconClassName} />
            )}
            {statusMeta.label}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {VERIFICATION_LEVEL_ORDER.map((level, index) => {
            const meta = getVerificationLevelMeta(level);
            const isCurrent = index === currentLevelIndex;
            const isPast = index < currentLevelIndex;

            return (
              <div
                key={level}
                className={`rounded-2xl border p-3 transition ${
                  isCurrent
                    ? 'border-[#6C63FF] bg-white shadow-sm'
                    : isPast
                      ? 'border-[#D9EAD8] bg-[#F8FBF8]'
                      : 'border-[#DDDCE8] bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-semibold ${meta.textClassName}`}>{meta.label}</p>
                  {isCurrent ? (
                    <BadgeCheck size={15} className={meta.iconClassName} />
                  ) : isPast ? (
                    <Sparkles size={15} className="text-[#1B7A5A]" />
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-[#DDDCE8]" />
                  )}
                </div>
                <p className="mt-2 text-xs leading-5 text-[#6F6C82]">{meta.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl border border-[#DDDCE8] bg-white p-4">
          {verificationComplete ? (
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F0FBF4]">
                <BadgeCheck size={18} className="text-[#1B7A5A]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#1A1726]">Verification complete</p>
                <p className="mt-1 text-sm leading-6 text-[#6F6C82]">
                  {levelMeta.description} Other travelers will see your badge wherever your profile appears.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F4F3FF]">
                  <Sparkles size={18} className="text-[#6C63FF]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#1A1726]">{statusMeta.label}</p>
                  <p className="mt-1 text-sm leading-6 text-[#6F6C82]">
                    {verificationStatus === 'declined'
                      ? 'Didit could not confirm your identity on the last attempt. You can restart when you are ready.'
                      : verificationStatus === 'pending' || verificationStatus === 'in_review' || verificationStatus === 'resubmitted'
                        ? 'Your current session is still being reviewed. We will keep your progress visible here.'
                        : 'Once your profile is public and saved, you can start a Didit session to unlock the trusted badge.'}
                  </p>
                </div>
              </div>

              {hasUnsavedVisibilityChange && (
                <div className="flex items-start gap-2 rounded-2xl border border-[#F0D9A8] bg-[#FFF9EB] px-3 py-2.5 text-sm text-[#A07800]">
                  <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                  Save your profile first so Didit verifies the version other travelers actually see.
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleStartVerification()}
                  disabled={!canStartVerification || startingVerification}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#6C63FF] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5b54e7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {startingVerification ? 'Opening Didit…' : verificationStatus === 'declined' ? 'Try again with Didit' : 'Start with Didit'}
                </button>

                {!profile?.is_public ? (
                  <p className="text-sm text-[#6F6C82]">
                    Make your traveler profile public to unlock verification.
                  </p>
                ) : hasUnsavedVisibilityChange ? (
                  <p className="text-sm text-[#6F6C82]">
                    Save changes first, then reopen this panel to launch verification.
                  </p>
                ) : (
                  <p className="text-sm text-[#6F6C82]">
                    The verification session opens in Didit and returns you here automatically.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.section>

      {/* Display name */}
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6F6C82]">
          Display name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="How other travelers see you"
          className="w-full rounded-xl border border-[#DDDCE8] bg-[#FBFAFF] px-4 py-2.5 text-sm text-[#3F3D56] outline-none placeholder:text-[#8A869C] focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#6F6C82]">
          Bio
          <span className={`normal-case ${bio.length > 120 ? 'text-[#C14D72]' : 'text-[#8A869C]'}`}>
            {bio.length}/140
          </span>
        </label>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value.slice(0, 140))}
          rows={3}
          placeholder="A short note about how you travel…"
          className="w-full resize-none rounded-xl border border-[#DDDCE8] bg-[#FBFAFF] px-4 py-3 text-sm leading-6 text-[#3F3D56] outline-none placeholder:text-[#8A869C] focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20"
        />
      </div>

      {/* Travel style */}
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#6F6C82]">
          Travel style
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STYLE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStyle(opt.value)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                style === opt.value
                  ? 'border-[#6C63FF] bg-[#F4F3FF] text-[#6C63FF]'
                  : 'border-[#DDDCE8] bg-white text-[#6F6C82] hover:border-[#6C63FF]'
              }`}
            >
              <span>{opt.emoji}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error / success */}
      {error && (
        <p className="rounded-xl border border-[#C14D72] bg-[#FFF0F4] px-4 py-2.5 text-sm text-[#C14D72]">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-xl border border-[#6C63FF] bg-[#EEEDFE] px-4 py-2.5 text-sm font-medium text-[#3F3D56]">
          Profile saved ✓
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-[#3F3D56] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#302F43] disabled:opacity-60"
      >
        <Save size={15} />
        {saving ? 'Saving…' : 'Save profile'}
      </button>
    </div>
  );
}
