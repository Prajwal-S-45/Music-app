import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Clock3,
  Download,
  Heart,
  ListPlus,
  MoreVertical,
  Play,
  RefreshCw,
  Search,
  Shuffle,
  SlidersHorizontal
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '../api/client';
import { normalizeDisplaySong } from '../utils/songPayload';
import likedSongsBg from '../assets/liked_songs_bg.jpg';
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

const cleanJioSaavnTitle = (value) => {
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

function LikedSongs({ token, refreshSignal, userName = 'Listener', onPlayTrack, onQueueTrack, onPlayAll, onLikeUpdate }) {
  const navigate = useNavigate();
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

  const songCountLabel = `${likedSongs.length} ${likedSongs.length === 1 ? 'song' : 'songs'}`;

  const handlePlayAll = () => {
    if (filteredSongs.length === 0) return;
    onPlayAll?.(filteredSongs);
  };

  const handleUnlike = async (songId) => {
    if (!token) return;
    try {
      await apiClient.delete(`/api/music/like/${songId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Refresh local list
      fetchLikedSongs();
      // Notify parent to refresh globally
      onLikeUpdate?.();
    } catch (err) {
      console.error('Failed to unlike song:', err);
    }
  };

  return (
    <motion.section
      className="liked-page"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="liked-page__noise" aria-hidden="true" />

      {/* Mobile Top Navigation Bar */}
      <div className="liked-mobile-topbar">
        <button
          type="button"
          className="liked-mobile-topbar__btn"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          type="button"
          className="liked-mobile-topbar__btn"
          aria-label="More options"
        >
          <MoreVertical size={24} />
        </button>
      </div>

      {/* Hero Header with background illustration */}
      <motion.header
        className="liked-hero"
        variants={itemVariants}
        style={{ backgroundImage: `url(${likedSongsBg})` }}
      >
        <div className="liked-hero__content">
          <h1>Liked Songs</h1>
          <p className="liked-hero__desc">All the songs you love.</p>
          
          <div className="liked-hero__metadata">
            <Heart size={14} fill="#8B5CF6" stroke="#8B5CF6" />
            <span>{songCountLabel}</span>
          </div>

          <div className="liked-hero__actions">
            <button
              type="button"
              className="liked-play-all-btn"
              onClick={handlePlayAll}
              disabled={filteredSongs.length === 0}
            >
              <Play size={18} fill="currentColor" />
              <span>Play All</span>
            </button>
            <button
              type="button"
              className="liked-download-btn"
              aria-label="Download all"
            >
              <Download size={18} />
            </button>
            <button
              type="button"
              className="liked-filters-btn"
              aria-label="Filters and options"
            >
              <SlidersHorizontal size={18} />
            </button>
            <span className="liked-hero__meta-count">{songCountLabel}</span>
          </div>
        </div>
      </motion.header>

      {/* Search Bar */}
      <motion.div className="liked-toolbar" variants={itemVariants}>
        <div className="liked-toolbar__actions">
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

      {/* Song List container */}
      <motion.div className="liked-list-shell" variants={itemVariants}>
        <div className="liked-list-head">
          <span className="liked-list-head__index">#</span>
          <span className="liked-list-head__heart" />
          <span className="liked-list-head__title">Title</span>
          <span className="liked-list-head__artist">Artist</span>
          <span className="liked-list-head__album">Album</span>
          <span className="liked-list-head__duration"><Clock3 size={16} /></span>
          <span className="liked-list-head__actions" />
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
                  className="liked-card__heart"
                  onClick={() => handleUnlike(song.id)}
                  aria-label={`Unlike ${song.title}`}
                >
                  <Heart size={16} fill="#a855f7" stroke="#a855f7" />
                </button>

                <div className="liked-card__title-section">
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
                    <span className="liked-card__play-overlay">
                      <Play size={14} fill="currentColor" />
                    </span>
                  </button>
                  <div className="liked-card__title-info">
                    <h4>{cleanJioSaavnTitle(song.title)}</h4>
                    <p className="liked-card__subtitle-artists">
                      {song.artist || 'Unknown Artist'} • {getAlbumName(song)}
                    </p>
                  </div>
                </div>

                <span className="liked-card__artist">{song.artist || 'Unknown Artist'}</span>
                <span className="liked-card__album">{getAlbumName(song)}</span>
                <span className="liked-card__duration">{formatDuration(song.duration)}</span>

                <div className="liked-card__actions">
                  <button
                    type="button"
                    onClick={() => onQueueTrack?.(song)}
                    aria-label={`Add ${song.title} to queue`}
                    className="liked-card__action-btn liked-card__queue-btn"
                  >
                    <ListPlus size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`More options for ${song.title}`}
                    className="liked-card__action-btn"
                  >
                    <MoreVertical size={20} />
                  </button>
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
