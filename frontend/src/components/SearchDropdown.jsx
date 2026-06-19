import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock3, Flame, Heart, History, Mic2, MoreVertical, Music4, Play, Search as SearchIcon } from 'lucide-react';
import apiClient from '../api/client';
import '../styles/SearchDropdown2.css';


let searchDropdownCooldownUntil = 0;
const MIN_SEARCH_LENGTH = 2;
const DEBOUNCE_MS = 450;

const sanitizeQuery = (value) => {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=400&q=80';

function normalizeSong(song, index) {
  const id = song?.videoId || song?.id || `${song?.title || 'song'}-${index}`;

  return {
    ...song,
    id,
    videoId: id,
    title: song?.title || 'Untitled Track',
    artist: song?.channelTitle || song?.artist || 'Unknown Artist',
    album: song?.album || '',
    thumbnail: song?.thumbnail || song?.cover || song?.image || FALLBACK_IMAGE,
    source: song?.source || 'youtube',
  };
}

function loadRecentSearches() {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('recentSearches');
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 6) : [];
  } catch {
    return [];
  }
}

function mapUnique(items, keyFn, mapFn, limit) {
  const store = new Map();
  items.forEach((item, index) => {
    const key = keyFn(item, index);
    if (!key || store.has(key)) return;
    store.set(key, mapFn(item, index));
  });
  return Array.from(store.values()).slice(0, limit);
}

function buildSections(rawItems) {
  const songs = rawItems.map(normalizeSong);

  const topResult = songs.slice(0, 4).map((song) => ({
    ...song,
    subtitle: `${song.artist}${song.album ? ` · ${song.album}` : ''}`,
    type: 'song',
  }));

  const albums = mapUnique(
    songs,
    (song) => `${song.album || `${song.artist} Collection`}::${song.artist}`,
    (song, index) => ({
      id: `album-${song.id}-${index}`,
      title: song.album || `${song.artist} Collection`,
      subtitle: `${song.artist}`,
      thumbnail: song.thumbnail,
      query: `${song.album || song.artist} album`,
      type: 'album',
    }),
    3
  );

  const artists = mapUnique(
    songs,
    (song) => song.artist,
    (song, index) => ({
      id: `artist-${song.artist}-${index}`,
      title: song.artist,
      subtitle: 'Artist',
      thumbnail: song.thumbnail,
      query: song.artist,
      type: 'artist',
    }),
    3
  );

  const songItems = songs.slice(0, 3).map((song) => ({
    ...song,
    subtitle: song.artist,
    query: `${song.title} ${song.artist}`,
    type: 'song',
  }));

  const playlistCandidates = songs
    .filter((song) => /playlist|mix|session/i.test(song.title))
    .map((song, index) => ({
      id: `playlist-${song.id}-${index}`,
      title: song.title,
      subtitle: `Playlist · ${song.artist}`,
      thumbnail: song.thumbnail,
      query: `${song.title} playlist`,
      type: 'song',
    }));

  const playlists = playlistCandidates.length
    ? playlistCandidates.slice(0, 3)
    : artists.slice(0, 3).map((artist, index) => ({
        id: `playlist-fallback-${artist.id}-${index}`,
        title: `${artist.title} Mix`,
        subtitle: 'Playlist',
        thumbnail: artist.thumbnail,
        query: `${artist.title} playlist`,
        type: 'artist',
      }));

  const podcastCandidates = songs
    .filter((song) => /podcast|episode|talk|interview/i.test(song.title))
    .map((song, index) => ({
      id: `podcast-${song.id}-${index}`,
      title: song.title,
      subtitle: `Podcast · ${song.artist}`,
      thumbnail: song.thumbnail,
      query: `${song.title} podcast`,
      type: 'song',
    }));

  const podcasts = podcastCandidates.length
    ? podcastCandidates.slice(0, 3)
    : artists.slice(0, 3).map((artist, index) => ({
        id: `podcast-fallback-${artist.id}-${index}`,
        title: `${artist.title} Talks`,
        subtitle: 'Podcast',
        thumbnail: artist.thumbnail,
        query: `${artist.title} podcast`,
        type: 'artist',
      }));

  return {
    topResult,
    albums,
    songs: songItems,
    artists,
    playlists,
    podcasts,
  };
}

