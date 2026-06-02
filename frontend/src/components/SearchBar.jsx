import React, { memo, useEffect, useMemo, useState } from 'react';
import { Search as SearchIcon, Sparkles, TrendingUp } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const PLACEHOLDER_LINES = [
  'Search songs, albums, artists...',
  'Try: Arijit Singh, Weeknd, Lo-fi mix',
  'Find your next favorite track',
];

function SearchBar({ query, onInputChange, onSubmit, suggestions = [], onSuggestionSelect }) {
  const [focused, setFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % PLACEHOLDER_LINES.length);
    }, 2600);

    return () => window.clearInterval(timerId);
  }, []);

  const computedSuggestions = useMemo(() => {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    const recent = Array.isArray(suggestions) ? suggestions.filter(Boolean) : [];

    if (!recent.length) {
      return ['Top 50 India', 'Chill beats', 'Workout mix', 'Soft pop'].slice(0, 4);
    }

    if (!normalizedQuery) {
      return recent.slice(0, 5);
    }

    return recent
      .filter((item) => item.toLowerCase().includes(normalizedQuery))
      .slice(0, 5);
  }, [query, suggestions]);

  const showSuggestionPanel = focused && computedSuggestions.length > 0;

  return (
    <motion.header
      initial={{ y: -14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="search-sticky-bar sticky top-0 z-40 px-4 pt-3 md:px-6"
    >
      <div className="mx-auto w-full max-w-[1024px]">
        <form onSubmit={onSubmit} role="search" className="relative">
          <label className={`search-input-shell group flex items-center gap-3 px-4 py-3 md:px-5 ${focused ? 'search-input-shell--focused' : ''}`}>
            <span className="search-input-shell__icon">
              <SearchIcon className="h-5 w-5" />
            </span>

            <input
              type="search"
              value={query}
              onChange={onInputChange}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                window.setTimeout(() => setFocused(false), 140);
              }}
              placeholder={PLACEHOLDER_LINES[placeholderIndex]}
              className="search-input-shell__input w-full border-none bg-transparent outline-none"
            />

            <span className="search-input-shell__chip hidden items-center gap-1 rounded-full border border-white/15 bg-white/8 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300 md:inline-flex">
              <Sparkles size={11} className="text-emerald-300" />
              Premium search
            </span>
          </label>

          <AnimatePresence>
            {showSuggestionPanel && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="search-input-shell__suggestions mt-2 overflow-hidden rounded-[20px] border border-white/10 bg-[#0b1224]/95 p-2 shadow-[0_20px_36px_rgba(2,6,23,0.45)] backdrop-blur-xl"
              >
                {computedSuggestions.map((item, index) => (
                  <button
                    key={`${item}-${index}`}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onSuggestionSelect?.(item);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition duration-200 hover:bg-white/10 hover:text-white"
                  >
                    <TrendingUp size={14} className="text-emerald-300" />
                    <span className="truncate">{item}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </motion.header>
  );
}

export default memo(SearchBar);
