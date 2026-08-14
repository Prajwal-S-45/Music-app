import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import apiClient from '../api/client';
import { getTrendingArtists } from '../api/musicApi';

const DEFAULT_ARTIST_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231e293b"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="%2338bdf8" font-size="36" font-family="sans-serif" font-weight="bold">🎵</text></svg>';

// Module-level cache: artist name → resolved image URL (or DEFAULT_ARTIST_SVG)
const imageCache = new Map();

const resolveArtistImage = (name) => {
  const key = name.toLowerCase().trim();
  if (imageCache.has(key)) return imageCache.get(key);

  const promise = apiClient
    .get(`/api/music/artist-image?name=${encodeURIComponent(name)}`)
    .then((res) => {
      const url = res.data?.url || DEFAULT_ARTIST_SVG;
      imageCache.set(key, Promise.resolve(url));
      return url;
    })
    .catch(() => {
      imageCache.set(key, Promise.resolve(DEFAULT_ARTIST_SVG));
      return DEFAULT_ARTIST_SVG;
    });

  imageCache.set(key, promise);
  return promise;
};

const handleArtistImageError = (e, name) => {
  // Use a data-attribute marker to prevent repeated fallback attempts
  if (e.target.dataset.fallbackAttempted) {
    e.target.src = DEFAULT_ARTIST_SVG;
    return;
  }
  e.target.dataset.fallbackAttempted = 'true';

  if (!name) {
    e.target.src = DEFAULT_ARTIST_SVG;
    return;
  }

  resolveArtistImage(name).then((url) => {
    e.target.src = url;
  });
};

