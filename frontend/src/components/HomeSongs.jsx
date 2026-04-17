import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Volume2 } from 'lucide-react';
import apiClient from '../api/client';
import '../styles/components/HomeSongs.css';

const AUDIUS_APP_NAME = 'music_app';
const AUDIUS_DISCOVERY_ENDPOINT = 'https://api.audius.co';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const RECENTLY_PLAYED_KEY = 'music_app_recently_played';
const MAX_RECENTLY_PLAYED = 8;
const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

const formatDuration = (seconds) => {
  const parsed = Number(seconds);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return '0:00';
  }

  const mins = Math.floor(parsed / 60);
  const secs = Math.floor(parsed % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getArtworkUrl = (artwork) => {
  if (!artwork) {
    return DEFAULT_COVER;
  }

  return artwork['1000x1000']
    || artwork['480x480']
    || artwork['150x150']
    || DEFAULT_COVER;
};

const mapAudiusTrack = (track, discoveryProvider) => {
  if (!track || !track.id || !discoveryProvider) {
    return null;
  }

  const artworkUrl = getArtworkUrl(track.artwork);

  return {
    id: track.id,
    title: track.title || 'Untitled Track',
    artist: track.user?.name || 'Unknown Artist',
    cover: `${API_URL}/api/music/artwork?url=${encodeURIComponent(artworkUrl)}`,
    duration: Number(track.duration) || 0,
    streamUrl: `${discoveryProvider}/v1/tracks/${track.id}/stream?app_name=${AUDIUS_APP_NAME}`,
  };
};

const handleCoverError = (event) => {
  const image = event.currentTarget;
  if (image.dataset.fallbackApplied === 'true') {
    return;
  }

  image.dataset.fallbackApplied = 'true';
  image.src = DEFAULT_COVER;
};

function HomeSongs({ user }) {
  const [songs, setSongs] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  const audioRef = useRef(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(RECENTLY_PLAYED_KEY);
      if (!saved) {
        return;
      }

      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setRecentlyPlayed(parsed);
      }
    } catch {
      window.localStorage.removeItem(RECENTLY_PLAYED_KEY);
    }
  }, []);

  useEffect(() => {
    const fetchAudiusTrending = async () => {
      try {
        setLoading(true);
        setError('');

        const discoveryResponse = await fetch(AUDIUS_DISCOVERY_ENDPOINT);
        const discoveryJson = await discoveryResponse.json();
        const providers = Array.isArray(discoveryJson?.data) ? discoveryJson.data : [];

        if (providers.length === 0) {
          throw new Error('No Audius discovery providers available');
        }

        const discoveryProvider = providers[0].replace(/\/$/, '');
        const trendingResponse = await fetch(
          `${discoveryProvider}/v1/tracks/trending?app_name=${AUDIUS_APP_NAME}&limit=18&time=month`
        );
        const trendingJson = await trendingResponse.json();
        const trendingTracks = Array.isArray(trendingJson?.data) ? trendingJson.data : [];

        const normalized = trendingTracks
          .map((track) => mapAudiusTrack(track, discoveryProvider))
          .filter(Boolean);

        setSongs(normalized);

        if (normalized.length > 0) {
          setCurrentSong(normalized[0]);
        }
      } catch (requestError) {
        setError('Could not load Audius trending tracks right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchAudiusTrending();
  }, []);

  useEffect(() => {
    const trimmedQuery = searchTerm.trim();

    if (!trimmedQuery) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        setError('');

        const response = await apiClient.get('/api/music/audius/search', {
          params: {
            query: trimmedQuery,
            limit: 18,
          },
        });

        const nextResults = Array.isArray(response.data?.data) ? response.data.data : [];
        setSearchResults(nextResults);
      } catch (requestError) {
        setSearchResults([]);
        setError('Could not search Audius right now.');
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  const normalizedCurrentUrl = useMemo(() => currentSong?.streamUrl || '', [currentSong]);

  const displayedSongs = useMemo(() => {
    return searchTerm.trim() ? searchResults : songs;
  }, [searchTerm, searchResults, songs]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !normalizedCurrentUrl) {
      return;
    }

    audio.src = normalizedCurrentUrl;
    audio.load();

    if (!isPlaying) {
      return;
    }

    audio.play().catch(() => {
      setIsPlaying(false);
      setError('Autoplay blocked by browser. Press play to continue.');
    });
  }, [normalizedCurrentUrl]);

  const persistRecentlyPlayed = (song) => {
    if (!song?.id) {
      return;
    }

    setRecentlyPlayed((previous) => {
      const deduped = previous.filter((item) => item.id !== song.id);
      const next = [{ ...song, playedAt: Date.now() }, ...deduped].slice(0, MAX_RECENTLY_PLAYED);

      try {
        window.localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(next));
      } catch {
        // Ignore write failures (private mode/storage limits).
      }

      return next;
    });
  };

  const handlePlaySong = async (song) => {
    if (!song?.streamUrl || !audioRef.current) {
      return;
    }

    setCurrentSong(song);
    setCurrentTime(0);
    setTotalDuration(Number(song.duration) || 0);
    audioRef.current.src = song.streamUrl;
    audioRef.current.load();

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      setError('');
    } catch (playError) {
      setError(`Unable to play ${song.title}.`);
    }
  };

  const togglePlayback = async () => {
    if (!audioRef.current || !currentSong) {
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (playError) {
      setError('Unable to resume playback.');
    }
  };

  const playNext = () => {
    if (songs.length === 0) {
      return;
    }

    const activeQueue = searchTerm.trim() ? searchResults : songs;
    const currentPosition = activeQueue.findIndex((song) => song.id === currentSong?.id);
    const nextIndex = currentPosition >= 0
      ? (currentPosition + 1) % activeQueue.length
      : 0;
    const nextSong = activeQueue[nextIndex];
    handlePlaySong(nextSong);
  };

  const handleSeek = (event) => {
    const nextTime = Number(event.target.value);
    if (!Number.isFinite(nextTime)) {
      return;
    }

    setCurrentTime(nextTime);
    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
    }
  };

  return (
    <section className="home-songs-wrap">
      <div className="home-songs-hero">
        <p className="home-songs-eyebrow">Good Evening, {user?.name || 'Listener'}</p>
        <h2>Audius Trending Tracks</h2>
        <p>
          Discover what is hot this month on Audius. Click any card to start streaming
          instantly with a Spotify-style listening experience.
        </p>
      </div>

      <div className="home-songs-toolbar">
        <input
          type="search"
          className="home-songs-search"
          placeholder="Search tracks or artists"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <span className="home-songs-count">
          {searchTerm.trim()
            ? `${displayedSongs.length}${searchLoading ? '+' : ''} results`
            : `${displayedSongs.length} trending tracks`}
        </span>
      </div>

      {recentlyPlayed.length > 0 && (
        <section className="recently-played-wrap">
          <h3>Recently Played</h3>
          <div className="recently-played-grid">
            {recentlyPlayed.map((song) => (
              <button
                key={`recent-${song.id}`}
                type="button"
                className="recent-item"
                onClick={() => handlePlaySong(song)}
              >
                <img
                  src={song.cover}
                  alt={song.title}
                  loading="lazy"
                  onError={handleCoverError}
                />
                <div>
                  <strong>{song.title}</strong>
                  <span>{song.artist}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="home-songs-state">Loading songs...</div>
      ) : searchLoading ? (
        <div className="home-songs-state">Searching Audius...</div>
      ) : error ? (
        <div className="home-songs-state error">{error}</div>
      ) : displayedSongs.length === 0 ? (
        <div className="home-songs-state">
          {searchTerm.trim() ? 'No search results found.' : 'No songs available yet.'}
        </div>
      ) : (
        <div className={`home-songs-grid ${searchTerm.trim() ? 'search-mode' : ''}`}>
          {displayedSongs.map((song) => {
            const isActive = currentSong?.id === song.id;

            return (
              <article
                key={song.id}
                className={`song-card ${isActive ? 'active' : ''}`}
                onClick={() => handlePlaySong(song)}
              >
                <img
                  className="song-cover"
                  src={song.cover}
                  alt={song.title}
                  loading="lazy"
                  onError={handleCoverError}
                />
                <div className="song-meta">
                  <h3>{song.title}</h3>
                  <p>{song.artist}</p>
                  <small>{formatDuration(song.duration)} • Audius</small>
                </div>
                <button
                  type="button"
                  className="song-play-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    handlePlaySong(song);
                  }}
                >
                  {isActive && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  {isActive && isPlaying ? 'Pause' : 'Play'}
                </button>
              </article>
            );
          })}
        </div>
      )}

      <audio
        ref={audioRef}
        src={normalizedCurrentUrl}
        preload="auto"
        playsInline
        crossOrigin="anonymous"
        onPause={() => setIsPlaying(false)}
        onPlay={() => {
          setIsPlaying(true);
          persistRecentlyPlayed(currentSong);
        }}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onCanPlayThrough={() => setIsBuffering(false)}
        onStalled={() => setIsBuffering(true)}
        onLoadedMetadata={() => {
          const duration = audioRef.current?.duration;
          if (Number.isFinite(duration)) {
            setTotalDuration(duration);
          }
        }}
        onDurationChange={() => {
          const duration = audioRef.current?.duration;
          if (Number.isFinite(duration)) {
            setTotalDuration(duration);
          }
        }}
        onTimeUpdate={() => {
          const elapsed = audioRef.current?.currentTime;
          if (Number.isFinite(elapsed)) {
            setCurrentTime(elapsed);
          }
        }}
        onEnded={playNext}
      />

      {currentSong && (
        <div className="home-mini-player">
          <div className="home-mini-main">
            <img
              className="mini-cover"
              src={currentSong.cover}
              alt={currentSong.title}
              onError={handleCoverError}
            />
            <div className="mini-meta">
              <strong>{currentSong.title}</strong>
              <span>{currentSong.artist}</span>
            </div>
          </div>

          <div className="home-mini-actions">
            <button type="button" className="mini-play-btn" onClick={togglePlayback}>
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <div className="mini-tag">
              <Volume2 size={14} />
              {isBuffering ? 'Buffering...' : 'Live Stream'}
            </div>
          </div>

          <div className="home-mini-progress">
            <input
              type="range"
              min="0"
              max={Math.max(totalDuration, 1)}
              step="1"
              value={Math.min(currentTime, Math.max(totalDuration, 1))}
              onChange={handleSeek}
              className="mini-progress-range"
            />
            <div className="mini-progress-time">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(totalDuration)}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default HomeSongs;
