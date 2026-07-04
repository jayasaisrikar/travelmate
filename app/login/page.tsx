import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/AuthForm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Log in to your wayflo account to plan and manage your trips.',
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F2F2F2] text-[#3F3D56]">
          <LoadingSpinner size="lg" label="Preparing sign-in" />
        </div>
      }
    >
      <AuthForm mode="login" />
    </Suspense>
  );
}
