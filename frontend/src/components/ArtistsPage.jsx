import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, SlidersHorizontal, Grid, List as ListIcon, MoreVertical } from 'lucide-react';
import apiClient from '../api/client';
import artistsHeroBg from '../assets/artists_hero_bg.png';

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

const getFollowerCount = (name) => {
  if (name === 'Arijit Singh') return '12.4M';
  if (name === 'Atif Aslam') return '9.8M';
  if (name === 'Ed Sheeran') return '22.6M';
  if (name === 'Shreya Ghoshal') return '11.2M';
  if (name === 'The Weeknd') return '18.7M';
  if (name === 'Coldplay') return '16.1M';

  // Fallback hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const followersNum = Math.abs(hash % 90) / 10 + 1; // 1.0M to 9.9M
  return `${followersNum.toFixed(1)}M`;
};

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

function cacheKey(query, token, language) {
  return `${normalizeText(query).toLowerCase()}::${String(token || '')}::${String(language || '').toLowerCase()}`;
}

function readCache(query, token, language) {
  const entry = pageCache.get(cacheKey(query, token, language));
  if (!entry || entry.expiresAt <= Date.now()) {
    return null;
  }
  return entry;
}

function writeCache(query, token, language, payload) {
  pageCache.set(cacheKey(query, token, language), {
    expiresAt: Date.now() + CACHE_TTL_MS,
    ...payload,
  });
}

