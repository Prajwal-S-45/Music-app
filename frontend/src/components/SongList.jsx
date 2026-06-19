import { memo } from 'react';
import { Heart, ListPlus, Play } from 'lucide-react';

const formatDuration = (seconds) => {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) {
    return '--:--';
  }

  const mins = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function SongList({ songs = [], likedSongIds = [], onPlayTrack, onQueueTrack, onLikeTrack }) {
  return (
    <div className="divide-y divide-slate-200/60">
      {songs.map((song) => {
        const liked = likedSongIds.includes(song.id);

        return (
          <article
            key={song.id}
            onClick={() => onPlayTrack(song)}
            className="group flex h-14 cursor-pointer items-center gap-[11px] rounded-xl px-3 py-2 transition-all duration-200 ease-in-out hover:bg-[#f3f4f6]"
          >
            {/* Thumbnail - 48px */}
            <button
              type="button"
              className="relative h-11 w-11 flex-shrink-0 cursor-pointer overflow-hidden rounded-md transition-all duration-200"
              onClick={(e) => {
                e.stopPropagation();
                onPlayTrack(song);
              }}
              aria-label={`Play ${song.title}`}
            >
              <img 
                src={song.cover} 
                alt={song.title} 
                loading="lazy" 
                className="h-full w-full object-cover" 
              />
              {/* Play overlay - appears on hover */}
              <div className="absolute inset-0 grid place-items-center bg-slate-900/0 transition-all duration-200 group-hover:bg-slate-900/40">
                <Play size={16} className="text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100" fill="white" />
              </div>
            </button>

            {/* Text Content - Title, Artist, Duration */}
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayTrack(song);
                }}
                className="block cursor-pointer truncate text-sm font-medium text-slate-900 transition-colors duration-200 hover:text-emerald-700"
              >
                {song.title}
              </button>
              <p className="truncate text-xs text-slate-500">
                {song.artist}
              </p>
            </div>

            {/* Duration */}
            <span className="flex-shrink-0 text-xs font-medium text-slate-400">
              {formatDuration(song.duration)}
            </span>

            {/* Action Buttons - Play, Queue & Like */}
            <div className="flex flex-shrink-0 items-center gap-2 opacity-0 transition-all duration-200 group-hover:opacity-100">
              <button
                type="button"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm transition-all duration-200 ease-in-out hover:scale-105 hover:bg-emerald-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayTrack(song);
                }}
                aria-label={`Play ${song.title}`}
                title="Play"
              >
                <Play size={15} fill="currentColor" strokeWidth={0} />
              </button>

              <button
                type="button"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-all duration-200 hover:scale-105 hover:bg-slate-200 hover:text-slate-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onQueueTrack(song);
                }}
                aria-label={`Queue ${song.title}`}
                title="Add to queue"
              >
                <ListPlus size={16} />
              </button>

              <button
                type="button"
                className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-all duration-200 hover:scale-105 ${
                  liked
                    ? 'bg-rose-50 text-rose-600'
                    : 'text-slate-500 hover:bg-slate-200 hover:text-rose-600'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onLikeTrack(song);
                }}
                aria-label={liked ? `Unlike ${song.title}` : `Like ${song.title}`}
                title={liked ? 'Unlike' : 'Like'}
              >
                <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default memo(SongList);
