import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Disc3, Heart, ListMusic, MoreVertical, Play, Plus, UserRound } from 'lucide-react';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

const formatDuration = (seconds) => {
  const value = Number(seconds) || 0;
  const mins = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function SearchResultListItem({ song, index, isLiked, onPlayTrack, onQueueTrack, onLikeTrack, onOpenArtist, onOpenAlbum }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [menuOpen]);

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

  const handleOpenArtist = useCallback((event) => {
    event.stopPropagation();
    setMenuOpen(false);
    onOpenArtist?.(song.artist);
  }, [onOpenArtist, song.artist]);

  const handleOpenAlbum = useCallback((event) => {
    event.stopPropagation();
    setMenuOpen(false);
    onOpenAlbum?.(song.album);
  }, [onOpenAlbum, song.album]);

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
      onClick={handlePlay}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handlePlay();
        }
      }}
      className="group search-result-row-glass"
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
        </div>

        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-slate-300/85 sm:text-xs">
          <span className="truncate font-medium text-slate-200/95">{song.artist}</span>
        </div>
      </div>

      <div ref={menuRef} className="relative flex flex-shrink-0 items-center gap-1.5">
        <span className="search-result-row-glass__duration">{formatDuration(song.duration)}</span>
        <button
          type="button"
          className="search-row-action"
          onClick={handleQueue}
          aria-label={`Add ${song.title} to queue`}
          title="Add to queue"
        >
          <ListMusic size={16} />
        </button>
        <button
          type="button"
          className={`search-row-action ${isLiked ? 'is-liked' : ''}`}
          onClick={handleLike}
          aria-label={isLiked ? 'Unlike song' : 'Like song'}
          title={isLiked ? 'Liked' : 'Like song'}
        >
          <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
        </button>
        <button
          type="button"
          className="search-row-action"
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((value) => !value);
          }}
          aria-label="Open song actions"
          title="More actions"
        >
          <MoreVertical size={17} />
        </button>
        {menuOpen ? (
          <div className="search-row-menu">
            <button type="button" onClick={handleQueue}>
              <ListMusic size={15} />
              Add to queue
            </button>
            <button type="button" disabled title="Playlist action unavailable">
              <Plus size={15} />
              Add to playlist
            </button>
            <button type="button" onClick={handleLike}>
              <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} />
              {isLiked ? 'Liked song' : 'Like song'}
            </button>
            <button type="button" onClick={handleOpenArtist}>
              <UserRound size={15} />
              Open artist
            </button>
            {song.album && (
              <button type="button" onClick={handleOpenAlbum}>
                <Disc3 size={15} />
                Open album
              </button>
            )}
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}

export default memo(SearchResultListItem);
