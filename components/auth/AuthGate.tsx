'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/services/supabase-browser';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseBrowser();

    const ensureSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (!data.session) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      if (!userData.user) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      if (!userData.user.email_confirmed_at) {
        await supabase.auth.signOut();
        router.replace(`/login?next=${encodeURIComponent(pathname)}&message=verify-email`);
        return;
      }

      setReady(true);
    };

    ensureSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) {
        return;
      }

      if (!session) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      supabase.auth.getUser().then(({ data: userData }) => {
        if (!mounted) {
          return;
        }

        if (!userData.user) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }

        if (!userData.user.email_confirmed_at) {
          void supabase.auth.signOut();
          router.replace(`/login?next=${encodeURIComponent(pathname)}&message=verify-email`);
          return;
        }

        setReady(true);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7] text-[#2e2833]">
        <div className="rounded-none border border-[#2e2833] bg-white px-6 py-5 shadow-none">
          Checking your account...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
