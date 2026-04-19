import React, { memo, useCallback } from 'react';
import { Play } from 'lucide-react';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

function SearchCollectionCard({ kind, title, subtitle, image, meta, onActivate }) {
  const handleImageError = useCallback((event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = FALLBACK_IMAGE;
  }, []);

  const handleClick = useCallback(() => {
    onActivate?.();
  }, [onActivate]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate?.();
    }
  }, [onActivate]);

  return (
    <article
      className={`search-collection-card search-collection-card--${kind}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="search-collection-card__media">
        <img src={image || FALLBACK_IMAGE} alt={title} loading="lazy" onError={handleImageError} />
        <button type="button" className="search-collection-card__play" onClick={handleClick} aria-label={`Open ${title}`}>
          <Play size={18} fill="currentColor" />
        </button>
      </div>
      <div className="search-collection-card__body">
        <span className="search-collection-card__eyebrow">{kind}</span>
        <h3>{title}</h3>
        <p>{subtitle}</p>
        {meta && <span className="search-collection-card__meta">{meta}</span>}
      </div>
    </article>
  );
}

export default memo(SearchCollectionCard);
