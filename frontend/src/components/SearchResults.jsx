import React, { memo, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, ChevronDown, Disc3, Play, Sparkles, Search as SearchIcon } from 'lucide-react';
import SearchResultListItem from './SearchResultListItem';

const motionStyle = `
  @keyframes searchFadeUp {
    from {
      opacity: 0;
      transform: translateY(14px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes searchShimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  .search-fade-up {
    animation: searchFadeUp 0.35s ease-out forwards;
  }

  .search-shimmer {
    background: linear-gradient(90deg, rgba(148, 163, 184, 0.14) 25%, rgba(255, 255, 255, 0.24) 37%, rgba(148, 163, 184, 0.14) 63%);
    background-size: 200% 100%;
    animation: searchShimmer 1.3s linear infinite;
  }

  @keyframes searchEqualize {
    0%, 100% { transform: scaleY(0.45); opacity: 0.55; }
    50% { transform: scaleY(1); opacity: 1; }
  }

  .search-equalizer-bar {
    transform-origin: bottom center;
    animation: searchEqualize 1.05s ease-in-out infinite;
  }
`;

if (typeof document !== 'undefined' && !document.head.querySelector('style[data-search-results-motion]')) {
  const style = document.createElement('style');
  style.textContent = motionStyle;
  style.setAttribute('data-search-results-motion', 'true');
  document.head.appendChild(style);
}

const BROWSE_CARDS = [
  { id: 'top-charts', title: 'Top Charts', subtitle: 'Most played right now', bg: 'from-emerald-500/90 via-emerald-400/80 to-cyan-500/80' },
  { id: 'new-releases', title: 'New Releases', subtitle: 'Fresh drops and albums', bg: 'from-fuchsia-500/90 via-violet-500/80 to-indigo-500/80' },
  { id: 'podcasts', title: 'Podcasts', subtitle: 'Music talk and stories', bg: 'from-amber-500/90 via-orange-500/80 to-red-500/80' },
  { id: 'moods', title: 'Moods', subtitle: 'Calm, focus and more', bg: 'from-sky-500/90 via-blue-500/80 to-indigo-600/80' },
  { id: 'pop', title: 'Pop', subtitle: 'High energy essentials', bg: 'from-pink-500/90 via-rose-500/80 to-red-500/80' },
  { id: 'indie', title: 'Indie', subtitle: 'Discover hidden gems', bg: 'from-teal-500/90 via-emerald-500/80 to-green-500/80' },
];

const displayLimits = {
  songs: 12,
  albums: 8,
  artists: 8,
  playlists: 8,
  podcasts: 8,
};

