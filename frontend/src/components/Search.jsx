import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import apiClient from '../api/client';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import RecentSearches from './RecentSearches';
import '../styles/Search.css';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';
const MIN_SEARCH_LENGTH = 2;
const DEBOUNCE_MS = 400;

const sanitizeQuery = (value) => {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

function Search({ token, onPlayTrack, onQueueTrack, onLikeUpdate }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchType, setSearchType] = useState('song');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [likedSongIds, setLikedSongIds] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [status, setStatus] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);
  const [triggerImmediateSearch, setTriggerImmediateSearch] = useState(0);

  const lastRequestKeyRef = useRef('');

  const location = useLocation();
  const navigate = useNavigate();

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (error) {
        console.error('Error parsing recent searches:', error);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((searchTerm) => {
    const trimmed = String(searchTerm || '').trim();
    if (!trimmed) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== trimmed);
      const updated = [trimmed, ...filtered].slice(0, 10); // Keep last 10
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Clear specific recent search
  const clearRecentSearch = useCallback((searchTerm) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((s) => s !== searchTerm);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const fetchLikedSongs = useCallback(async () => {
    if (!token) return;

    try {
      const response = await apiClient.get('/api/music/liked', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const likedSongs = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];
      setLikedSongIds(likedSongs.map((song) => song.id));
    } catch (error) {
      console.error('Error fetching liked songs for search:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchLikedSongs();
  }, [fetchLikedSongs]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextQuery = params.get('q') || '';
    const nextType = String(params.get('type') || 'song').toLowerCase();
    if (nextQuery !== query) {
      setQuery(nextQuery);
    }
    if (nextType !== searchType) {
      setSearchType(nextType);
    }
  }, [location.search, query, searchType]);

  useEffect(() => {
    const sanitized = sanitizeQuery(query);

    if (!sanitized || sanitized.length < MIN_SEARCH_LENGTH) {
      setDebouncedQuery('');
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setDebouncedQuery(sanitized);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timerId);
  }, [query]);

  const searchSongs = useCallback(async (searchValue, activeType = 'song', options = {}) => {
    const { force = false } = options;
    const trimmed = sanitizeQuery(searchValue);
    const normalizedType = String(activeType || 'song').toLowerCase();
    const requestKey = `${normalizedType}::${trimmed.toLowerCase()}`;

    if (!trimmed) {
      setResults([]);
      setSearched(false);
      setErrorMessage('');
      setWarningMessage('');
      return;
    }

    if (trimmed.length < MIN_SEARCH_LENGTH) {
      setResults([]);
      setSearched(false);
      setErrorMessage('');
      setWarningMessage(`Type at least ${MIN_SEARCH_LENGTH} characters to search.`);
      return;
    }

    if (!force && lastRequestKeyRef.current === requestKey) {
      return;
    }

    lastRequestKeyRef.current = requestKey;

    try {
      setIsLoading(true);
      setErrorMessage('');
      setWarningMessage('');

      const response = await apiClient.get('/api/search', {
        params: {
          q: trimmed,
          type: normalizedType,
          limit: 10,
        },
      });

      const rawResults = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];

      const nextResults = rawResults.map((song) => ({
        ...song,
        id: song.videoId || song.id,
        videoId: song.videoId || song.id,
        title: song.title || 'Untitled Track',
        artist: song.channelTitle || song.artist || 'Unknown Channel',
        album: song.album || null,
        cover: song.thumbnail || song.cover || song.image || FALLBACK_IMAGE,
        duration: Number(song.duration) || 0,
        source: 'youtube',
        playable: Boolean(song.videoId || song.id),
      }));

      setResults(nextResults);
      setSearched(true);
      setStatus('');
      setWarningMessage(String(response.data?.warning || '').trim());
      saveRecentSearch(trimmed);
    } catch (error) {
      console.error('Error searching:', error);
      setResults([]);
      setSearched(true);
      setWarningMessage('');
      if (error.response?.status === 429) {
        setErrorMessage('Search is temporarily rate-limited. Please wait a few seconds and try again.');
      } else {
        setErrorMessage('Could not fetch songs right now. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [saveRecentSearch]);

  useEffect(() => {
    const runDebouncedSearch = async () => {
      if (!debouncedQuery) {
        setResults([]);
        setSearched(false);
        setIsLoading(false);
        setErrorMessage('');
        setWarningMessage('');
        return;
      }

      await searchSongs(debouncedQuery, searchType, { force: false });
    };

    runDebouncedSearch();
  }, [debouncedQuery, searchSongs, searchType]);

  useEffect(() => {
    if (!triggerImmediateSearch) {
      return;
    }

    const sanitized = sanitizeQuery(query);
    if (!sanitized || sanitized.length < MIN_SEARCH_LENGTH) {
      return;
    }

    searchSongs(sanitized, searchType, { force: true });
  }, [triggerImmediateSearch, query, searchType, searchSongs]);

  const handleSearch = useCallback((event) => {
    event.preventDefault();
    const trimmed = sanitizeQuery(query);
    if (!trimmed) {
      lastRequestKeyRef.current = '';
      navigate('/search', { replace: true });
      return;
    }

    if (trimmed.length < MIN_SEARCH_LENGTH) {
      setWarningMessage(`Type at least ${MIN_SEARCH_LENGTH} characters to search.`);
      return;
    }

    setQuery(trimmed);
    setDebouncedQuery(trimmed);
    setTriggerImmediateSearch((value) => value + 1);
    navigate(`/search?q=${encodeURIComponent(trimmed)}&type=${encodeURIComponent(searchType)}`, { replace: true });
  }, [navigate, query, searchType]);

  const handleInputChange = useCallback((event) => {
    const nextValue = event.target.value;
    setQuery(nextValue);

    const trimmed = sanitizeQuery(nextValue);
    if (!trimmed) {
      lastRequestKeyRef.current = '';
      navigate('/search', { replace: true });
    }
  }, [navigate]);

  const playTrack = useCallback((song) => {
    onPlayTrack?.(song);
    setStatus(`Playing ${song.title}`);
  }, [onPlayTrack]);

  const likeTrack = useCallback(async (song) => {
    if (!token) {
      setStatus('Login required to like songs.');
      return;
    }

    try {
      await apiClient.post(
        '/api/music/like',
        { songId: song.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLikedSongIds((current) => [...new Set([...current, song.id])]);
      setStatus(`Liked ${song.title}`);
      onLikeUpdate?.();
    } catch (error) {
      if (error.response?.status === 400) {
        setStatus('Song already liked.');
        return;
      }

      setStatus('Could not like this song right now.');
    }
  }, [onLikeUpdate, token]);

  const queueTrack = useCallback((song) => {
    onQueueTrack?.(song);
    setStatus(`${song.title} added to queue`);
  }, [onQueueTrack]);

  const groupedResults = useMemo(() => {
    // Filter and prioritize songs by relevance
    const playableSongs = results.filter((song) => song.playable);
    
    // Sort by relevance: exact title match > title contains > artist match
    const sortedSongs = [...playableSongs].sort((a, b) => {
      const aTitle = a.title?.toLowerCase() || '';
      const bTitle = b.title?.toLowerCase() || '';
      const aArtist = a.artist?.toLowerCase() || '';
      const bArtist = b.artist?.toLowerCase() || '';
      const queryLower = debouncedQuery.toLowerCase();

      // Exact title match gets highest priority
      const aExactTitle = aTitle === queryLower ? 2 : 0;
      const bExactTitle = bTitle === queryLower ? 2 : 0;

      // Title starts with query
      const aStartsTitle = aTitle.startsWith(queryLower) ? 1.5 : 0;
      const bStartsTitle = bTitle.startsWith(queryLower) ? 1.5 : 0;

      // Title contains query
      const aContainsTitle = aTitle.includes(queryLower) ? 1 : 0;
      const bContainsTitle = bTitle.includes(queryLower) ? 1 : 0;

      // Artist match
      const aArtistMatch = aArtist.includes(queryLower) ? 0.5 : 0;
      const bArtistMatch = bArtist.includes(queryLower) ? 0.5 : 0;

      const aScore = aExactTitle + aStartsTitle + aContainsTitle + aArtistMatch;
      const bScore = bExactTitle + bStartsTitle + bContainsTitle + bArtistMatch;

      return bScore - aScore;
    }).slice(0, 50);

    const topResult = sortedSongs[0] || null;
    const songs = sortedSongs;

    const albumMap = new Map();
    const artistMap = new Map();

    songs.forEach((song) => {
      const inferredAlbum = song.album || `${song.artist} Hits`;
      if (inferredAlbum) {
        const albumKey = `${inferredAlbum}::${song.artist}`;
        if (!albumMap.has(albumKey)) {
          albumMap.set(albumKey, {
            id: `album-${albumKey}`,
            title: inferredAlbum,
            subtitle: song.artist,
            image: song.cover,
            meta: 'Album',
          });
        }
      }

      const artistKey = song.artist;
      if (!artistMap.has(artistKey)) {
        artistMap.set(artistKey, {
          id: `artist-${artistKey}`,
          title: song.artist,
          subtitle: 'Artist',
          image: song.cover,
          meta: `${songs.filter((item) => item.artist === song.artist).length} song${songs.filter((item) => item.artist === song.artist).length === 1 ? '' : 's'}`,
        });
      }
    });

    return {
      topResult,
      songs,
      albums: Array.from(albumMap.values()).slice(0, 25),
      artists: Array.from(artistMap.values()).slice(0, 25),
      playlists: [],
      podcasts: [],
    };
  }, [results, debouncedQuery]);

  const hasAnyResults =
    groupedResults.songs.length ||
    groupedResults.albums.length ||
    groupedResults.artists.length ||
    groupedResults.playlists.length ||
    groupedResults.podcasts.length;

  const handleSectionSearch = useCallback((term) => {
    const nextTerm = sanitizeQuery(term?.query || term || '');
    if (!nextTerm) {
      return;
    }

    const nextType = String(term?.type || 'song').toLowerCase();
    setQuery(nextTerm);
    setDebouncedQuery(nextTerm);
    setTriggerImmediateSearch((value) => value + 1);
    navigate(`/search?q=${encodeURIComponent(nextTerm)}&type=${encodeURIComponent(nextType)}`, { replace: true });
  }, [navigate]);

  const handleRecentSearchClick = useCallback((term) => {
    const nextTerm = sanitizeQuery(term);
    setQuery(nextTerm);
    setDebouncedQuery(nextTerm);
    setTriggerImmediateSearch((value) => value + 1);
    navigate(`/search?q=${encodeURIComponent(nextTerm)}&type=song`, { replace: true });
  }, [navigate]);

  const querySummary = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return 'Search songs, albums, and artists with a premium streaming-style experience.';
    }

    const typeLabel = {
      song: 'songs',
      artist: 'artists',
      album: 'albums',
    }[searchType] || 'music';

    return `Showing ${typeLabel} for “${trimmed}”`;
  }, [query, searchType]);

  const resultCount = groupedResults.songs.length + groupedResults.albums.length + groupedResults.artists.length;

  return (
    <div className="search-page-shell min-h-screen text-slate-100">
      <div className="search-page-shell__glow search-page-shell__glow--left" />
      <div className="search-page-shell__glow search-page-shell__glow--right" />

      <SearchBar
        query={query}
        onInputChange={handleInputChange}
        onSubmit={handleSearch}
        suggestions={recentSearches}
        onSuggestionSelect={handleRecentSearchClick}
      />

      <div className="search-page-shell__content mx-auto w-full max-w-7xl px-4 pb-10 pt-5 md:px-6 md:pb-12 md:pt-6">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="search-hero-panel mb-6"
        >
          <div className="search-hero-panel__copy">
            <p className="search-hero-panel__eyebrow">Search</p>
            <h1>{query.trim() ? `Results for ${query.trim()}` : 'Discover music instantly'}</h1>
            <p>{querySummary}</p>
          </div>

          <div className="search-hero-panel__stats">
            <div>
              <span>Results</span>
              <strong>{resultCount}</strong>
            </div>
            <div>
              <span>Recent</span>
              <strong>{recentSearches.length}</strong>
            </div>
            <div>
              <span>Type</span>
              <strong>{searchType}</strong>
            </div>
          </div>
        </motion.section>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${query.trim()}::${searchType}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="search-page-shell__surface"
          >
            {!searched && query.trim() === '' ? (
              <RecentSearches
                searches={recentSearches}
                onSearch={handleRecentSearchClick}
                onClear={clearRecentSearch}
              />
            ) : (
              <SearchResults
                query={query.trim()}
                isLoading={isLoading}
                searched={searched}
                errorMessage={errorMessage}
                warningMessage={warningMessage}
                hasAnyResults={Boolean(hasAnyResults)}
                groupedResults={groupedResults}
                likedSongIds={likedSongIds}
                onPlayTrack={playTrack}
                onQueueTrack={queueTrack}
                onLikeTrack={likeTrack}
                onCollectionActivate={handleSectionSearch}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {status && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="search-status-pill mt-4"
            >
              {status}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Search;
