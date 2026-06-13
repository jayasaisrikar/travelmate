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
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#1F1D2B]/35 px-3 py-3 backdrop-blur-[2px] sm:px-6 sm:py-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#fffbf4_100%)] p-4 shadow-[0_30px_90px_rgba(58,37,64,0.18)] sm:max-h-[calc(100dvh-3rem)] sm:rounded-[30px] sm:p-7"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-consent-title"
          >
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ffedd5] text-[#ea580c] sm:h-11 sm:w-11">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8c7882] sm:text-[11px] sm:tracking-[0.24em]">
                    Your privacy
                  </div>
                  <h2 id="cookie-consent-title" className="mt-1 text-xl font-medium leading-tight tracking-tight text-[#3a2540] sm:text-2xl">
                    Choose how wayflo uses cookies.
                  </h2>
                </div>
              </div>

              {allowClose && (
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#f0e2d0] bg-white text-[#7c6a72] hover:text-[#3a2540]"
                  aria-label="Close cookie preferences"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#7c6a72] sm:mt-4 sm:text-base sm:leading-7">
              We use essential cookies to keep sign-in and trip planning secure. With your permission, we also use
              optional cookies to improve the product and remember helpful preferences.
            </p>

            <div className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
              {toggles.map((toggle) => {
                const enabled = preferences[toggle.key];

                return (
                  <div
                    key={toggle.key}
                    className="rounded-2xl border border-[#f0e2d0] bg-white px-3.5 py-3 shadow-[0_12px_28px_rgba(58,37,64,0.05)] sm:px-4 sm:py-4"
                  >
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#3a2540] sm:text-base">{toggle.title}</div>
                        <p className="mt-1 text-sm leading-5 text-[#7c6a72] sm:leading-6">{toggle.description}</p>
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
                            ? 'border-[#ea580c] bg-[#ea580c]'
                            : 'border-[#fed7aa] bg-[#fbf1e6]'
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

            <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-[#3a2540] px-4 py-3 text-white sm:mt-5 sm:flex-row sm:items-center sm:justify-between sm:py-4">
              <div className="flex items-start gap-3">
                <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-white/80" />
                <p className="text-sm leading-5 text-white/85 sm:leading-6">
                  You can update this choice any time from the footer links on the site.
                </p>
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65 sm:text-xs sm:tracking-[0.18em]">Updated instantly</div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:flex sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={() =>
                  handleSave({
                    essential: true,
                    analytics: false,
                    personalization: false,
                  })
                }
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#ea580c]/25 bg-white px-2 py-2 text-center text-xs font-semibold leading-tight text-[#ea580c] sm:min-h-11 sm:px-4 sm:py-3 sm:text-sm"
              >
                Essential only
              </button>
              <button
                type="button"
                onClick={() => handleSave(preferences)}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#f0e2d0] bg-[#fffbf4] px-2 py-2 text-center text-xs font-semibold leading-tight text-[#3a2540] sm:min-h-11 sm:px-4 sm:py-3 sm:text-sm"
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
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#ea580c] px-2 py-2 text-center text-xs font-semibold leading-tight text-white shadow-[0_14px_30px_rgba(234,88,12,0.24)] sm:min-h-11 sm:px-4 sm:py-3 sm:text-sm"
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
