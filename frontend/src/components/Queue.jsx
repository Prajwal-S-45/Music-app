import React from 'react';
import { ChevronLeft, ListMusic, Music2, Play } from 'lucide-react';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

function Queue({ items = [], activeTrackId, onSelectTrack, isOpen = false, isCompactLayout = false, onToggleQueue }) {
  const isExpanded = isCompactLayout ? isOpen : true;

  return (
    <aside
      className={`dashboard-queue ${isExpanded ? 'open' : 'collapsed'} ${isCompactLayout ? 'mobile' : 'desktop'}`}
      role="complementary"
      aria-label="Playback queue"
    >
      <div className="dashboard-queue__header">
        <p>
          <ListMusic size={16} /> Queue
        </p>
        <div className="dashboard-queue__header-actions">
          <span>{items.length} tracks</span>
          {isCompactLayout && isExpanded && (
            <button
              type="button"
              className="dashboard-queue__collapse"
              onClick={(event) => {
                event.stopPropagation();
                onToggleQueue?.();
              }}
              aria-label="Collapse queue"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="dashboard-queue__list">
        {items.length === 0 ? (
          <div className="dashboard-queue__empty">
            <Music2 size={20} />
            <p>Your queue will appear here.</p>
          </div>
        ) : (
          items.map((item, index) => (
            <button
              key={item.id || `${item.title}-${index}`}
              type="button"
              className={`dashboard-queue__item ${activeTrackId === item.id ? 'active' : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                onSelectTrack?.(item);
              }}
            >
              <img
                src={item.cover || item.image || FALLBACK_IMAGE}
                alt={item.title}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = FALLBACK_IMAGE;
                }}
              />
              <div className="dashboard-queue__item-content">
                <strong>{item.title}</strong>
                <span>{item.artist || item.subtitle}</span>
              </div>
              <span className="dashboard-queue__item-play" aria-hidden="true">
                <Play size={12} fill="currentColor" />
              </span>
            </button>
          ))
        )}
      </div>

      {isCompactLayout && !isExpanded && (
        <button
          type="button"
          className="dashboard-queue__peek-toggle"
          onClick={(event) => {
            event.stopPropagation();
            onToggleQueue?.();
          }}
          aria-label="Expand queue"
        >
          <ListMusic size={16} />
        </button>
      )}
    </aside>
  );
}

export default Queue;