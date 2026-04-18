import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Clock3, Heart, Play, Search as SearchIcon } from 'lucide-react';
import apiClient from '../api/client';
import '../styles/components/Search.css';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

const formatDuration = (seconds) => {
  const value = Number(seconds) || 0;
  const mins = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function Search({ token, onPlayTrack, onQueueTrack, onLikeUpdate }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [likedSongIds, setLikedSongIds] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [status, setStatus] = useState('');

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchLikedSongs();
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextQuery = params.get('q') || '';
    if (nextQuery !== query) {
      setQuery(nextQuery);
    }
  }, [location.search]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);

    return () => window.clearTimeout(timerId);
  }, [query]);

  useEffect(() => {
    const runDebouncedSearch = async () => {
      if (!debouncedQuery) {
        setResults([]);
        setSearched(false);
        setIsLoading(false);
        setErrorMessage('');
        return;
      }

      await searchSongs(debouncedQuery);
    };

    runDebouncedSearch();
  }, [debouncedQuery]);

  const fetchLikedSongs = async () => {
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
  };

  const searchSongs = async (searchValue) => {
    const trimmed = String(searchValue || '').trim();

    if (!trimmed) {
      setResults([]);
      setSearched(false);
      setErrorMessage('');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      const response = await apiClient.get('/api/music/search/audius', {
        params: {
          query: trimmed,
          limit: 25,
        },
      });

      const rawResults = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];

      const nextResults = rawResults.map((song) => ({
        ...song,
        id: song.id,
        title: song.title || 'Untitled Track',
        artist: song.artist || 'Unknown Artist',
        album: song.album || 'Single',
        cover: song.cover || song.image || FALLBACK_IMAGE,
        duration: Number(song.duration) || 0,
      }));

      setResults(nextResults);
      setSearched(true);
      setStatus('');
    } catch (error) {
      console.error('Error searching:', error);
      setResults([]);
      setSearched(true);
      setErrorMessage('Could not fetch songs right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      navigate('/search', { replace: true });
      return;
    }

    navigate(`/search?q=${encodeURIComponent(trimmed)}`, { replace: true });
  };

  const handleInputChange = (event) => {
    const nextValue = event.target.value;
    setQuery(nextValue);

    const trimmed = nextValue.trim();
    if (!trimmed) {
      navigate('/search', { replace: true });
      return;
    }

    navigate(`/search?q=${encodeURIComponent(trimmed)}`, { replace: true });
  };

  const playTrack = (song) => {
    if (onPlayTrack) {
      onPlayTrack(song);
    }
    setStatus(`Playing ${song.title}`);
  };

  const likeTrack = async (song, event) => {
    event.stopPropagation();

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

      if (onLikeUpdate) {
        onLikeUpdate();
      }
    } catch (error) {
      if (error.response?.status === 400) {
        setStatus('Song already liked.');
        return;
      }

      setStatus('Could not like this song right now.');
    }
  };

  const queueTrack = (song, event) => {
    event.stopPropagation();

    if (onQueueTrack) {
      onQueueTrack(song);
      setStatus(`${song.title} added to queue`);
    }
  };

  const helperText = useMemo(() => {
    if (isLoading) {
      return 'Searching Audius...';
    }

    if (errorMessage) {
      return errorMessage;
    }

    if (!searched) {
      return 'Start typing to search songs, artists, and albums.';
    }

    return `Found ${results.length} song${results.length === 1 ? '' : 's'}`;
  }, [errorMessage, isLoading, results.length, searched]);

  return (
    <div className="search-page">
      <form onSubmit={handleSearch} className="search-page__form" role="search">
        <div className="search-page__input-wrap">
          <SearchIcon size={16} />
          <input
            type="search"
            placeholder="Search Audius songs, artists, albums..."
            value={query}
            onChange={handleInputChange}
          />
        </div>
      </form>

      <p className={`search-page__helper ${errorMessage ? 'is-error' : ''}`}>{helperText}</p>

      <div className="search-cards">
        {results.map((song) => {
          const isLiked = likedSongIds.includes(song.id);

          return (
            <article key={song.id} className="search-song-card" onClick={() => playTrack(song)}>
              <div className="search-song-card__media">
                <img
                  src={song.cover || FALLBACK_IMAGE}
                  alt={song.title}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = FALLBACK_IMAGE;
                  }}
                />
              </div>

              <div className="search-song-card__body">
                <h3>{song.title}</h3>
                <p>{song.artist}</p>

                <div className="search-song-card__meta">
                  <span>{song.album || 'Single'}</span>
                  <span>
                    <Clock3 size={12} /> {formatDuration(song.duration)}
                  </span>
                </div>

                <div className="search-song-card__actions">
                  <button
                    type="button"
                    className="search-action search-action--play"
                    onClick={(event) => {
                      event.stopPropagation();
                      playTrack(song);
                    }}
                  >
                    <Play size={14} /> Play
                  </button>

                  <button
                    type="button"
                    className="search-action"
                    onClick={(event) => queueTrack(song, event)}
                  >
                    Queue
                  </button>

                  <button
                    type="button"
                    className={`search-action search-action--like ${isLiked ? 'liked' : ''}`}
                    onClick={(event) => likeTrack(song, event)}
                    aria-label={isLiked ? 'Unlike song' : 'Like song'}
                  >
                    <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {searched && !isLoading && !results.length && !errorMessage && (
        <p className="search-page__empty">No songs found for this keyword.</p>
      )}

      {status && <div className="search-status">{status}</div>}
    </div>
  );
}

export default Search;
