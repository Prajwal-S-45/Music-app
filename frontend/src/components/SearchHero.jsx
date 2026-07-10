import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, Heart, MoreHorizontal, Play, Plus, Share2 } from 'lucide-react';
import { formatDuration } from './SearchResults';

function SearchHero({ song, isLiked, onPlayTrack, onLikeTrack, onQueueTrack }) {
  if (!song) return null;

  // Mock details to fulfill the premium layout requirements since API might lack these
  const language = 'Global';
  const genre = 'Pop / Soundtrack';
  const popularity = 'Trending';
  const listeners = '14.2M';
  const releaseYear = new Date().getFullYear();

  const handlePlay = useCallback(() => {
    onPlayTrack?.(song);
  }, [onPlayTrack, song]);

  const handleLike = useCallback(() => {
    onLikeTrack?.(song);
  }, [onLikeTrack, song]);

  const handleQueue = useCallback(() => {
    onQueueTrack?.(song);
  }, [onQueueTrack, song]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="search-hero"
    >
      <div className="search-hero__ambient" style={{ backgroundImage: `url(${song.cover})` }} />
      <div className="search-hero__glass">
        <div className="search-hero__art">
          <img src={song.cover} alt={song.title} />
        </div>
        
        <div className="search-hero__content">
          <div className="search-hero__badge">Top Result</div>
          <h1 className="search-hero__title" title={song.title}>{song.title}</h1>
          <p className="search-hero__artist">
            {song.artist} <span>•</span> {song.album || 'Single'}
          </p>

          <div className="search-hero__metadata">
            <div className="metadata-item">
              <span className="metadata-label">Language</span>
              <span className="metadata-value">{language}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Duration</span>
              <span className="metadata-value">{formatDuration(song.duration)}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Genre</span>
              <span className="metadata-value">{genre}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Popularity</span>
              <span className="metadata-value">{popularity}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Monthly Listeners</span>
              <span className="metadata-value">{listeners}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Release Year</span>
              <span className="metadata-value">{releaseYear}</span>
            </div>
          </div>

          <div className="search-hero__actions">
            <button type="button" className="hero-btn hero-btn--play" onClick={handlePlay}>
              <Play size={20} fill="currentColor" strokeWidth={0} /> Play
            </button>
            <button type="button" className={`hero-btn hero-btn--icon ${isLiked ? 'hero-btn--liked' : ''}`} onClick={handleLike} aria-label="Like">
              <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
            </button>
            <button type="button" className="hero-btn hero-btn--icon" onClick={handleQueue} aria-label="Add to Playlist">
              <Plus size={22} />
            </button>
            <button type="button" className="hero-btn hero-btn--icon" aria-label="Download">
              <Download size={20} />
            </button>
            <button type="button" className="hero-btn hero-btn--icon" aria-label="Share">
              <Share2 size={20} />
            </button>
            <button type="button" className="hero-btn hero-btn--icon" aria-label="More">
              <MoreHorizontal size={22} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(SearchHero);
