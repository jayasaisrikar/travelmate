'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, Save, Eye, EyeOff } from 'lucide-react';
import { getMyProfile, upsertMyProfile, type TravelerProfile } from '@/services/social';

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
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState('');

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
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [onProfileSaved]);

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
          onClick={() => setIsPublic(prev => !prev)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
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

      {/* Verified badge note */}
      {profile?.verified && (
        <div className="flex items-center gap-2 rounded-xl bg-[#F4F3FF] px-4 py-3 text-sm text-[#6C63FF]">
          <BadgeCheck size={16} />
          Your profile has a verified badge.
        </div>
      )}

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
