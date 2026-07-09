import { memo, useCallback } from 'react';
import { Heart, Play, ListPlus } from 'lucide-react';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

function MusicCard({
  image,
  title,
  subtitle,
  eyebrow,
  onPlay,
  track,
  onPlayTrack,
  onAddToQueue,
  onLikeTrack,
  compact = false,
  className = '',
}) {
  const subtitleParts = typeof subtitle === 'string' ? subtitle.split(' • ') : [];
  const artistText = subtitleParts[0] || subtitle || '';
  const durationText = subtitleParts[1] || '';

  const handlePlay = useCallback(() => {
    if (onPlay) {
      onPlay();
      return;
    }

    if (track) {
      onPlayTrack?.(track);
    }
  }, [onPlay, onPlayTrack, track]);

  const handleAddToQueue = useCallback((event) => {
    event.stopPropagation();
    if (track) {
      onAddToQueue?.(track);
    }
  }, [onAddToQueue, track]);

  const handleLike = useCallback((event) => {
    event.stopPropagation();
    if (track) {
      onLikeTrack?.(track);
    }
  }, [onLikeTrack, track]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlePlay();
    }
  }, [handlePlay]);

  const handleImageError = useCallback((event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = FALLBACK_IMAGE;
  }, []);

  const handlePlayButtonClick = useCallback((event) => {
    event.stopPropagation();
    handlePlay();
  }, [handlePlay]);

  return (
    <article
      className={`music-card ${compact ? 'compact' : ''} ${className}`.trim()}
      onClick={handlePlay}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="music-card__media">
        <img
          src={image || FALLBACK_IMAGE}
          alt={title}
          loading="lazy"
          onError={handleImageError}
        />
        <div className="music-card__overlay-actions">
          <button
            type="button"
            className="music-card__play"
            onClick={handlePlayButtonClick}
            aria-label={`Play ${title}`}
          >
            <Play size={18} fill="currentColor" />
          </button>
          <button
            type="button"
            className="music-card__add-queue"
            onClick={handleAddToQueue}
            aria-label={`Add ${title} to queue`}
            title="Add to queue"
          >
            <ListPlus size={18} />
          </button>
          <button
            type="button"
            className="music-card__like"
            onClick={handleLike}
            aria-label={`Like ${title}`}
            title="Like"
          >
            <Heart size={18} />
          </button>
        </div>
      </div>
      <div className="music-card__body">
        {eyebrow && <span className="music-card__eyebrow">{eyebrow}</span>}
        <h3>{title}</h3>
        {subtitle && (
          <div className="music-card__meta">
            <span className="music-card__artist" title={artistText}>{artistText}</span>
            {durationText && (
              <span className="music-card__duration" title={durationText}>{durationText}</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default memo(MusicCard);