const ArtistCard = React.memo(function ArtistCard({ artist, onClick, isFollowing, onToggleFollow, viewMode = 'grid' }) {
  const [imageUrl, setImageUrl] = useState(artist.image || artist.thumbnail || FALLBACK_IMAGE);

  useEffect(() => {
    let mounted = true;
    apiClient.get(`/api/music/artist-image?name=${encodeURIComponent(artist.name)}`)
      .then(res => {
        if (mounted && res.data?.url) {
          setImageUrl(res.data.url);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [artist.name]);

  const handleFollowClick = (e) => {
    e.stopPropagation();
    onToggleFollow(artist);
  };

  const followerCount = getFollowerCount(artist.name);

  if (viewMode === 'list') {
    return (
      <div className="artists-page__list-row" onClick={() => onClick(artist)}>
        <img
          src={imageUrl}
          alt={artist.name}
          className="artists-page__list-img"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = FALLBACK_IMAGE;
          }}
        />
        <div className="artists-page__list-info">
          <strong>{artist.name}</strong>
          <span>{followerCount} followers</span>
        </div>
        <button 
          className={`artists-page__follow-btn ${isFollowing ? 'following' : ''}`}
          onClick={handleFollowClick}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
        <button className="artists-page__more-btn" onClick={(e) => e.stopPropagation()}>
          <MoreVertical size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="artists-page__card" onClick={() => onClick(artist)}>
      <div className="artists-page__image-wrap">
        <img
          src={imageUrl}
          alt={artist.name}
          loading="lazy"
          className="artists-page__image"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = FALLBACK_IMAGE;
          }}
        />
      </div>
      <span className="artists-page__name">{artist.name}</span>
      <span className="artists-page__followers">{followerCount} followers</span>
      <button 
        className={`artists-page__follow-btn ${isFollowing ? 'following' : ''}`}
        onClick={handleFollowClick}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </button>
    </div>
  );
});

function ArtistsPage({ embedded = false, user }) {
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

  // Redesign states:
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'following', 'popular', 'recent'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('popular'); // 'popular' or 'az'
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const [followedArtists, setFollowedArtists] = useState(() => {
    try {
      const saved = localStorage.getItem('music_app_followed_artists');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleFollow = (artist) => {
    const isFollowing = followedArtists.some(fa => fa.name.toLowerCase() === artist.name.toLowerCase());
    let updated;
    if (isFollowing) {
      updated = followedArtists.filter(fa => fa.name.toLowerCase() !== artist.name.toLowerCase());
    } else {
      updated = [...followedArtists, {
        id: artist.id,
        name: artist.name,
        image: artist.image,
        role: artist.language || 'Singer'
      }];
    }
    setFollowedArtists(updated);
    localStorage.setItem('music_app_followed_artists', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('followedArtistsUpdated'));
  };

  // Sync state if profile changes follows
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('music_app_followed_artists');
        setFollowedArtists(saved ? JSON.parse(saved) : []);
      } catch {}
    };
    window.addEventListener('followedArtistsUpdated', handleSync);
    return () => window.removeEventListener('followedArtistsUpdated', handleSync);
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedQuery(normalizeText(inputValue));
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timerId);
  }, [inputValue]);

  useEffect(() => {
    let mounted = true;

    const loadArtists = async () => {
      const cached = readCache(debouncedQuery, '', languageFilter);
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
            ...(languageFilter ? { language: languageFilter } : {}),
          },
        });

        const incoming = Array.isArray(response.data?.data) ? response.data.data : [];
        const normalized = Array.from(new Map(incoming.map((artist, index) => {
          const nextArtist = normalizeArtist(artist, index);
          return [nextArtist.id, nextArtist];
        })).values());

        const token = String(response.data?.nextPageToken || '');
        writeCache(debouncedQuery, '', languageFilter, { items: normalized, nextPageToken: token });
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
  }, [debouncedQuery, languageFilter]);

  useEffect(() => {
    if (!sentinelRef.current || !nextPageToken || isLoading || isLoadingMore || activeTab !== 'all') {
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
  }, [nextPageToken, isLoading, isLoadingMore, activeTab]);

  const filteredArtists = useMemo(() => {
    const normalized = normalizeText(inputValue).toLowerCase();
    return artists.filter((artist) => {
      return !normalized || artist.name.toLowerCase().includes(normalized);
    });
  }, [artists, inputValue]);

  const loadMore = useCallback(async () => {
    if (!nextPageToken || isLoading || isLoadingMore) {
      return;
    }

    const cached = readCache(debouncedQuery, nextPageToken, languageFilter);
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
          ...(languageFilter ? { language: languageFilter } : {}),
          pageToken: nextPageToken,
        },
      });

      const incoming = Array.isArray(response.data?.data) ? response.data.data : [];
      const normalized = Array.from(new Map(incoming.map((artist, index) => {
        const nextArtist = normalizeArtist(artist, index);
        return [nextArtist.id, nextArtist];
      })).values());

      const token = String(response.data?.nextPageToken || '');
      writeCache(debouncedQuery, nextPageToken, languageFilter, { items: normalized, nextPageToken: token });
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
  }, [debouncedQuery, languageFilter, isLoading, isLoadingMore, nextPageToken]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setDebouncedQuery(normalizeText(inputValue));
  };

  const openArtist = (artist) => {
    navigate(`/artist/${encodeURIComponent(artist.name)}`);
  };

  const displayedArtists = useMemo(() => {
    let list = [];
    if (activeTab === 'following') {
      list = followedArtists.map(fa => ({
        id: fa.id,
        name: fa.name,
        image: fa.image,
        language: fa.role || 'Artist',
        popularity: 100
      }));
    } else {
      list = filteredArtists;
    }

    if (activeTab === 'popular') {
      return [...list].sort((a, b) => b.popularity - a.popularity);
    }
    
    if (activeTab === 'recent') {
      return [...list].reverse();
    }

    return list;
  }, [activeTab, filteredArtists, followedArtists]);

  const sortedArtists = useMemo(() => {
    let list = [...displayedArtists];
    if (sortBy === 'az') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list.sort((a, b) => b.popularity - a.popularity);
    }
    return list;
  }, [displayedArtists, sortBy]);

  const popularSectionArtists = useMemo(() => {
    return [...artists].sort((a, b) => b.popularity - a.popularity).slice(0, 6);
  }, [artists]);

  if (isMobile) {
    return (
      <div className={`artists-page mobile-artists-page ${embedded ? 'artists-page--embedded' : ''}`}>
        {!embedded && (
          <div className="artists-mobile-header">
            <button className="artists-mobile-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
              <ArrowLeft size={24} />
            </button>
            <span className="artists-mobile-header-title">Artists</span>
            <button className="artists-mobile-filter-btn" aria-label="Filters">
              <SlidersHorizontal size={20} />
            </button>
          </div>
        )}

        {/* Hero Banner (microphone background) */}
        {!embedded && (
          <section 
            className="artists-page__hero mobile-hero"
            style={{ backgroundImage: `url(${artistsHeroBg})` }}
          >
            <div className="artists-page__hero-overlay" />
            <div className="artists-page__hero-content">
              <h2>Artists</h2>
              <p>Explore your favorite artists and their music</p>
            </div>
          </section>
        )}

        {/* Tab Selector pills */}
        <div className="artists-mobile-tabs">
          <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>All</button>
          <button className={activeTab === 'following' ? 'active' : ''} onClick={() => setActiveTab('following')}>Following</button>
          <button className={activeTab === 'popular' ? 'active' : ''} onClick={() => setActiveTab('popular')}>Popular</button>
          <button className={activeTab === 'recent' ? 'active' : ''} onClick={() => setActiveTab('recent')}>Recent</button>
        </div>

        {errorMessage ? <p className="artists-page__error">{errorMessage}</p> : null}
        {isLoading ? <p className="artists-page__status">Loading artists...</p> : null}

        <section className="artists-page__list">
          {sortedArtists.map((artist) => (
            <ArtistCard 
              key={artist.id} 
              artist={artist} 
              onClick={openArtist} 
              isFollowing={followedArtists.some(fa => fa.name.toLowerCase() === artist.name.toLowerCase())}
              onToggleFollow={toggleFollow}
              viewMode="list"
            />
          ))}
        </section>

        {!isLoading && sortedArtists.length === 0 && (
          <div className="artists-page__empty">No artists found</div>
        )}

        <div className="artists-page__footer">
          {nextPageToken && activeTab === 'all' && (
            <button type="button" className="artists-page__load-more" onClick={loadMore} disabled={isLoadingMore}>
              {isLoadingMore ? 'Loading...' : 'Load More'}
            </button>
          )}
        </div>

        <div ref={sentinelRef} className="artists-page__sentinel" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={`artists-page ${embedded ? 'artists-page--embedded' : ''}`}>
      {!embedded && (
        <section 
          className="artists-page__hero desktop-hero"
          style={{ backgroundImage: `url(${artistsHeroBg})` }}
        >
          <div className="artists-page__hero-overlay" />
          <div className="artists-page__hero-content">
            <h1 className="artists-title-large">Artists</h1>
            <p className="artists-subtitle-large">Explore your favorite artists and their music</p>
          </div>
        </section>
      )}

      {/* Control Bar (tabs, sort, view toggles) */}
      <div className="artists-control-bar">
        <div className="artists-desktop-tabs">
          <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>All Artists</button>
          <button className={activeTab === 'following' ? 'active' : ''} onClick={() => setActiveTab('following')}>Following</button>
          <button className={activeTab === 'popular' ? 'active' : ''} onClick={() => setActiveTab('popular')}>Popular</button>
          <button className={activeTab === 'recent' ? 'active' : ''} onClick={() => setActiveTab('recent')}>Recent</button>
        </div>

        <div className="artists-control-actions">
          <div className="artists-sort-dropdown">
            <span>Sort by:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="popular">Popular</option>
              <option value="az">A-Z</option>
            </select>
          </div>

          <div className="artists-view-toggles">
            <button 
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid View"
            >
              <Grid size={18} />
            </button>
            <button 
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="List View"
            >
              <ListIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      {errorMessage ? <p className="artists-page__error">{errorMessage}</p> : null}
      {isLoading ? <p className="artists-page__status">Loading artists...</p> : null}

      {/* Grid or List of Artists */}
      <section className={viewMode === 'grid' ? 'artists-page__grid' : 'artists-page__list-vertical'}>
        {sortedArtists.map((artist) => (
          <ArtistCard 
            key={artist.id} 
            artist={artist} 
            onClick={openArtist} 
            isFollowing={followedArtists.some(fa => fa.name.toLowerCase() === artist.name.toLowerCase())}
            onToggleFollow={toggleFollow}
            viewMode={viewMode}
          />
        ))}
      </section>

      {!isLoading && sortedArtists.length === 0 && (
        <div className="artists-page__empty">No artists found</div>
      )}

      {/* Popular Section at bottom of desktop */}
      {!embedded && activeTab === 'all' && popularSectionArtists.length > 0 && (
        <div className="popular-artists-section">
          <div className="popular-artists-header">
            <h3>Popular Artists</h3>
            <span className="view-all-link" onClick={() => setActiveTab('popular')}>View all</span>
          </div>
          <div className="popular-artists-row">
            {popularSectionArtists.map((artist) => {
              return (
                <div key={`popular-${artist.id}`} className="popular-artist-circle" onClick={() => openArtist(artist)}>
                  <div className="popular-artist-img-wrapper">
                    <img src={artist.image || FALLBACK_IMAGE} alt={artist.name} />
                  </div>
                  <strong>{artist.name}</strong>
                  <span>{getFollowerCount(artist.name)} followers</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="artists-page__footer">
        {nextPageToken && activeTab === 'all' && (
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
