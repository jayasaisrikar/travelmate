import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F2F2F2] text-[#3F3D56]">
          <div className="border border-[#3F3D56] bg-white px-6 py-5">Loading signup...</div>
        </div>
      }
    >
      <AuthForm mode="signup" />
    </Suspense>
  );
}
