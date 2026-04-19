import React, { memo, useCallback } from 'react';
import { Clock3, Heart, Play } from 'lucide-react';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

const formatDuration = (seconds) => {
  const value = Number(seconds) || 0;
  const mins = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function SearchSongCard({ song, isLiked, onPlayTrack, onQueueTrack, onLikeTrack }) {
  const handlePlay = useCallback(() => {
    onPlayTrack?.(song);
  }, [onPlayTrack, song]);

  const handleQueue = useCallback((event) => {
    event.stopPropagation();
    onQueueTrack?.(song);
  }, [onQueueTrack, song]);

  const handleLike = useCallback((event) => {
    event.stopPropagation();
    onLikeTrack?.(song);
  }, [onLikeTrack, song]);

  const handleImageError = useCallback((event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = FALLBACK_IMAGE;
  }, []);

  const handlePlayButton = useCallback((event) => {
    event.stopPropagation();
    onPlayTrack?.(song);
  }, [onPlayTrack, song]);

  return (
    <article className="search-song-card" onClick={handlePlay}>
      <div className="search-song-card__media">
        <img
          src={song.cover || FALLBACK_IMAGE}
          alt={song.title}
          loading="lazy"
          onError={handleImageError}
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
            onClick={handlePlayButton}
          >
            <Play size={14} /> Play
          </button>

          <button
            type="button"
            className="search-action"
            onClick={handleQueue}
          >
            Queue
          </button>

          <button
            type="button"
            className={`search-action search-action--like ${isLiked ? 'liked' : ''}`}
            onClick={handleLike}
            aria-label={isLiked ? 'Unlike song' : 'Like song'}
          >
            <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default memo(SearchSongCard);
