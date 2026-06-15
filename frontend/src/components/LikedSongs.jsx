import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock3, ListPlus, MoreHorizontal, Play, RefreshCw, Search, Shuffle } from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '../api/client';
import { normalizeDisplaySong } from '../utils/songPayload';
import '../styles/LikedSongs.css';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

const formatDuration = (seconds) => {
  const value = Number(seconds) || 0;
  if (!value) return '--:--';

  const mins = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const cleanYouTubeTitle = (value) => {
  return String(value || 'Untitled Track')
    .replace(/\s*\([^)]*(official|video|audio|lyrical|lyrics|full song|song|4k|hd)[^)]*\)/gi, '')
    .replace(/\s*\[[^\]]*(official|video|audio|lyrical|lyrics|full song|song|4k|hd)[^\]]*\]/gi, '')
    .replace(/\s*\|.*$/g, '')
    .replace(/\s*-\s*(official|full video|full song|lyrical|lyrics|audio|video).*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Untitled Track';
};

const getAlbumName = (song) => {
  return song.album || song.movie || song.collection || 'Single';
};

const formatTotalDuration = (songs) => {
  const totalSeconds = songs.reduce((sum, song) => sum + (Number(song.duration) || 0), 0);
  if (!totalSeconds) return '0 min';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.max(1, Math.round((totalSeconds % 3600) / 60));

  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }

  return `${minutes} min`;
};

const pageVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.055,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

function LikedSongs({ token, refreshSignal, userName = 'Listener', onPlayTrack, onQueueTrack }) {
  const [likedSongs, setLikedSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchValue, setSearchValue] = useState('');

  const fetchLikedSongs = useCallback(async () => {
    if (!token) {
      setLikedSongs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.get('/api/music/liked', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const nextLikedSongs = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];
      setLikedSongs(nextLikedSongs.map(normalizeDisplaySong));
    } catch {
      setError('Could not load liked songs');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLikedSongs();
  }, [fetchLikedSongs, refreshSignal]);

  const filteredSongs = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return likedSongs;

    return likedSongs.filter((song) => {
      return [song.title, song.artist, song.album]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [likedSongs, searchValue]);

  const totalDuration = useMemo(() => formatTotalDuration(likedSongs), [likedSongs]);
  const heroImage = likedSongs[0]?.thumbnail || likedSongs[0]?.cover || FALLBACK_IMAGE;
  const songCountLabel = `${likedSongs.length} ${likedSongs.length === 1 ? 'song' : 'songs'}`;
  const userInitial = String(userName || 'L').trim().charAt(0).toUpperCase();

  const handleShuffleAll = () => {
    if (filteredSongs.length === 0) return;
    const index = Math.floor(Math.random() * filteredSongs.length);
    onPlayTrack?.(filteredSongs[index]);
  };

  return (
    <motion.section
      className="liked-page"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="liked-page__noise" aria-hidden="true" />

      <motion.header className="liked-hero" variants={itemVariants}>
        <motion.button
          type="button"
          className="liked-hero__artwork"
          onClick={handleShuffleAll}
          whileHover={{ scale: 1.035 }}
          whileTap={{ scale: 0.98 }}
          aria-label="Shuffle liked songs"
        >
          <img
            src={heroImage}
            alt="Liked Songs playlist artwork"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = FALLBACK_IMAGE;
            }}
          />
          <span>
            <Play size={34} fill="currentColor" />
          </span>
        </motion.button>

        <div className="liked-hero__content">
          <span className="liked-hero__label">Playlist</span>
          <h1>Liked Songs</h1>
          <p>Your private collection of saved tracks, ready for every mood.</p>
          <div className="liked-hero__meta">
            <span className="liked-hero__avatar">{userInitial}</span>
            <strong>{userName}</strong>
            <span>{songCountLabel}</span>
            <span>{totalDuration}</span>
          </div>
        </div>
      </motion.header>

      <motion.div className="liked-toolbar" variants={itemVariants}>
        <div className="liked-toolbar__actions">
          <motion.button
            type="button"
            className="liked-button liked-button--primary"
            onClick={handleShuffleAll}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            disabled={filteredSongs.length === 0}
          >
            <Shuffle size={18} />
            <span>Shuffle All</span>
          </motion.button>

          <motion.button
            type="button"
            className="liked-button liked-button--glass"
            onClick={fetchLikedSongs}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <RefreshCw size={18} />
            <span>Sync Library</span>
          </motion.button>
        </div>

        <label className="liked-search">
          <Search size={18} />
          <input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search liked songs"
          />
        </label>
      </motion.div>

      <motion.div className="liked-list-shell" variants={itemVariants}>
        <div className="liked-list-head">
          <span>#</span>
          <span>Title</span>
          <span>Album</span>
          <span><Clock3 size={16} /></span>
          <span />
          <span />
        </div>

        {loading ? (
          <div className="liked-empty">Loading your liked songs...</div>
        ) : error ? (
          <div className="liked-empty error">{error}</div>
        ) : likedSongs.length === 0 ? (
          <div className="liked-empty">
            No liked songs yet. Tap the heart icon on any track to save it here.
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="liked-empty">
            No liked songs match your search.
          </div>
        ) : (
          <motion.div className="liked-list" role="list" aria-label="Liked songs" variants={pageVariants}>
            {filteredSongs.map((song, index) => (
              <motion.article
                key={song.id}
                className="liked-card"
                role="listitem"
                variants={itemVariants}
                whileHover={{ y: -2 }}
              >
                <span className="liked-card__index">{index + 1}</span>
                <button
                  type="button"
                  className="liked-card__art"
                  onClick={() => onPlayTrack?.(song)}
                  aria-label={`Play ${song.title}`}
                >
                  <img
                    src={song.thumbnail || song.cover || FALLBACK_IMAGE}
                    alt={song.title}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />
                  <span>
                    <Play size={16} fill="currentColor" />
                  </span>
                </button>

                <div className="liked-card__body">
                  <h4>{cleanYouTubeTitle(song.title)}</h4>
                </div>

                <span className="liked-card__album">{getAlbumName(song)}</span>
                <span className="liked-card__duration">{formatDuration(song.duration)}</span>

                <div className="liked-card__actions">
                  <motion.button
                    type="button"
                    onClick={() => onPlayTrack?.(song)}
                    aria-label={`Play ${song.title}`}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                  >
                    <Play size={16} fill="currentColor" />
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => onQueueTrack?.(song)}
                    aria-label={`Add ${song.title} to queue`}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                  >
                    <ListPlus size={16} />
                  </motion.button>
                  <motion.button
                    type="button"
                    aria-label={`More options for ${song.title}`}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                  >
                    <MoreHorizontal size={18} />
                  </motion.button>
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}
      </motion.div>
    </motion.section>
  );
}

export default LikedSongs;