/* ─── Compact list section ─── */
function CompactListSection({ title, items, onSelect, showViewAll, onViewAll, icon: Icon, kind = 'square' }) {
  if (!items.length) return null;

  return (
    <section className={`sd2-section sd2-section--${kind}`}>
      <div className="sd2-section__head">
        <h4 className="sd2-section__title">{title}</h4>
        {showViewAll && (
          <button type="button" className="sd2-viewall" onClick={onViewAll}>
            View All
          </button>
        )}
      </div>
      <div className="sd2-section__list">
        {items.slice(0, 3).map((item) => (
          <button
            key={item.id}
            type="button"
            className="sd2-row"
            onClick={() => onSelect(item)}
          >
            <img src={item.thumbnail} alt={item.title} loading="lazy" className="sd2-row__img" />
            <div className="sd2-row__meta">
              <span className="sd2-row__name">{item.title}</span>
              <span className="sd2-row__sub">{item.subtitle}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ─── Top Result panel ─── */
function TopResultPanel({ item, onSelect, onPlay, onLike, onMore }) {
  if (!item) return null;

  const handleCardKeyDown = (event) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(item);
    }
  };

  const stopProp = (event, cb) => {
    event.stopPropagation();
    cb?.(item);
  };

  return (
    <section className="sd2-section sd2-section--top">
      <div className="sd2-section__head">
        <h4 className="sd2-section__title">Top Result</h4>
      </div>
      <div
        role="button"
        tabIndex={0}
        className="sd2-top-card"
        onClick={() => onSelect(item)}
        onKeyDown={handleCardKeyDown}
      >
        <span className="sd2-top-card__bg" style={{ backgroundImage: `url(${item.thumbnail})` }} />
        <img src={item.thumbnail} alt={item.title} loading="lazy" className="sd2-top-card__img" />
        <div className="sd2-top-card__info">
          <span className="sd2-top-card__label">Song</span>
          <strong className="sd2-top-card__name">{item.title}</strong>
          <small className="sd2-top-card__sub">{item.subtitle}</small>
          <div className="sd2-top-card__actions">
            <button
              type="button"
              className="sd2-action sd2-action--play"
              onClick={(e) => stopProp(e, onPlay)}
              aria-label={`Play ${item.title}`}
            >
              <Play size={14} fill="currentColor" strokeWidth={0} />
            </button>
            <button
              type="button"
              className="sd2-action sd2-action--like"
              onClick={(e) => stopProp(e, onLike)}
              aria-label={`Like ${item.title}`}
            >
              <Heart size={14} />
            </button>
            <button
              type="button"
              className="sd2-action"
              onClick={(e) => stopProp(e, onMore)}
              aria-label={`Queue ${item.title}`}
            >
              <MoreVertical size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Main Dropdown ─── */
function SearchDropdown({ isOpen, query, onClose, onClear, onSearchSelect, onPlayTrack, onLikeTrack, onMoreTrack }) {
  const [rawResults, setRawResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);
  const [trendingResults, setTrendingResults] = useState([]);
  const dropdownRef = useRef(null);
  const lastRequestKeyRef = useRef('');

  const sections = useMemo(() => buildSections(rawResults), [rawResults]);

  useEffect(() => {
    if (!isOpen) return undefined;

    setRecentSearches(loadRecentSearches());

    let cancelled = false;
    const controller = new AbortController();

    const loadTrending = async () => {
      try {
        const response = await apiClient.get('/api/music/trending', {
          params: { limit: 6 },
          signal: controller.signal,
        });

        const results = Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
            ? response.data
            : [];

        if (!cancelled) {
          setTrendingResults(results.map(normalizeSong));
        }
      } catch {
        if (!cancelled) {
          setTrendingResults([]);
        }
      }
    };

    loadTrending();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isOpen]);

  useEffect(() => {
    const trimmedQuery = sanitizeQuery(query);

    if (!isOpen) {
      setRawResults([]);
      setIsLoading(false);
      setNoticeMessage('');
      lastRequestKeyRef.current = '';
      return undefined;
    }

    if (!trimmedQuery) {
      setRawResults([]);
      setIsLoading(false);
      setNoticeMessage('');
      lastRequestKeyRef.current = '';
      return undefined;
    }

    if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
      setRawResults([]);
      setIsLoading(false);
      setNoticeMessage(`Type at least ${MIN_SEARCH_LENGTH} characters`);
      lastRequestKeyRef.current = '';
      return undefined;
    }

    const normalizedRequestKey = trimmedQuery.toLowerCase();
    if (lastRequestKeyRef.current === normalizedRequestKey) {
      return undefined;
    }

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
        const response = await apiClient.get('/api/search', {
          params: {
            q: trimmedQuery,
            limit: 10,
          },
          signal: controller.signal,
        });

        const results = Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
            ? response.data
            : [];

        setRawResults(results);
        if (!results.length) {
          setNoticeMessage(String(response.data?.warning || '').trim());
        }
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
  }, [isOpen, query]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handlePointerDown);
    }

    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectItem = (item) => {
    onSearchSelect?.({
      query: item.query || item.title,
      title: item.title,
      type: item.type || 'song',
    });
  };

  const onViewAll = () => {
    onSearchSelect?.({ query: query.trim() });
  };

  const browseSections = buildSections(trendingResults);
  const activeSections = query.trim() ? sections : browseSections;
  const hasAny =
    activeSections.topResult.length ||
    activeSections.albums.length ||
    activeSections.songs.length ||
    activeSections.artists.length ||
    activeSections.playlists.length ||
    activeSections.podcasts.length;

  const hasBrowseState = !query.trim() && (recentSearches.length > 0 || trendingResults.length > 0);

  return (
    <div ref={dropdownRef} className="sd2" role="listbox" aria-label="Search results">
      {isLoading ? (
        <div className="sd2__loading">
          <span /><span /><span />
        </div>
      ) : (
        <div className="sd2__body">
          {query.trim() ? (
            <div className="sd2__grid">
              <TopResultPanel
                item={sections.topResult[0]}
                onSelect={selectItem}
                onPlay={onPlayTrack}
                onLike={onLikeTrack}
                onMore={onMoreTrack}
              />
              <CompactListSection
                title="Albums"
                icon={Music4}
                items={sections.albums}
                onSelect={selectItem}
                showViewAll
                onViewAll={onViewAll}
              />
              <CompactListSection
                title="Songs"
                icon={SearchIcon}
                items={sections.songs}
                onSelect={selectItem}
                showViewAll
                onViewAll={onViewAll}
              />
              <CompactListSection
                title="Artists"
                icon={Mic2}
                kind="artist"
                items={sections.artists}
                onSelect={selectItem}
                showViewAll
                onViewAll={onViewAll}
              />
              <CompactListSection
                title="Playlists"
                icon={Clock3}
                items={sections.playlists}
                onSelect={selectItem}
                showViewAll
                onViewAll={onViewAll}
              />
              <CompactListSection
                title="Podcasts"
                icon={History}
                items={sections.podcasts}
                onSelect={selectItem}
                showViewAll
                onViewAll={onViewAll}
              />
            </div>
          ) : (
            <div className="sd2__grid sd2__grid--browse">
              <CompactListSection
                title="Recent Searches"
                icon={History}
                items={recentSearches.map((item, index) => ({
                  id: `recent-${index}-${item}`,
                  title: item,
                  subtitle: 'Recent search',
                  thumbnail: FALLBACK_IMAGE,
                  query: item,
                  type: 'song',
                }))}
                onSelect={selectItem}
                showViewAll={false}
              />
              <CompactListSection
                title="Trending Songs"
                icon={Flame}
                items={browseSections.songs}
                onSelect={selectItem}
                showViewAll={false}
              />
              <CompactListSection
                title="Trending Now"
                icon={Flame}
                items={browseSections.topResult}
                onSelect={selectItem}
                showViewAll={false}
              />
              <CompactListSection
                title="Popular Artists"
                icon={Mic2}
                kind="artist"
                items={browseSections.artists}
                onSelect={selectItem}
                showViewAll={false}
              />
              <CompactListSection
                title="Albums"
                icon={Music4}
                items={browseSections.albums}
                onSelect={selectItem}
                showViewAll={false}
              />
              <CompactListSection
                title="Popular Playlists"
                icon={Clock3}
                items={browseSections.playlists}
                onSelect={selectItem}
                showViewAll={false}
              />
            </div>
          )}

          {!hasAny && (
            <div className="sd2__empty">
              {noticeMessage || (hasBrowseState ? 'Start typing to search across songs, artists, and albums.' : 'No results found')}
            </div>
          )}

          {hasAny && noticeMessage && (
            <div className="sd2__empty">{noticeMessage}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchDropdown;
