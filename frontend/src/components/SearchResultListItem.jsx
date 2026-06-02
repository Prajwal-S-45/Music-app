import React, { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock3, Heart, Play } from 'lucide-react';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

const formatDuration = (seconds) => {
  const value = Number(seconds) || 0;
  const mins = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function SearchResultListItem({ song, index, isLiked, onPlayTrack, onQueueTrack, onLikeTrack }) {
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
    <motion.article
      whileHover={{ x: 2, scale: 1.006 }}
      whileTap={{ scale: 0.994 }}
      className="group search-result-row-glass grid w-full grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2 rounded-[16px] border border-white/10 bg-[rgba(15,23,42,0.72)] px-2.5 py-2 text-left shadow-[0_10px_22px_rgba(2,6,23,0.28)] backdrop-blur-xl transition duration-200 hover:border-emerald-300/25 hover:bg-[rgba(15,23,42,0.88)]"
      onClick={handlePlay}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handlePlay();
        }
      }}
    >
      <span className="hidden w-7 flex-shrink-0 text-center text-[11px] font-semibold tracking-[0.04em] text-slate-400/85 md:inline-block">
        {String((index ?? 0) + 1).padStart(2, '0')}
      </span>

      <button
        type="button"
        className="search-result-row-glass__thumb"
        onClick={handlePlayButton}
        aria-label={`Play ${song.title}`}
      >
        <img
          className="h-full w-full object-cover"
          src={song.cover || FALLBACK_IMAGE}
          alt={song.title}
          loading="lazy"
          onError={handleImageError}
        />
        <span className="search-result-row-glass__play">
          <Play size={14} fill="currentColor" />
        </span>
      </button>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-[13px] font-semibold leading-tight text-slate-100 transition group-hover:text-white sm:text-[14px] md:text-[15px]">
            {song.title}
          </h3>
          {song.duration ? (
            <span className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-300/90 sm:inline-flex">
              <Clock3 size={11} /> {formatDuration(song.duration)}
            </span>
          ) : (
            <span className="hidden items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-300/90 sm:inline-flex">
              Preview
            </span>
          )}
        </div>

        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-slate-300/85 sm:text-xs">
          <span className="truncate font-medium text-slate-200/95">{song.artist}</span>
          <span className="h-1 w-1 rounded-full bg-slate-500/75" />
          <span className="truncate text-slate-400/90">{song.album || 'Single'}</span>
          <span className="hidden h-1 w-1 rounded-full bg-slate-500/75 md:inline-flex" />
          <span className="hidden text-slate-400/85 md:inline-flex">HQ preview</span>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">
        <button
          type="button"
          className="hidden rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-200/90 transition hover:border-emerald-300/30 hover:bg-white/12 hover:text-white sm:inline-flex"
          onClick={handleQueue}
        >
          Queue
        </button>
        <button
          type="button"
          className={`inline-flex items-center justify-center rounded-full border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition ${
            isLiked
              ? 'border-rose-400/30 bg-rose-500/20 text-rose-200'
              : 'border-white/10 bg-white/5 text-slate-200/90 hover:border-white/20 hover:bg-white/12 hover:text-white'
          }`}
          onClick={handleLike}
          aria-label={isLiked ? 'Unlike song' : 'Like song'}
        >
          <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
        </button>
      </div>
    </motion.article>
  );
}

export default memo(SearchResultListItem);