function ArtistAvatar({ name, image }) {
  const cached = name ? imageCache.get(name.toLowerCase().trim()) : undefined;
  const [src, setSrc] = useState(() => {
    if (image) return image;
    // Synchronously use a cached result if already resolved
    if (cached && typeof cached === 'string') return cached;
    return DEFAULT_ARTIST_SVG;
  });

  useEffect(() => {
    if (!image && name) {
      resolveArtistImage(name).then((url) => {
        setSrc(url);
      });
    }
  }, [image, name]);

  return (
    <img
      src={src}
      alt={name}
      onError={(e) => handleArtistImageError(e, name)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
    />
  );
}

export default function ArtistsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [popularArtists, setPopularArtists] = useState([]);
  const [allArtists, setAllArtists] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // 1. Debounce Search Query (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 2. Fetch Popular Artists on mount
  useEffect(() => {
    const loadPopular = async () => {
      try {
        setLoadingPopular(true);
        const res = await getTrendingArtists(16);
        const raw = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
        const seen = new Set();
        const unique = [];
        for (const a of raw) {
          if (!a || !a.name) continue;
          const norm = a.name.toLowerCase().trim();
          if (!seen.has(norm)) {
            seen.add(norm);
            unique.push({
              id: a.id || a.name,
              name: a.name,
              image: a.image || a.thumbnail || null,
            });
          }
        }
        setPopularArtists(unique);
      } catch (err) {
        console.error('Failed to load popular artists:', err);
      } finally {
        setLoadingPopular(false);
      }
    };
    loadPopular();
  }, []);

  // 3. Fetch Initial All Artists on mount
  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoadingAll(true);
        const res = await apiClient.get('/api/music/artists', { params: { limit: 48, page: 1 } });
        const raw = Array.isArray(res?.data?.data) ? res.data.data : [];
        const seen = new Set();
        const unique = [];
        for (const a of raw) {
          if (!a || !a.name) continue;
          const norm = a.name.toLowerCase().trim();
          if (!seen.has(norm)) {
            seen.add(norm);
            unique.push({
              id: a.id || a.name,
              name: a.name,
              image: a.image || a.thumbnail || null,
            });
          }
        }
        setAllArtists(unique);
      } catch (err) {
        console.error('Failed to load all artists:', err);
      } finally {
        setLoadingAll(false);
      }
    };
    loadAll();
  }, []);

  // 4. Dynamic API Search when debouncedQuery changes
  useEffect(() => {
    if (!debouncedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError('');
      return;
    }

    let isMounted = true;
    const executeSearch = async () => {
      try {
        setIsSearching(true);
        setSearchError('');

        const response = await apiClient.get('/api/music/artists', {
          params: { q: debouncedQuery, limit: 30 }
        });

        if (!isMounted) return;

        const raw = Array.isArray(response.data?.data) ? response.data.data : [];
        const seen = new Set();
        const unique = [];

        for (const a of raw) {
          if (!a || !a.name) continue;
          const norm = a.name.toLowerCase().trim();
          if (!seen.has(norm)) {
            seen.add(norm);
            unique.push({
              id: a.id || a.name,
              name: a.name,
              image: a.image || a.thumbnail || null,
            });
          }
        }
        setSearchResults(unique);
      } catch (error) {
        if (isMounted) {
          console.error('Artist search failed:', error);
          setSearchError('Failed to fetch search results. Please try again.');
          setSearchResults([]);
        }
      } finally {
        if (isMounted) {
          setIsSearching(false);
        }
      }
    };

    executeSearch();
    return () => { isMounted = false; };
  }, [debouncedQuery]);

  const openArtist = (artist) => {
    navigate(`/artists/${encodeURIComponent(artist.name)}`);
  };

  const isSearchActive = Boolean(debouncedQuery);

  const dedupedAllArtists = useMemo(() => {
    const popularNames = new Set(popularArtists.map(a => (a.name || '').toLowerCase().trim()));
    return allArtists.filter(a => !popularNames.has((a.name || '').toLowerCase().trim()));
  }, [popularArtists, allArtists]);

  return (
    <div className="artists-page-wrapper" style={{ padding: '24px 32px 120px', color: '#fff' }}>
      <style>{`.circular-artist-item:focus-visible { outline: 2px solid #38bdf8; outline-offset: 4px; border-radius: 8px; }`}</style>
      <header className="artists-page-header" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em' }}>Artists</h1>
        <div className="artists-search-container" style={{ position: 'relative', maxWidth: 420 }}>
          <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search artists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 46px',
              borderRadius: 30,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#fff',
              fontSize: 14,
              outline: 'none',
              backdropFilter: 'blur(10px)',
              boxSizing: 'border-box',
            }}
          />
          {isSearching && (
            <Loader2 size={18} className="animate-spin" style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          )}
        </div>
      </header>

      {/* Error state */}
      {searchError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', marginBottom: 24, fontSize: 14 }}>
          <AlertCircle size={18} />
          <span>{searchError}</span>
        </div>
      )}

      {/* When searching */}
      {isSearchActive ? (
        <section className="artists-section">
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 20px' }}>
            {isSearching ? `Searching for "${debouncedQuery}"...` : `Search Results for "${debouncedQuery}"`}
          </h2>

          {isSearching ? (
            <div style={{ color: '#94a3b8', fontSize: 14 }}>Loading artist search results...</div>
          ) : searchResults.length > 0 ? (
            <div className="artists-circular-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 24 }}>
              {searchResults.map((artist) => (
                <button
                  key={artist.id}
                  className="circular-artist-item"
                  onClick={() => openArtist(artist)}
                  aria-label={`View artist ${artist.name}`}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: 10, userSelect: 'none', border: 'none', background: 'none', padding: 0, font: 'inherit', color: 'inherit' }}
                >
                  <div className="circular-avatar-wrap" style={{ width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', boxShadow: '0 6px 18px rgba(0,0,0,0.4)', background: 'rgba(255,255,255,0.05)', transition: 'transform 0.25s ease' }}>
                    <ArtistAvatar name={artist.name} image={artist.image} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                    {artist.name}
                  </span>
                </button>
              ))}
            </div>
          ) : !searchError ? (
            <div style={{ color: '#94a3b8', fontSize: 14, padding: '24px 0' }}>
              No artists found matching "{debouncedQuery}"
            </div>
          ) : null}
        </section>
      ) : (
        /* Normal Default View: Popular Artists & All Artists */
        <>
          {/* Section 1: Popular Artists */}
          {popularArtists.length > 0 && (
            <section className="artists-section" style={{ marginBottom: 44 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 20px' }}>Popular Artists</h2>
              <div className="artists-circular-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 24 }}>
                {popularArtists.map((artist) => (
                  <button
                    key={artist.id}
                    className="circular-artist-item"
                    onClick={() => openArtist(artist)}
                    aria-label={`View artist ${artist.name}`}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: 10, userSelect: 'none', border: 'none', background: 'none', padding: 0, font: 'inherit', color: 'inherit' }}
                  >
                    <div className="circular-avatar-wrap" style={{ width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', boxShadow: '0 6px 18px rgba(0,0,0,0.4)', background: 'rgba(255,255,255,0.05)', transition: 'transform 0.25s ease' }}>
                      <ArtistAvatar name={artist.name} image={artist.image} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                      {artist.name}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Section 2: All Artists */}
          <section className="artists-section">
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 20px' }}>All Artists</h2>
            {dedupedAllArtists.length > 0 ? (
              <div className="artists-circular-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 24 }}>
                {dedupedAllArtists.map((artist) => (
                  <button
                    key={artist.id}
                    className="circular-artist-item"
                    onClick={() => openArtist(artist)}
                    aria-label={`View artist ${artist.name}`}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: 10, userSelect: 'none', border: 'none', background: 'none', padding: 0, font: 'inherit', color: 'inherit' }}
                  >
                    <div className="circular-avatar-wrap" style={{ width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', boxShadow: '0 6px 18px rgba(0,0,0,0.4)', background: 'rgba(255,255,255,0.05)', transition: 'transform 0.25s ease' }}>
                      <ArtistAvatar name={artist.name} image={artist.image} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                      {artist.name}
                    </span>
                  </button>
                ))}
              </div>
            ) : loadingAll ? (
              <div style={{ color: '#94a3b8', fontSize: 14 }}>Loading artists...</div>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: 14 }}>No artists found</div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