function BrowseAll() {
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-300/90">Discover</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">Browse all</h2>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200/80 backdrop-blur md:flex">
          <Sparkles size={14} className="text-emerald-300" />
          Immersive music discovery
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {BROWSE_CARDS.map((card) => (
          <motion.article
            key={card.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className={`group relative overflow-hidden rounded-[24px] bg-gradient-to-br ${card.bg} p-4 shadow-[0_18px_40px_rgba(2,6,23,0.35)] ring-1 ring-white/10 transition-transform duration-200 hover:-translate-y-1 hover:scale-[1.01]`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_36%)]" />
            <div className="relative z-10">
              <h3 className="max-w-[72%] text-lg font-extrabold tracking-tight text-white md:text-xl">{card.title}</h3>
              <p className="mt-2 max-w-[78%] text-xs leading-5 text-white/80 md:text-sm">{card.subtitle}</p>
            </div>
            <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-2xl bg-white/18 blur-[1px] transition duration-300 group-hover:rotate-6 group-hover:scale-110" />
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function SectionHeader({ title, subtitle, count, showViewAll, expanded, onToggle }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{title}</p>
          {typeof count === 'number' ? (
            <span className="rounded-full border border-white/10 bg-white/6 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300/80">
              {count}
            </span>
          ) : null}
        </div>
        {subtitle && <p className="mt-1 text-sm text-slate-300/70">{subtitle}</p>}
      </div>
      {showViewAll && (
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-200/90 transition duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          {expanded ? 'Show Less' : 'View All'}
          <ChevronDown size={13} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
}

function TopResult({ item, onPlayTrack }) {
  if (!item) return null;

  const durationLabel = item.duration ? `${Math.floor(item.duration / 60)}:${String(item.duration % 60).padStart(2, '0')}` : 'Preview';

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => onPlayTrack(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPlayTrack(item);
        }
      }}
      whileHover={{ y: -4, scale: 1.008 }}
      whileTap={{ scale: 0.994 }}
      className="group relative w-full overflow-hidden rounded-[30px] border border-white/10 bg-white/7 p-2.5 text-left shadow-[0_24px_54px_rgba(2,6,23,0.36)] backdrop-blur-2xl transition md:p-3.5"
    >
      <div
        className="absolute inset-0 opacity-95"
        style={{
          backgroundImage: `radial-gradient(circle at 18% 18%, rgba(16, 185, 129, 0.36), transparent 31%), radial-gradient(circle at 82% 72%, rgba(59, 130, 246, 0.26), transparent 30%), linear-gradient(145deg, rgba(2,6,23,0.96), rgba(15,23,42,0.80))`,
        }}
      />
      <div
        className="absolute inset-0 opacity-70 blur-3xl transition duration-500 group-hover:scale-105"
        style={{
          backgroundImage: `url(${item.cover})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(38px) saturate(1.2)',
        }}
      />
      <div className="absolute -right-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-emerald-400/20 blur-3xl transition duration-500 group-hover:scale-110" />

      <div className="relative z-10 grid gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
        <div className="search-top-result-card__art relative mx-auto h-28 w-28 flex-shrink-0 overflow-hidden rounded-[22px] shadow-[0_20px_36px_rgba(0,0,0,0.42)] ring-1 ring-white/15 sm:mx-0 sm:h-32 sm:w-32 lg:h-36 lg:w-36">
          <img
            src={item.cover}
            alt={item.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(2,6,23,0.52)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 p-2 text-white">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/38 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] backdrop-blur-md">
              <Disc3 size={10} />
              Live preview
            </span>
          </div>
        </div>

        <div className="min-w-0 space-y-2 self-center">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200">
            <BadgeCheck size={11} />
            Selected song
          </p>

          <div className="space-y-1">
            <h3 className="line-clamp-2 max-w-3xl text-2xl font-black tracking-tight text-white md:text-[30px] md:leading-[1.08]">
              {item.title}
            </h3>
            <p className="max-w-2xl text-sm text-slate-200/85 md:text-base">
              {item.artist}
              {item.album ? <span className="text-slate-400"> · {item.album}</span> : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="rounded-full border border-white/10 bg-white/7 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200/80">
              Floating player
            </span>
            <span className="rounded-full border border-white/10 bg-white/7 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200/80">
              High quality
            </span>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[180px] flex-col items-center justify-center gap-2.5 rounded-[22px] border border-white/10 bg-white/7 px-3 py-3 shadow-[0_16px_34px_rgba(2,6,23,0.26)] backdrop-blur-xl md:mx-0 md:min-w-[168px]">
          <motion.button
            type="button"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            className="group/btn relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_20px_34px_rgba(16,185,129,0.42)] ring-1 ring-emerald-300/40 transition duration-200 hover:bg-emerald-400"
            onClick={(event) => {
              event.stopPropagation();
              onPlayTrack(item);
            }}
            aria-label={`Play ${item.title}`}
          >
            <span className="absolute inset-0 rounded-full border border-emerald-200/40 animate-ping opacity-25" />
            <Play size={22} fill="currentColor" strokeWidth={0} className="translate-x-[1px]" />
          </motion.button>

          <div className="flex items-end gap-1.5">
            {[0, 1, 2, 3].map((bar) => (
              <span
                key={bar}
                className="search-equalizer-bar w-1.5 rounded-full bg-emerald-300/90"
                style={{ height: `${10 + bar * 5}px`, animationDelay: `${bar * 0.12}s` }}
              />
            ))}
          </div>

          <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200/80">
            {durationLabel}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function CollectionCard({ item, onActivate }) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -3, scale: 1.015 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onActivate?.(item)}
      className="group search-collection-card-glass w-[196px] flex-shrink-0 text-left"
    >
      <div className="search-collection-card-glass__media">
        <img src={item.image} alt={item.title} loading="lazy" className="h-full w-full object-cover" />
        <div className="search-collection-card-glass__overlay" />
        <span className="search-collection-card-glass__play">
          <Play size={15} fill="currentColor" strokeWidth={0} />
        </span>
      </div>
      <div className="pt-2.5">
        <p className="truncate text-sm font-semibold text-white transition group-hover:text-emerald-200">{item.title}</p>
        <p className="mt-1 truncate text-xs text-slate-300/75">{item.subtitle || item.meta || 'Collection'}</p>
      </div>
    </motion.button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 pt-1">
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="rounded-[24px] border border-white/10 bg-white/7 p-4 shadow-[0_16px_36px_rgba(2,6,23,0.24)] backdrop-blur-xl">
            <div className="search-shimmer h-3 w-20 rounded-full" />
            <div className="search-shimmer mt-4 h-8 w-16 rounded-2xl" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="flex items-center gap-4 rounded-[22px] border border-white/10 bg-white/7 p-3 shadow-[0_12px_28px_rgba(2,6,23,0.24)] backdrop-blur-xl">
            <div className="search-shimmer h-14 w-14 rounded-[18px]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="search-shimmer h-3 w-3/4 rounded-full" />
              <div className="search-shimmer h-2.5 w-1/2 rounded-full" />
            </div>
            <div className="search-shimmer h-9 w-9 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchResults({
  query,
  isLoading,
  searched,
  errorMessage,
  warningMessage,
  hasAnyResults,
  groupedResults,
  likedSongIds,
  onPlayTrack,
  onQueueTrack,
  onLikeTrack,
  onCollectionActivate,
}) {
  const [expandedSections, setExpandedSections] = useState({
    songs: false,
    albums: false,
    artists: false,
    playlists: false,
    podcasts: false,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const topMatches = (groupedResults.songs || []).slice(0, 1)[0] || null;
  const visibleSongs = expandedSections.songs ? groupedResults.songs : groupedResults.songs.slice(0, displayLimits.songs);
  const visibleAlbums = expandedSections.albums ? groupedResults.albums : groupedResults.albums.slice(0, displayLimits.albums);
  const visibleArtists = expandedSections.artists ? groupedResults.artists : groupedResults.artists.slice(0, displayLimits.artists);
  const visiblePlaylists = expandedSections.playlists ? (groupedResults.playlists || []) : (groupedResults.playlists || []).slice(0, displayLimits.playlists);
  const visiblePodcasts = expandedSections.podcasts ? (groupedResults.podcasts || []) : (groupedResults.podcasts || []).slice(0, displayLimits.podcasts);

  const sectionStats = useMemo(() => ([
    { label: 'Songs', value: groupedResults.songs.length },
    { label: 'Artists', value: groupedResults.artists.length },
    { label: 'Albums', value: groupedResults.albums.length },
  ]), [groupedResults.albums.length, groupedResults.artists.length, groupedResults.songs.length]);

  if (!query) {
    return <BrowseAll />;
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (errorMessage) {
    return (
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[26px] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-rose-100 shadow-[0_16px_34px_rgba(190,18,60,0.16)] backdrop-blur-xl">
        <p className="text-sm font-semibold">Search unavailable</p>
        <p className="mt-1 text-sm leading-6 text-rose-100/90">{errorMessage}</p>
      </motion.section>
    );
  }

  if (searched && !hasAnyResults) {
    return (
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-white/10 bg-white/7 p-6 shadow-[0_18px_40px_rgba(2,6,23,0.28)] backdrop-blur-xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/8 text-slate-100 ring-1 ring-white/10">
          <SearchIcon size={22} />
        </div>
        <h3 className="mt-4 text-2xl font-black tracking-tight text-white">No results found</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300/80">
          {warningMessage || 'Try different keywords, check spelling, or switch search types to explore songs, artists, and albums.'}
        </p>
      </motion.section>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="search-results-board relative space-y-5 overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4 shadow-[0_24px_56px_rgba(2,6,23,0.34)] backdrop-blur-2xl md:p-5"
    >
      <div className="search-results-board__layer search-results-board__layer--mint" />
      <div className="search-results-board__layer search-results-board__layer--blue" />

      <div className="relative z-[1] grid gap-3 sm:grid-cols-3">
        {sectionStats.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: index * 0.05 }}
            className="rounded-[18px] border border-white/10 bg-white/7 p-3 shadow-[0_12px_26px_rgba(2,6,23,0.22)] backdrop-blur-xl"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
            <p className="mt-1.5 text-2xl font-black tracking-tight text-white">{item.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="relative z-[1] grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          {topMatches && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="search-fade-up space-y-3">
              <SectionHeader title="Top Result" subtitle="Best match across your music library" count={topMatches ? 1 : 0} showViewAll={false} />
              <TopResult item={topMatches} onPlayTrack={onPlayTrack} />
            </motion.section>
          )}

          {visibleSongs.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ staggerChildren: 0.06 }} className="space-y-3">
              <SectionHeader
                title="Songs"
                subtitle="Hover to preview and queue"
                count={groupedResults.songs.length}
                showViewAll={groupedResults.songs.length > displayLimits.songs}
                expanded={expandedSections.songs}
                onToggle={() => toggleSection('songs')}
              />
              <div className="space-y-2.5">
                {visibleSongs.map((song, index) => (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.025 }}
                  >
                    <SearchResultListItem
                      song={song}
                      index={index}
                      onPlayTrack={onPlayTrack}
                      onQueueTrack={onQueueTrack}
                      onLikeTrack={onLikeTrack}
                      isLiked={likedSongIds?.includes(song.id)}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </div>

        <div className="space-y-4 xl:col-span-5">
          {visibleAlbums.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ staggerChildren: 0.06 }} className="space-y-3">
              <SectionHeader
                title="Albums"
                subtitle="Artwork-forward collections"
                count={groupedResults.albums.length}
                showViewAll={groupedResults.albums.length > displayLimits.albums}
                expanded={expandedSections.albums}
                onToggle={() => toggleSection('albums')}
              />
              <div className="search-horizontal-row search-horizontal-row--dark">
                {visibleAlbums.map((item) => (
                  <CollectionCard key={item.id} item={{ ...item, type: 'album' }} onActivate={onCollectionActivate} />
                ))}
              </div>
            </motion.section>
          )}

          {visibleArtists.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ staggerChildren: 0.06 }} className="space-y-3">
              <SectionHeader
                title="Artists"
                subtitle="Discover more from creators"
                count={groupedResults.artists.length}
                showViewAll={groupedResults.artists.length > displayLimits.artists}
                expanded={expandedSections.artists}
                onToggle={() => toggleSection('artists')}
              />
              <div className="search-horizontal-row search-horizontal-row--dark">
                {visibleArtists.map((item) => (
                  <CollectionCard key={item.id} item={{ ...item, type: 'artist' }} onActivate={onCollectionActivate} />
                ))}
              </div>
            </motion.section>
          )}
        </div>

        {visiblePlaylists.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 xl:col-span-12">
            <SectionHeader
              title="Playlists"
              subtitle="Curated blends and mixes"
              count={groupedResults.playlists.length}
              showViewAll={groupedResults.playlists.length > displayLimits.playlists}
              expanded={expandedSections.playlists}
              onToggle={() => toggleSection('playlists')}
            />
            <div className="search-horizontal-row search-horizontal-row--dark">
              {visiblePlaylists.map((item) => (
                <CollectionCard key={item.id} item={{ ...item, type: 'song' }} onActivate={onCollectionActivate} />
              ))}
            </div>
          </motion.section>
        )}

        {visiblePodcasts.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 xl:col-span-12">
            <SectionHeader
              title="Podcasts"
              subtitle="Talks, episodes, and shows"
              count={groupedResults.podcasts.length}
              showViewAll={groupedResults.podcasts.length > displayLimits.podcasts}
              expanded={expandedSections.podcasts}
              onToggle={() => toggleSection('podcasts')}
            />
            <div className="search-horizontal-row search-horizontal-row--dark">
              {visiblePodcasts.map((item) => (
                <CollectionCard key={item.id} item={{ ...item, type: 'song' }} onActivate={onCollectionActivate} />
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </motion.div>
  );
}

export default memo(SearchResults);
