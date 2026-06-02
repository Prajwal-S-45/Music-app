import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=500&q=80';
const PAGE_SIZE = 24;
const DEBOUNCE_MS = 300;
const CACHE_TTL_MS = 5 * 60 * 1000;
const pageCache = new Map();

const LANGUAGE_OPTIONS = [
  { value: '', label: 'All languages' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'Telugu', label: 'Telugu' },
  { value: 'Tamil', label: 'Tamil' },
  { value: 'Kannada', label: 'Kannada' },
  { value: 'Malayalam', label: 'Malayalam' },
  { value: 'Punjabi', label: 'Punjabi' },
  { value: 'Bengali', label: 'Bengali' },
  { value: 'Marathi', label: 'Marathi' },
  { value: 'English', label: 'English' },
  { value: 'Other', label: 'Other' },
];

const normalizeText = (value) => String(value || '').trim();

const normalizeArtist = (artist, index) => {
  const id = String(artist?.id || artist?.name || `artist-${index}`).trim();
  return {
    id,
    name: normalizeText(artist?.name || 'Unknown Artist'),
    image: artist?.image || artist?.thumbnail || FALLBACK_IMAGE,
    language: normalizeText(artist?.language || ''),
    popularity: Number(artist?.popularity || artist?.frequency || 0),
  };
};

function cacheKey(query, token) {
  return `${normalizeText(query).toLowerCase()}::${String(token || '')}`;
}

function readCache(query, token) {
  const entry = pageCache.get(cacheKey(query, token));
  if (!entry || entry.expiresAt <= Date.now()) {
    return null;
  }

  return entry;
}

function writeCache(query, token, payload) {
  pageCache.set(cacheKey(query, token), {
    expiresAt: Date.now() + CACHE_TTL_MS,
    ...payload,
  });
}

const ArtistCard = React.memo(function ArtistCard({ artist, onClick }) {
  return (
    <button
      type="button"
      className="artists-page__card"
      onClick={() => onClick(artist)}
    >
      <span className="artists-page__image-wrap">
        <img
          src={artist.thumbnail || FALLBACK_IMAGE}
          alt={artist.name}
          loading="lazy"
          className="artists-page__image"
        />
      </span>
      <span className="artists-page__name">{artist.name}</span>
      <span className="artists-page__meta">{artist.language || 'Artist'}</span>
    </button>
  );
});

function ArtistsPage({ embedded = false }) {
  const navigate = useNavigate();
  const [artists, setArtists] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [nextPageToken, setNextPageToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const sentinelRef = useRef(null);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedQuery(normalizeText(inputValue));
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timerId);
  }, [inputValue]);

  useEffect(() => {
    let mounted = true;

    const loadArtists = async () => {
      const cached = readCache(debouncedQuery, '');
      if (cached) {
        setArtists(cached.items);
        setNextPageToken(cached.nextPageToken || '');
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage('');
        const response = await apiClient.get('/api/artists', {
          params: {
            limit: PAGE_SIZE,
            ...(debouncedQuery ? { q: debouncedQuery } : {}),
          },
        });

        const incoming = Array.isArray(response.data?.data) ? response.data.data : [];
        const normalized = Array.from(new Map(incoming.map((artist, index) => {
          const nextArtist = normalizeArtist(artist, index);
          return [nextArtist.id, nextArtist];
        })).values());

        const token = String(response.data?.nextPageToken || '');
        writeCache(debouncedQuery, '', { items: normalized, nextPageToken: token });
        if (mounted) {
          setArtists(normalized);
          setNextPageToken(token);
        }
      } catch (error) {
        if (mounted) {
          setArtists([]);
          setNextPageToken('');
          setErrorMessage('Could not load artists right now.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadArtists();
    return () => {
      mounted = false;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    if (!sentinelRef.current || !nextPageToken || isLoading || isLoadingMore) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { rootMargin: '240px 0px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [nextPageToken, isLoading, isLoadingMore]);

  const filteredArtists = useMemo(() => {
    const normalized = normalizeText(inputValue).toLowerCase();
    const language = normalizeText(languageFilter).toLowerCase();

    return artists.filter((artist) => {
      const matchesSearch = !normalized || artist.name.toLowerCase().includes(normalized);
      const matchesLanguage = !language || normalizeText(artist.language).toLowerCase() === language;
      return matchesSearch && matchesLanguage;
    });
  }, [artists, inputValue, languageFilter]);

  const loadMore = useCallback(async () => {
    if (!nextPageToken || isLoading || isLoadingMore) {
      return;
    }

    const cached = readCache(debouncedQuery, nextPageToken);
    if (cached) {
      setArtists((current) => {
        const merged = [...current, ...cached.items];
        return Array.from(new Map(merged.map((artist) => [artist.id, artist])).values());
      });
      setNextPageToken(cached.nextPageToken || '');
      return;
    }

    try {
      setIsLoadingMore(true);
      setErrorMessage('');
      const response = await apiClient.get('/api/artists', {
        params: {
          limit: PAGE_SIZE,
          ...(debouncedQuery ? { q: debouncedQuery } : {}),
          pageToken: nextPageToken,
        },
      });

      const incoming = Array.isArray(response.data?.data) ? response.data.data : [];
      const normalized = Array.from(new Map(incoming.map((artist, index) => {
        const nextArtist = normalizeArtist(artist, index);
        return [nextArtist.id, nextArtist];
      })).values());

      const token = String(response.data?.nextPageToken || '');
      writeCache(debouncedQuery, nextPageToken, { items: normalized, nextPageToken: token });
      setArtists((current) => {
        const merged = [...current, ...normalized];
        return Array.from(new Map(merged.map((artist) => [artist.id, artist])).values());
      });
      setNextPageToken(token);
    } catch (error) {
      setErrorMessage('Could not load more artists.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [debouncedQuery, isLoading, isLoadingMore, nextPageToken]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setDebouncedQuery(normalizeText(inputValue));
  };

  const openArtist = (artist) => {
    navigate(`/artist/${encodeURIComponent(artist.name)}`);
  };

  return (
    <div className={`artists-page ${embedded ? 'artists-page--embedded' : ''}`}>
      <section className="artists-page__hero">
        <div>
          <p className="artists-page__eyebrow">Artists</p>
          <h2>{embedded ? 'Artists' : 'All Artists'}</h2>
          <p>Browse Indian artists across Hindi, Telugu, Tamil, Kannada, Malayalam, Punjabi, and more.</p>
        </div>
        <div className="artists-page__search">
          <form onSubmit={handleSubmit}>
            <input
              type="search"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Search artists..."
              aria-label="Search artists"
            />
          </form>
          <div className="artists-page__filters">
            <label className="artists-page__filter">
              <span>Language</span>
              <select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}>
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {errorMessage ? <p className="artists-page__error">{errorMessage}</p> : null}
      {isLoading ? <p className="artists-page__status">Loading artists...</p> : null}

      <section className="artists-page__grid">
        {filteredArtists.map((artist) => (
          <ArtistCard key={artist.id} artist={artist} onClick={openArtist} />
        ))}
      </section>

      {!isLoading && filteredArtists.length === 0 && (
        <div className="artists-page__empty">No artists found</div>
      )}

      <div className="artists-page__footer">
        {nextPageToken && (
          <button type="button" className="artists-page__load-more" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </button>
        )}
      </div>

      <div ref={sentinelRef} className="artists-page__sentinel" aria-hidden="true" />
    </div>
  );
}

export default ArtistsPage;
