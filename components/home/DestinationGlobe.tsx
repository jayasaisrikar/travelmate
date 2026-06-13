'use client';

import dynamic from 'next/dynamic';

/**
 * Client-only wrapper for the WebGL globe (react-globe.gl touches `window`/WebGL,
 * so it must never run during SSR). Shows a soft sunset placeholder while loading.
 */
const Inner = dynamic(() => import('./DestinationGlobeInner'), {
  ssr: false,
  loading: () => (
    <div className="aspect-square w-full">
      <div className="h-full w-full animate-pulse rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(234,88,12,0.16),transparent_62%)]" />
    </div>
  ),
});

export function DestinationGlobe() {
  return <Inner />;
}
