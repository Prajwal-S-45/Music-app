import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Album,
  ChevronRight,
  Clock3,
  Disc3,
  Film,
  Flame,
  History,
  Mic2,
  Play,
  Podcast,
  Search as SearchIcon,
  Sparkles,
} from 'lucide-react';
import apiClient from '../api/client';
import '../styles/SearchDropdown2.css';

let searchDropdownCooldownUntil = 0;
const MIN_SEARCH_LENGTH = 2;
const DEBOUNCE_MS = 300;
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=400&q=80';

const SECTION_CONFIG = [
  { key: 'topResults', title: 'Top Results', type: 'songs', icon: Sparkles, limit: 3, source: 'songs', showViewAll: false },
  { key: 'albums', title: 'Albums', type: 'albums', icon: Album, limit: 3 },
  { key: 'artists', title: 'Artists', type: 'artists', icon: Mic2, roundImage: true, limit: 3 },
  { key: 'playlists', title: 'Playlists', type: 'playlists', icon: Disc3, limit: 3 },
  { key: 'podcasts', title: 'Podcasts', type: 'podcasts', icon: Podcast, limit: 3 },
  { key: 'movies', title: 'Movies', type: 'movies', icon: Film, limit: 3 },
];

const emptyGrouped = {
  query: '',
  topResults: [],
  albums: [],
  songs: [],
  artists: [],
  playlists: [],
  podcasts: [],
  movies: [],
};

