import React from 'react';
import { Play } from 'lucide-react';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

function MusicCard({ image, title, subtitle, eyebrow, onPlay, compact = false, className = '' }) {
  return (
    <article
      className={`music-card ${compact ? 'compact' : ''} ${className}`.trim()}
      onClick={onPlay}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPlay?.();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="music-card__media">
        <img
          src={image || FALLBACK_IMAGE}
          alt={title}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = FALLBACK_IMAGE;
          }}
        />
        <button
          type="button"
          className="music-card__play"
          onClick={(event) => {
            event.stopPropagation();
            onPlay?.();
          }}
          aria-label={`Play ${title}`}
        >
          <Play size={18} fill="currentColor" />
        </button>
      </div>
      <div className="music-card__body">
        {eyebrow && <span className="music-card__eyebrow">{eyebrow}</span>}
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
    </article>
  );
}

export default MusicCard;