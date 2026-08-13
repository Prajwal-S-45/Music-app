import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpDown, Layers, ListFilter } from 'lucide-react';

const CATEGORY_NAMES = {
  songs: 'Songs',
  albums: 'Albums',
  artists: 'Artists',
  playlists: 'Playlists',
  podcasts: 'Podcasts',
  movies: 'Movies',
};

function CategoryHeader({
  category = 'songs',
  query = '',
  total = 0,
  sort = 'relevance',
  mode = 'pagination',
  onSortChange,
  onModeChange,
}) {
  const navigate = useNavigate();
  const categoryName = CATEGORY_NAMES[category.toLowerCase()] || 'Results';

  return (
    <header className="category-page-header">
      <div className="category-page-header__top flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="category-back-btn"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="category-title-row flex items-baseline gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight m-0">{categoryName}</h1>
            {total >= 0 && (
              <span className="text-sm font-semibold text-slate-400">
                {total} {total === 1 ? 'Result' : 'Results'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Single Unified Controls Toolbar */}
      <div className="category-unified-toolbar">
        <div className="category-toolbar-group flex items-center gap-3">
          {/* Sort Selector */}
          <div className="category-sort-wrapper">
            <ArrowUpDown size={14} className="sort-icon text-slate-400" />
            <select
              value={sort}
              onChange={(e) => onSortChange?.(e.target.value)}
              className="category-sort-select"
              aria-label="Sort results"
            >
              <option value="relevance">Sort: Relevance</option>
              <option value="name">Sort: Alphabetical</option>
              <option value="popularity">Sort: Popularity</option>
              <option value="year">Sort: Release Year</option>
            </select>
          </div>

          {/* Display Mode Toggle */}
          <div className="mode-btn-group">
            <button
              type="button"
              className={`mode-btn ${mode === 'pagination' ? 'active' : ''}`}
              onClick={() => onModeChange?.('pagination')}
              title="Page Controls"
              aria-pressed={mode === 'pagination'}
            >
              <ListFilter size={14} /> Pages
            </button>
            <button
              type="button"
              className={`mode-btn ${mode === 'infinite' ? 'active' : ''}`}
              onClick={() => onModeChange?.('infinite')}
              title="Infinite Scroll"
              aria-pressed={mode === 'infinite'}
            >
              <Layers size={14} /> Infinite Scroll
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default CategoryHeader;
