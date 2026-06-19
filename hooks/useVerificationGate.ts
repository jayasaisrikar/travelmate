'use client';

import { useCallback, useEffect, useState } from 'react';
import { getMyProfile, SocialApiError } from '@/services/social';
import { isTrustedVerificationLevel } from '@/services/didit';

export function isVerificationRequiredError(e: unknown): boolean {
  return e instanceof SocialApiError && e.code === 'verification_required';
}

export function useVerificationGate() {
  const [level, setLevel] = useState<string>('unverified');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    getMyProfile()
      .then((p) => setLevel((p?.verification_level as string | undefined) ?? 'unverified'))
      .catch(() => setLevel('unverified'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { level, isVerified: isTrustedVerificationLevel(level), loading, refresh };
}