const sanitizeQuery = (value) => String(value || '')
  .replace(/[\u0000-\u001F\u007F]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const getItemTitle = (item) => item?.title || item?.name || 'Untitled';
const getItemImage = (item) => item?.thumbnail || item?.cover || item?.image || item?.photo || item?.poster || FALLBACK_IMAGE;

const formatDuration = (seconds) => {
  const value = Number(seconds) || 0;
  if (!value) return 'Preview';
  const mins = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const itemSubtitle = (item) => {
  switch (item?.type) {
    case 'song':
      return [item.movieName || item.album, item.singer || item.artist, formatDuration(item.duration)].filter(Boolean).join(' | ');
    case 'album':
      return [item.year, item.composer, item.language].filter(Boolean).join(' | ') || 'Album';
    case 'artist':
      return item.profession || 'Artist';
    case 'playlist':
      return [`${item.songCount || 0} songs`, item.creator].filter(Boolean).join(' | ') || 'Playlist';
    case 'podcast':
      return [item.season, item.host].filter(Boolean).join(' | ') || 'Podcast';
    case 'movie':
      return [item.year, item.language, `${item.songCount || 0} songs`].filter(Boolean).join(' | ');
    default:
      return item?.subtitle || item?.artist || item?.type || 'Result';
  }
};

const normalizeGroupedPayload = (payload) => {
  const data = payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
    ? payload.data
    : payload;

  return {
    ...emptyGrouped,
    ...data,
    topResults: Array.isArray(data?.topResults) ? data.topResults : [],
    albums: Array.isArray(data?.albums) ? data.albums : [],
    songs: Array.isArray(data?.songs) ? data.songs : [],
    artists: Array.isArray(data?.artists) ? data.artists : [],
    playlists: Array.isArray(data?.playlists) ? data.playlists : [],
    podcasts: Array.isArray(data?.podcasts) ? data.podcasts : [],
    movies: Array.isArray(data?.movies) ? data.movies : [],
  };
};

function SearchSkeleton() {
  return (
    <div className="sd2__grid">
      {SECTION_CONFIG.map((section) => (
        <section key={section.key} className="sd2-section">
          <div className="sd2-skeleton-title" />
          {[0, 1, 2].map((item) => <div key={item} className="sd2-skeleton-row" />)}
        </section>
      ))}
    </div>
  );
}

function SearchEmptyState({ message }) {
  return (
    <div className="sd2__empty">
      <SearchIcon size={22} />
      <strong>No results found</strong>
      <span>{message || 'Try a song, artist, album, playlist, podcast, or movie.'}</span>
    </div>
  );
}

const FALLBACK_ARTIST_IMAGE = null;

function SearchDropdownRowImage({ item, isRound }) {
  const initialSrc = item.type === 'artist'
    ? (item.photo && !item.photo.includes('unsplash.com') ? item.photo : (item.image && !item.image.includes('unsplash.com') ? item.image : null))
    : getItemImage(item);

  const [src, setSrc] = useState(initialSrc);

  useEffect(() => {
    setSrc(initialSrc);
  }, [initialSrc, item.id]);

  useEffect(() => {
    if (item.type === 'artist') {
      if (src && !src.includes('unsplash.com')) return;
      const artistName = item.name || item.title || getItemTitle(item);
      if (!artistName) return;

      let isMounted = true;
      apiClient
        .get(`/api/music/artist-image?name=${encodeURIComponent(artistName)}`)
        .then((res) => {
          if (isMounted && res.data?.url) {
            setSrc(res.data.url);
          }
        })
        .catch(() => {});

      return () => {
        isMounted = false;
      };
    }
  }, [item, src]);

  return (
    <img
      src={src || (item.type === 'artist' ? FALLBACK_ARTIST_IMAGE : FALLBACK_IMAGE)}
      alt={getItemTitle(item)}
      loading="lazy"
      className={`sd2-row__img ${isRound ? 'sd2-row__img--round' : ''}`}
    />
  );
}

function SearchSection({ section, items, activeId, onSelect, onHover, onViewAll }) {
  if (!items.length) return null;
  const Icon = section.icon;

  return (
    <section className="sd2-section">
      <div className="sd2-section__head">
        <h4 className="sd2-section__title"><Icon size={14} /> {section.title}</h4>
        {section.showViewAll !== false && (
          <button type="button" className="sd2-viewall" onMouseDown={(event) => event.preventDefault()} onClick={() => onViewAll(section.type)}>
            View All <ChevronRight size={12} />
          </button>
        )}
      </div>
      <div className="sd2-section__list">
        {items.slice(0, section.limit || 3).map((item, index) => {
          const id = `${section.key}-${item.id || getItemTitle(item)}-${index}`;
          const isActive = activeId === id;
          return (
            <button
              key={id}
              type="button"
              data-result-id={id}
              className={`sd2-row ${isActive ? 'is-active' : ''}`}
              onMouseEnter={() => onHover(id)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(item, section.type)}
            >
              <SearchDropdownRowImage item={item} isRound={section.roundImage} />
              <div className="sd2-row__meta">
                <span className="sd2-row__name">{getItemTitle(item)}</span>
                <span className="sd2-row__sub">{itemSubtitle(item)}</span>
              </div>
              {item.type === 'song' && <Play size={13} className="sd2-row__quick" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SearchRecent({ recentSearches, onSelect, onRemove, onClearAll }) {
  if (!recentSearches.length) return null;
  return (
    <section className="sd2-browse-panel">
      <div className="sd2-section__head">
        <h4 className="sd2-section__title"><History size={16} /> Recent Searches</h4>
        <button
          type="button"
          className="sd2-clear-all-btn"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClearAll}
        >
          Clear All
        </button>
      </div>
      <div className="sd2-chip-list">
        {recentSearches.slice(0, 10).map((item) => (
          <div key={item} className="sd2-recent-chip" title={item}>
            <button
              type="button"
              className="sd2-recent-chip__btn"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect({ title: item, query: item }, 'songs')}
            >
              <Clock3 size={14} className="sd2-recent-chip__icon" />
              <span className="sd2-recent-chip__text">{item}</span>
            </button>
            <button
              type="button"
              className="sd2-recent-chip__del"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onRemove(item)}
              aria-label={`Remove ${item}`}
            >
              ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¢
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function SearchTrending({ trendingResults, onSelect }) {
  const items = trendingResults.slice(0, 8);
  if (!items.length) return null;
  return (
    <section className="sd2-browse-panel sd2-browse-panel--wide">
      <div className="sd2-section__head">
        <h4 className="sd2-section__title"><Flame size={16} /> Trending Searches</h4>
      </div>
      <div className="sd2-trending-grid">
        {items.map((item, index) => (
          <button
            key={`${item.id || item.title}-${index}`}
            type="button"
            className="sd2-trending-card"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(item, 'songs')}
          >
            <div className="sd2-trending-art">
              <img src={getItemImage(item)} alt={getItemTitle(item)} loading="lazy" />
              <div className="sd2-trending-art__overlay">
                <Play size={13} fill="currentColor" strokeWidth={0} />
              </div>
            </div>
            <div className="sd2-trending-info">
              <span className="sd2-trending-info__title">{getItemTitle(item)}</span>
              <span className="sd2-trending-info__artist">{item.artist || 'Popular Song'}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function loadRecentSearches() {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('recentSearches');
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 8) : [];
  } catch {
    return [];
  }
}

function SearchDropdown({ isOpen, query, onClose, onSearchSelect, onPlayTrack }) {
  const [groupedResults, setGroupedResults] = useState(emptyGrouped);
  const [isLoading, setIsLoading] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);
  const [trendingResults, setTrendingResults] = useState([]);
  const [activeId, setActiveId] = useState('');
  const dropdownRef = useRef(null);
  const lastRequestKeyRef = useRef('');

  const trimmedQuery = sanitizeQuery(query);

  const handleRemoveRecent = useCallback((term) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((s) => s !== term);
      try {
        localStorage.setItem('recentSearches', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  }, []);

  const handleClearAllRecent = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('recentSearches');
    } catch (err) {
      console.error(err);
    }
  }, []);

  const visibleSections = useMemo(() => SECTION_CONFIG.map((section) => ({
    ...section,
    items: Array.isArray(groupedResults[section.source || section.key]) ? groupedResults[section.source || section.key].slice(0, section.limit || 3) : [],
  })).filter((section) => section.items.length), [groupedResults]);

  const flatItems = useMemo(() => visibleSections.flatMap((section) => section.items.map((item, index) => ({
    id: `${section.key}-${item.id || getItemTitle(item)}-${index}`,
    item,
    type: section.type,
  }))), [visibleSections]);

  useEffect(() => {
    if (!isOpen) return undefined;
    setRecentSearches(loadRecentSearches());

    let cancelled = false;
    const controller = new AbortController();
    apiClient.get('/api/music/trending', { params: { limit: 8 }, signal: controller.signal })
      .then((response) => {
        if (cancelled) return;
        const results = Array.isArray(response.data?.data) ? response.data.data : [];
        setTrendingResults(results.map((song, index) => ({
          ...song,
          id: song.id || `trending-${index}`,
          type: 'song',
          title: song.title || 'Trending song',
          artist: song.artist || 'Popular now',
          thumbnail: song.thumbnail || song.cover || song.image || FALLBACK_IMAGE,
        })));
      })
      .catch(() => {
        if (!cancelled) setTrendingResults([]);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setGroupedResults(emptyGrouped);
      setIsLoading(false);
      setNoticeMessage('');
      setActiveId('');
      lastRequestKeyRef.current = '';
      return undefined;
    }

    if (!trimmedQuery) {
      setGroupedResults(emptyGrouped);
      setIsLoading(false);
      setNoticeMessage('');
      setActiveId('');
      lastRequestKeyRef.current = '';
      return undefined;
    }

    if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
      setGroupedResults(emptyGrouped);
      setIsLoading(false);
      setNoticeMessage(`Type at least ${MIN_SEARCH_LENGTH} characters`);
      setActiveId('');
      return undefined;
    }

    const normalizedRequestKey = trimmedQuery.toLowerCase();
    if (lastRequestKeyRef.current === normalizedRequestKey) return undefined;

    if (Date.now() < searchDropdownCooldownUntil) {
      setIsLoading(false);
      setNoticeMessage('Rate limit active. Please wait a few seconds.');
      return undefined;
    }

    const controller = new AbortController();
    const timerId = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        setNoticeMessage('');
        lastRequestKeyRef.current = normalizedRequestKey;
        const savedLangs = localStorage.getItem('music_pref_languages');
        const languages = savedLangs ? JSON.parse(savedLangs) : [];
        const primaryLanguage = languages[0] || 'Hindi';

        const response = await apiClient.get('/api/search', {
          params: { q: trimmedQuery, limit: 12, grouped: true, language: primaryLanguage },
          signal: controller.signal,
        });
        setGroupedResults(normalizeGroupedPayload(response.data));
        setNoticeMessage(String(response.data?.warning || '').trim());
      } catch (error) {
        if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
          lastRequestKeyRef.current = '';
          if (error.response?.status === 429) {
            searchDropdownCooldownUntil = Date.now() + 12000;
            setNoticeMessage('Too many requests. Try again in a moment.');
          } else {
            setNoticeMessage('Search temporarily unavailable.');
          }
        }
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timerId);
    };
  }, [isOpen, trimmedQuery]);

  useEffect(() => {
    if (!flatItems.length) {
      setActiveId('');
      return;
    }
    setActiveId((current) => current || flatItems[0].id);
  }, [flatItems]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) onClose?.();
    };
    if (isOpen) document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen, onClose]);

  const selectItem = useCallback((item, type) => {
    const searchType = item.type === 'movie' ? 'movies' : type;
    const nextQuery = item.type === 'movie' ? getItemTitle(item) : (item.query || getItemTitle(item));
    if (item.type === 'song') onPlayTrack?.(item);
    onSearchSelect?.({ query: nextQuery, title: getItemTitle(item), type: searchType, item });
  }, [onPlayTrack, onSearchSelect]);

  const navigate = useNavigate();

  const viewAll = (type) => {
    if (!trimmedQuery) return;
    onClose?.();
    const targetCategory = type === 'all' ? 'songs' : type;
    navigate(`/search/${targetCategory}?q=${encodeURIComponent(trimmedQuery)}`);
  };

  useEffect(() => {
    if (!isOpen || !flatItems.length) return undefined;

    const handleGlobalKeyDown = (event) => {
      const currentIndex = flatItems.findIndex((item) => item.id === activeId);

      if (event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey)) {
        event.preventDefault();
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % flatItems.length;
        setActiveId(flatItems[nextIndex].id);
      } else if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
        event.preventDefault();
        const prevIndex = currentIndex === -1 ? flatItems.length - 1 : (currentIndex - 1 + flatItems.length) % flatItems.length;
        setActiveId(flatItems[prevIndex].id);
      } else if (event.key === 'Enter') {
        if (currentIndex !== -1) {
          event.preventDefault();
          selectItem(flatItems[currentIndex].item, flatItems[currentIndex].type);
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, flatItems, activeId, selectItem, onClose]);

  if (!isOpen) return null;

  const hasAny = flatItems.length > 0;
  const showBrowse = !trimmedQuery;

  return (
    <div ref={dropdownRef} className="sd2" role="listbox" aria-label="Search results" tabIndex={-1}>
      <div className="sd2__body">
        {showBrowse ? (
          <div className="sd2__browse">
            <SearchRecent
              recentSearches={recentSearches}
              onSelect={selectItem}
              onRemove={handleRemoveRecent}
              onClearAll={handleClearAllRecent}
            />
            <SearchTrending trendingResults={trendingResults} onSelect={selectItem} />
          </div>
        ) : isLoading ? (
          <SearchSkeleton />
        ) : hasAny ? (
          <div className="sd2__grid">
            {SECTION_CONFIG.map((section) => (
              <SearchSection
                key={section.key}
                section={section}
                items={groupedResults[section.source || section.key] || []}
                activeId={activeId}
                onHover={setActiveId}
                onSelect={selectItem}
                onViewAll={viewAll}
              />
            ))}
          </div>
        ) : (
          <SearchEmptyState message={noticeMessage} />
        )}

        {hasAny && noticeMessage ? <div className="sd2__notice">{noticeMessage}</div> : null}
        <div className="sd2__kbd-hint">
          <span><kbd>Up</kbd><kbd>Down</kbd> to navigate</span>
          <span className="sd2__kbd-dot">|</span>
          <span><kbd>Enter</kbd> to select</span>
          <span className="sd2__kbd-dot">|</span>
          <span><kbd>Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}

export default SearchDropdown;
