const photoCache = new Map<string, string>();

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function buildCandidateQueries(query: string) {
  const candidates = new Set<string>();
  const normalized = normalizeQuery(query);

  if (!normalized) {
    return [];
  }

  candidates.add(normalized);

  const commaSplit = normalized.split(',')[0]?.trim();
  if (commaSplit) {
    candidates.add(commaSplit);
  }

  const dashSplit = normalized.split(' - ')[0]?.trim();
  if (dashSplit) {
    candidates.add(dashSplit);
  }

  return [...candidates];
}

function pickImageUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const pages = (payload as { query?: { pages?: Record<string, unknown> } }).query?.pages;

  if (!pages) {
    return null;
  }

  for (const page of Object.values(pages)) {
    if (!page || typeof page !== 'object') {
      continue;
    }

    const candidate = page as {
      thumbnail?: { source?: unknown };
      original?: { source?: unknown };
      imageinfo?: Array<{ url?: unknown }>;
    };

    if (typeof candidate.thumbnail?.source === 'string') {
      return candidate.thumbnail.source;
    }

    if (typeof candidate.original?.source === 'string') {
      return candidate.original.source;
    }

    const imageInfoUrl = candidate.imageinfo?.[0]?.url;

    if (typeof imageInfoUrl === 'string') {
      return imageInfoUrl;
    }
  }

  return null;
}

async function fetchImageUrl(endpoint: string, query: string) {
  const url = new URL(endpoint);
  url.searchParams.set('action', 'query');
  url.searchParams.set('generator', 'search');
  url.searchParams.set('gsrsearch', query);
  url.searchParams.set('gsrlimit', '5');
  url.searchParams.set('prop', 'pageimages|imageinfo');
  url.searchParams.set('pithumbsize', '1600');
  url.searchParams.set('piprop', 'thumbnail|original');
  url.searchParams.set('iiprop', 'url');
  url.searchParams.set('format', 'json');

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null);
  return pickImageUrl(payload);
}

export async function lookupDestinationPhotoUrl(destination: string) {
  const query = normalizeQuery(destination);

  if (!query) {
    return null;
  }

  if (photoCache.has(query)) {
    const cached = photoCache.get(query);

    if (typeof cached === 'string') {
      return cached;
    }

    photoCache.delete(query);
  }

  try {
    for (const candidate of buildCandidateQueries(query)) {
      const wikipediaImageUrl = await fetchImageUrl('https://en.wikipedia.org/w/api.php', candidate);

      if (wikipediaImageUrl) {
        photoCache.set(query, wikipediaImageUrl);
        return wikipediaImageUrl;
      }

      const commonsImageUrl = await fetchImageUrl('https://commons.wikimedia.org/w/api.php', candidate);

      if (commonsImageUrl) {
        photoCache.set(query, commonsImageUrl);
        return commonsImageUrl;
      }
    }

    return null;
  } catch {
    return null;
  }
}
