'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';

type DestinationPhotoCoverProps = {
  destination: string;
  imageUrl?: string | null;
  className?: string;
};

const photoCache = new Map<string, string>();

function getRenderableImageSrc(imageUrl: string) {
  if (imageUrl.startsWith('/')) {
    return imageUrl;
  }

  return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function getFallbackPalette(destination: string) {
  const palettes = [
    ['#6C63FF', '#FF6584', '#3F3D56'],
    ['#FF6584', '#FF8AA2', '#4A3551'],
    ['#3F3D56', '#6C63FF', '#1D1B28'],
    ['#7E7A92', '#C2C0D8', '#3F3D56'],
  ] as const;

  return palettes[hashString(destination) % palettes.length];
}

async function loadPhotoUrl(destination: string) {
  const key = destination.trim().toLowerCase();

  if (!key) {
    return null;
  }

  if (photoCache.has(key)) {
    const cached = photoCache.get(key);

    if (typeof cached === 'string') {
      return cached;
    }

    photoCache.delete(key);
  }

  const response = await fetch(`/api/place-photo?query=${encodeURIComponent(destination)}`, {
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => null);
  const imageUrl = response.ok && typeof payload?.imageUrl === 'string' ? payload.imageUrl : null;

  if (imageUrl) {
    photoCache.set(key, imageUrl);
  }

  return imageUrl;
}

export function DestinationPhotoCover({ destination, imageUrl, className }: DestinationPhotoCoverProps) {
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(imageUrl ?? null);
  const hasPhoto = Boolean(resolvedImageUrl);

  const fallbackPalette = useMemo(() => getFallbackPalette(destination), [destination]);

  useEffect(() => {
    if (imageUrl) {
      setResolvedImageUrl(imageUrl);
      return;
    }

    let mounted = true;

    const run = async () => {
      const url = await loadPhotoUrl(destination);

      if (mounted) {
        setResolvedImageUrl(url);
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [destination, imageUrl]);

  return (
    <div
      className={clsx('relative overflow-hidden', className)}
      style={{
        background: `linear-gradient(135deg, ${fallbackPalette[0]} 0%, ${fallbackPalette[1]} 55%, ${fallbackPalette[2]} 100%)`,
      }}
    >
      {resolvedImageUrl && (
        <img
          src={getRenderableImageSrc(resolvedImageUrl)}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover scale-[1.01] brightness-[1.01] contrast-[1.04] saturate-[1.08]"
          loading="eager"
          decoding="async"
        />
      )}

      <div
        className={
          hasPhoto
            ? 'absolute inset-0 bg-gradient-to-t from-[#161320]/10 via-transparent to-transparent'
            : 'absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.28),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.06),transparent_16%)]'
        }
      />
      <div className={hasPhoto ? 'absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#161320]/06' : 'absolute inset-0 bg-gradient-to-t from-[#161320]/48 via-[#161320]/14 to-transparent'} />
      <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
    </div>
  );
}
