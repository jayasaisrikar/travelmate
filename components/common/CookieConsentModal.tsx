'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, SlidersHorizontal, X } from 'lucide-react';

type CookiePreferences = {
  essential: true;
  analytics: boolean;
  personalization: boolean;
};

type SavedCookieConsent = {
  version: number;
  consentedAt: string;
  preferences: CookiePreferences;
};

const STORAGE_KEY = 'wayflo-cookie-consent';
const STORAGE_VERSION = 1;

const defaultPreferences: CookiePreferences = {
  essential: true,
  analytics: true,
  personalization: true,
};

function readSavedConsent(): SavedCookieConsent | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as SavedCookieConsent;
    if (parsedValue.version !== STORAGE_VERSION) {
      return null;
    }

    return parsedValue;
  } catch {
    return null;
  }
}

function saveConsent(preferences: CookiePreferences) {
  const payload: SavedCookieConsent = {
    version: STORAGE_VERSION,
    consentedAt: new Date().toISOString(),
    preferences,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent('wayflo:cookie-preferences-saved', { detail: payload }));
}

export function CookieConsentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [allowClose, setAllowClose] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);

  useEffect(() => {
    const savedConsent = readSavedConsent();

    if (savedConsent) {
      setPreferences(savedConsent.preferences);
      return;
    }

    setIsOpen(true);
  }, []);

  useEffect(() => {
    const handleOpenPreferences = () => {
      const savedConsent = readSavedConsent();

      if (savedConsent) {
        setPreferences(savedConsent.preferences);
        setAllowClose(true);
      } else {
        setPreferences(defaultPreferences);
        setAllowClose(false);
      }

      setIsOpen(true);
    };

    window.addEventListener('wayflo:open-cookie-preferences', handleOpenPreferences);

    return () => {
      window.removeEventListener('wayflo:open-cookie-preferences', handleOpenPreferences);
    };
  }, []);

  const toggles = useMemo(
    () => [
      {
        key: 'essential' as const,
        title: 'Essential cookies',
        description: 'Always on for sign-in, security, saved sessions, and core trip planning flows.',
        locked: true,
      },
      {
        key: 'analytics' as const,
        title: 'Analytics cookies',
        description: 'Help us understand which screens feel smooth, confusing, or slow so we can improve them.',
        locked: false,
      },
      {
        key: 'personalization' as const,
        title: 'Preference cookies',
        description: 'Remember interface choices and helpful details so returning to a trip feels more seamless.',
        locked: false,
      },
    ],
    []
  );

  const handleSave = (nextPreferences: CookiePreferences) => {
    saveConsent(nextPreferences);
    setPreferences(nextPreferences);
    setIsOpen(false);
    setAllowClose(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-[#1F1D2B]/35 px-4 py-4 backdrop-blur-[2px] sm:items-center sm:px-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f7ff_100%)] p-5 shadow-[0_30px_90px_rgba(63,61,86,0.18)] sm:p-7"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-consent-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEEDFE] text-[#6C63FF]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7E7A92] sm:text-[11px] sm:tracking-[0.24em]">
                    Your privacy
                  </div>
                  <h2 id="cookie-consent-title" className="mt-1 text-2xl font-medium tracking-[-0.04em] text-[#3F3D56]">
                    Choose how wayflo uses cookies.
                  </h2>
                </div>
              </div>

              {allowClose && (
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E4E2F0] bg-white text-[#6F6C82] hover:text-[#3F3D56]"
                  aria-label="Close cookie preferences"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <p className="mt-4 max-w-xl text-sm leading-7 text-[#6F6C82] sm:text-base">
              We use essential cookies to keep sign-in and trip planning secure. With your permission, we also use
              optional cookies to improve the product and remember helpful preferences.
            </p>

            <div className="mt-5 space-y-3">
              {toggles.map((toggle) => {
                const enabled = preferences[toggle.key];

                return (
                  <div
                    key={toggle.key}
                    className="rounded-2xl border border-[#E4E2F0] bg-white px-4 py-4 shadow-[0_12px_28px_rgba(63,61,86,0.05)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-[#3F3D56] sm:text-base">{toggle.title}</div>
                        <p className="mt-1 text-sm leading-6 text-[#6F6C82]">{toggle.description}</p>
                      </div>

                      <button
                        type="button"
                        disabled={toggle.locked}
                        onClick={() => {
                          if (toggle.locked) {
                            return;
                          }

                          setPreferences((currentPreferences) => ({
                            ...currentPreferences,
                            [toggle.key]: !currentPreferences[toggle.key],
                          }));
                        }}
                        className={`relative inline-flex h-8 w-14 shrink-0 rounded-full border transition ${
                          enabled
                            ? 'border-[#6C63FF] bg-[#6C63FF]'
                            : 'border-[#D8D4F2] bg-[#F3F2FA]'
                        } ${toggle.locked ? 'cursor-not-allowed opacity-90' : ''}`}
                        aria-pressed={enabled}
                        aria-label={`${enabled ? 'Disable' : 'Enable'} ${toggle.title}`}
                      >
                        <span
                          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition ${enabled ? 'left-7' : 'left-1'}`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-[#3F3D56] px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-white/80" />
                <p className="text-sm leading-6 text-white/85">
                  You can update this choice any time from the footer links on the site.
                </p>
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">Updated instantly</div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  handleSave({
                    essential: true,
                    analytics: false,
                    personalization: false,
                  })
                }
                className="inline-flex items-center justify-center rounded-xl border border-[#6C63FF]/25 bg-white px-4 py-3 text-sm font-semibold text-[#6C63FF]"
              >
                Essential only
              </button>
              <button
                type="button"
                onClick={() => handleSave(preferences)}
                className="inline-flex items-center justify-center rounded-xl border border-[#E4E2F0] bg-[#F8F7FF] px-4 py-3 text-sm font-semibold text-[#3F3D56]"
              >
                Save preferences
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSave({
                    essential: true,
                    analytics: true,
                    personalization: true,
                  })
                }
                className="inline-flex items-center justify-center rounded-xl bg-[#6C63FF] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(108,99,255,0.24)]"
              >
                Accept all
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}