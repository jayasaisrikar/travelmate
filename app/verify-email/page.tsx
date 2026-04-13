import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Brand } from '@/components/common/Brand';
import { confirmSignupVerificationToken } from '@/services/signup-verification';

type SearchParams = {
  token?: string;
};

async function resolveSearchParams(searchParams?: Promise<SearchParams>) {
  return (await Promise.resolve(searchParams ?? {})) as SearchParams;
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = await resolveSearchParams(searchParams);
  const token = typeof params.token === 'string' ? params.token.trim() : '';

  if (token) {
    const result = await confirmSignupVerificationToken(token);

    if (result.status === 'confirmed' || result.status === 'already_used') {
      redirect('/login?message=verify-email');
    }
  }

  return (
    <div className="min-h-screen bg-[#fbfaf7] px-4 py-8 text-[#2e2833] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="border border-[#2e2833] bg-white p-6 shadow-none sm:p-8">
            <Brand href="/" className="mb-5" />
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
              Verify your email
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-[#756978]">
              We use your TravelMate verification link, then confirm the account in Supabase behind the scenes.
            </p>
          </div>

          <div className="border border-[#2e2833] bg-white p-6 shadow-none sm:p-8">
            <div className="flex items-center justify-between border-b border-[#eadde5] pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#a79aaa]">
                  Verification
                </div>
                <h2 className="mt-1 text-2xl font-black tracking-tight">Link problem</h2>
              </div>
              <div className="h-10 w-10 border border-[#2e2833] bg-[#f6d23c]" />
            </div>

            <div className="mt-6 border border-[#eadde5] bg-[#fffdf9] px-4 py-3 text-sm font-medium text-[#2e2833]">
              This verification link is missing, expired, or already used.
            </div>

            <div className="mt-6 space-y-3 text-sm text-[#756978]">
              <p>
                If you already clicked it, go back to login and sign in.
              </p>
              <p>
                If you need a fresh account, create one from the signup page.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="border border-[#2e2833] bg-[#2e2833] px-4 py-3 font-semibold text-white transition hover:bg-[#1f1b23]"
              >
                Go to signup
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
