'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, Clock3, Eye, EyeOff, Save, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react';
import {
  getMyProfile,
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

const INTEREST_OPTIONS = [
  'food', 'temples', 'photography', 'nature', 'nightlife', 'museums',
  'hiking', 'beaches', 'coworking', 'slow travel', 'adventure', 'wellness',
] as const;

const BUDGET_OPTIONS = [
  { value: 'budget',   label: 'Budget' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'comfort',  label: 'Comfort' },
  { value: 'luxury',   label: 'Luxury' },
] as const;

const PACE_OPTIONS = [
  { value: 'slow',     label: 'Slow' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'fast',     label: 'Fast' },
] as const;

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

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [bio,         setBio]         = useState('');
  const [style,       setStyle]       = useState<TravelStyle | ''>('');
  const [interests,   setInterests]   = useState<string[]>([]);
  const [languages,   setLanguages]   = useState<string[]>([]);
  const [languageInput, setLanguageInput] = useState('');
  const [budget,      setBudget]      = useState('');
  const [pace,        setPace]        = useState('');
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
          setInterests(p.interests ?? []);
          setLanguages(p.languages ?? []);
          setBudget(p.budget_preference ?? '');
          setPace(p.pace_preference ?? '');
          setIsPublic(p.is_public);
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

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await upsertMyProfile({
        display_name: displayName.trim() || undefined,
        bio:          bio.trim() || undefined,
        travel_style: style || undefined,
        interests,
        languages,
        budget_preference: (budget || null) as TravelerProfile['budget_preference'],
        pace_preference:   (pace || null) as TravelerProfile['pace_preference'],
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

  const toggleInterest = (value: string) => {
    setInterests(prev =>
      prev.includes(value) ? prev.filter(i => i !== value) : prev.length >= 12 ? prev : [...prev, value]
    );
  };

  const addLanguage = () => {
    const value = languageInput.trim().toLowerCase();
    if (!value) return;
    setLanguages(prev => (prev.includes(value) || prev.length >= 12 ? prev : [...prev, value]));
    setLanguageInput('');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-[#fff7ed]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Visibility toggle — most prominent setting */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#eaddc7] bg-white p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isPublic ? 'bg-[#fff7ed]' : 'bg-[#f7f1e8]'}`}>
            {isPublic ? <Eye size={18} className="text-[#ea580c]" /> : <EyeOff size={18} className="text-[#9b8b92]" />}
          </div>
          <div>
            <p className="font-semibold text-[#1c1018]">Traveler profile</p>
            <p className="text-xs text-[#7c6a72]">
              {isPublic ? 'You appear in the explore page' : 'Hidden — only you can see your profile'}
            </p>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          onClick={() => setIsPublic(prev => !prev)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
            isPublic ? 'bg-[#ea580c]' : 'bg-[#eaddc7]'
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

      {/* Verification ladder */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-[#D8D3FF] bg-[#fffbf2] p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#ea580c]" />
              <p className="font-semibold text-[#1c1018]">Identity verification</p>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#7c6a72]">
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
                    ? 'border-[#ea580c] bg-white shadow-sm'
                    : isPast
                      ? 'border-[#D9EAD8] bg-[#F8FBF8]'
                      : 'border-[#eaddc7] bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-semibold ${meta.textClassName}`}>{meta.label}</p>
                  {isCurrent ? (
                    <BadgeCheck size={15} className={meta.iconClassName} />
                  ) : isPast ? (
                    <Sparkles size={15} className="text-[#1B7A5A]" />
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-[#eaddc7]" />
                  )}
                </div>
                <p className="mt-2 text-xs leading-5 text-[#7c6a72]">{meta.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl border border-[#eaddc7] bg-white p-4">
          {verificationComplete ? (
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F0FBF4]">
                <BadgeCheck size={18} className="text-[#1B7A5A]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#1c1018]">Verification complete</p>
                <p className="mt-1 text-sm leading-6 text-[#7c6a72]">
                  {levelMeta.description} Other travelers will see your badge wherever your profile appears.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fff7ed]">
                  <Sparkles size={18} className="text-[#ea580c]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#1c1018]">{statusMeta.label}</p>
                  <p className="mt-1 text-sm leading-6 text-[#7c6a72]">
                    {verificationStatus === 'declined'
                      ? 'Didit could not confirm your identity on the last attempt. You can restart when you are ready.'
                      : verificationStatus === 'pending' || verificationStatus === 'in_review' || verificationStatus === 'resubmitted'
                        ? 'Your current session is still being reviewed. We will keep your progress visible here.'
                        : 'Once your profile is public and saved, you can start a Didit session to unlock the trusted badge.'}
                  </p>
                </div>
              </div>

              {hasUnsavedVisibilityChange && (
                <div className="flex items-start gap-2 rounded-2xl border border-[#F0D9A8] bg-[#fef3c7] px-3 py-2.5 text-sm text-[#A07800]">
                  <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                  Save your profile first so Didit verifies the version other travelers actually see.
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleStartVerification()}
                  disabled={!canStartVerification || startingVerification}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#ea580c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c2410c] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {startingVerification ? 'Opening Didit…' : verificationStatus === 'declined' ? 'Try again with Didit' : 'Start with Didit'}
                </button>

                {!profile?.is_public ? (
                  <p className="text-sm text-[#7c6a72]">
                    Make your traveler profile public to unlock verification.
                  </p>
                ) : hasUnsavedVisibilityChange ? (
                  <p className="text-sm text-[#7c6a72]">
                    Save changes first, then reopen this panel to launch verification.
                  </p>
                ) : (
                  <p className="text-sm text-[#7c6a72]">
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
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#7c6a72]">
          Display name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="How other travelers see you"
          className="w-full rounded-xl border border-[#eaddc7] bg-[#fffbf2] px-4 py-2.5 text-sm text-[#3a2540] outline-none placeholder:text-[#9b8b92] focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/20"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#7c6a72]">
          Bio
          <span className={`normal-case ${bio.length > 120 ? 'text-[#be123c]' : 'text-[#9b8b92]'}`}>
            {bio.length}/140
          </span>
        </label>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value.slice(0, 140))}
          rows={3}
          placeholder="A short note about how you travel…"
          className="w-full resize-none rounded-xl border border-[#eaddc7] bg-[#fffbf2] px-4 py-3 text-sm leading-6 text-[#3a2540] outline-none placeholder:text-[#9b8b92] focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/20"
        />
      </div>

      {/* Travel style */}
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#7c6a72]">
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
                  ? 'border-[#ea580c] bg-[#fff7ed] text-[#ea580c]'
                  : 'border-[#eaddc7] bg-white text-[#7c6a72] hover:border-[#ea580c]'
              }`}
            >
              <span>{opt.emoji}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interests — powers tripmate match scoring */}
      <div>
        <label className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#7c6a72]">
          Interests
          <span className="normal-case text-[#9b8b92]">{interests.length}/12 · helps us match you</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map(option => {
            const active = interests.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleInterest(option)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  active
                    ? 'border-[#ea580c] bg-[#ea580c] text-white'
                    : 'border-[#eaddc7] bg-white text-[#7c6a72] hover:border-[#ea580c] hover:text-[#ea580c]'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* Budget + pace */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#7c6a72]">Budget</label>
          <div className="flex flex-wrap gap-2">
            {BUDGET_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBudget(prev => (prev === opt.value ? '' : opt.value))}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  budget === opt.value
                    ? 'border-[#ea580c] bg-[#fff7ed] text-[#ea580c]'
                    : 'border-[#eaddc7] bg-white text-[#7c6a72] hover:border-[#ea580c]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#7c6a72]">Pace</label>
          <div className="flex flex-wrap gap-2">
            {PACE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPace(prev => (prev === opt.value ? '' : opt.value))}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  pace === opt.value
                    ? 'border-[#ea580c] bg-[#fff7ed] text-[#ea580c]'
                    : 'border-[#eaddc7] bg-white text-[#7c6a72] hover:border-[#ea580c]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Languages */}
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#7c6a72]">Languages</label>
        <div className="flex flex-wrap gap-2">
          {languages.map(lang => (
            <span
              key={lang}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#fff7ed] px-3 py-1.5 text-xs font-semibold capitalize text-[#ea580c]"
            >
              {lang}
              <button
                type="button"
                onClick={() => setLanguages(prev => prev.filter(l => l !== lang))}
                aria-label={`Remove ${lang}`}
                className="text-[#9b8b92] hover:text-[#be123c]"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={languageInput}
            onChange={e => setLanguageInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addLanguage();
              }
            }}
            placeholder="Add a language and press Enter"
            className="flex-1 rounded-xl border border-[#eaddc7] bg-[#fffbf2] px-4 py-2.5 text-sm text-[#3a2540] outline-none placeholder:text-[#9b8b92] focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/20"
          />
          <button
            type="button"
            onClick={addLanguage}
            className="rounded-xl border border-[#eaddc7] bg-white px-4 py-2.5 text-sm font-semibold text-[#ea580c] transition hover:bg-[#fff7ed]"
          >
            Add
          </button>
        </div>
      </div>

      {/* Error / success */}
      {error && (
        <p className="rounded-xl border border-[#be123c] bg-[#ffe4e6] px-4 py-2.5 text-sm text-[#be123c]">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-xl border border-[#ea580c] bg-[#ffedd5] px-4 py-2.5 text-sm font-medium text-[#3a2540]">
          Profile saved ✓
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-[#3a2540] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2c1b33] disabled:opacity-60"
      >
        <Save size={15} />
        {saving ? 'Saving…' : 'Save profile'}
      </button>
    </div>
  );
}
