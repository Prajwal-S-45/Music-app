import { memo, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Disc3, Heart, Mic2, Play, Search as SearchIcon, TrendingUp, Radio, MoreHorizontal, ListPlus, Sparkles, ChevronRight } from 'lucide-react';
import apiClient from '../api/client';

const sectionVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

export const formatDuration = (seconds) => {
  const value = Number(seconds) || 0;
  if (!value) return 'Preview';
  const mins = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function SuggestionsSection({ recentSearches = [], trendingQueries = [], popularArtists = [], onSearch }) {
  const recent = recentSearches.length ? recentSearches.slice(0, 6) : ['Kesariya', 'Tum Hi Ho', 'Arijit Singh'];
  const trending = trendingQueries.length ? trendingQueries.slice(0, 6) : ['Saiyaara', 'Aaj Ki Raat', 'Finding Her', 'Kesariya'];
  const artists = popularArtists.length ? popularArtists.slice(0, 6) : ['Arijit Singh', 'Pritam', 'Shreya Ghoshal', 'Amit Trivedi'];

  const groups = [
    { title: 'Recent Searches', icon: SearchIcon, items: recent },
    { title: 'Trending Now', icon: TrendingUp, items: trending },
    { title: 'Popular Artists', icon: Mic2, items: artists },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={sectionVariants} className="search-suggestions-grid">
      {groups.map((group, groupIndex) => {
        const Icon = group.icon;
        return (
          <motion.section
            key={group.title}
            variants={sectionVariants}
            transition={{ duration: 0.25, delay: groupIndex * 0.04 }}
            className="search-suggestion-panel"
          >
            <div className="search-suggestion-panel__title">
              <Icon size={17} />
              <h2>{group.title}</h2>
            </div>
            <div className="search-suggestion-list">
              {group.items.map((item, index) => (
                <button key={`${group.title}-${item}`} type="button" onClick={() => onSearch?.(item)}>
                  <span>{index + 1}</span>
                  {item}
                </button>
              ))}
            </div>
          </motion.section>
        );
      })}
    </motion.div>
  );
}

function PremiumSongRow({ song, isActive, onPlayTrack, onLikeTrack, onQueueTrack, isLiked }) {
  const playCount = useMemo(() => {
    return Math.floor(Math.random() * 900 + 100) + 'M';
  }, [song.id, song.title]);

  return (
    <motion.article
      className={`premium-song-row group ${isActive ? 'is-active' : ''}`}
      whileHover={{ y: -2 }}
    >
      <div className="premium-song-row__left" onClick={() => onPlayTrack?.(song)}>
        <div className="premium-song-row__art">
          <img src={song.cover} alt={song.title} loading="lazy" />
          <button className="premium-song-row__play-btn" aria-label="Play song">
            <Play size={16} fill="currentColor" strokeWidth={0} />
          </button>
        </div>
        <div className="premium-song-row__info">
          <strong className="premium-song-row__title">{song.title}</strong>
          <span className="premium-song-row__artist">{song.artist}</span>
        </div>
      </div>

      <div className="premium-song-row__album">
        {song.album || 'Single'}
      </div>

      <div className="premium-song-row__stats">
        <span className="premium-song-row__plays">{playCount}</span>
        <span className="premium-song-row__duration">{formatDuration(song.duration)}</span>
      </div>

      <div className="premium-song-row__actions">
        <button
          className={`premium-song-row__like ${isLiked ? 'liked' : ''}`}
          onClick={(e) => { e.stopPropagation(); onLikeTrack?.(song); }}
        >
          <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
        </button>
        <button
          className="premium-song-row__queue"
          onClick={(e) => { e.stopPropagation(); onQueueTrack?.(song); }}
        >
          <ListPlus size={16} />
        </button>
        <button className="premium-song-row__more" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal size={16} />
        </button>
      </div>
    </motion.article>
  );
}

function ArtistCard({ item }) {
  const [imageUrl, setImageUrl] = useState(
    item.image && !item.image.includes('unsplash.com')
      ? item.image
      : (item.photo && !item.photo.includes('unsplash.com') ? item.photo : null)
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (imageUrl && !imageUrl.includes('unsplash.com')) return;
    let isMounted = true;

    apiClient.get(`/api/music/artist-image?name=${encodeURIComponent(item.title)}`)
      .then(res => {
        if (isMounted && res.data && res.data.url) {
          setImageUrl(res.data.url);
        }
      })
      .catch(err => console.error('Failed to fetch artist image', err));

    return () => {
      isMounted = false;
    };
  }, [item.title, imageUrl]);

  const handleClick = () => {
    navigate(`/artists/${encodeURIComponent(item.title)}`);
  };

  return (
    <motion.button
      type="button"
      whileHover={{ y: -4, scale: 1.025 }}
      whileTap={{ scale: 0.98 }}
      className="search-artist-card group"
      onClick={handleClick}
    >
      <img src={imageUrl} alt={item.title} loading="lazy" />
      <span>{item.title}</span>
      <small>{item.meta || 'Artist'}</small>
    </motion.button>
  );
}

function CollectionCard({ item, type, onActivate }) {
  const Icon = type === 'podcast' ? Radio : type === 'playlist' ? Sparkles : Disc3;
  const navigate = useNavigate();

  const handleClick = () => {
    if (type === 'album') {
      const artist = item.subtitle || item.meta || 'Unknown';
      navigate(`/album/${encodeURIComponent(artist)}/${encodeURIComponent(item.title)}${item.id ? `?id=${encodeURIComponent(item.id)}` : ''}`);
    } else {
      onActivate?.({ query: item.title, type });
    }
  };

  return (
    <motion.button
      type="button"
      whileHover={{ y: -4, scale: 1.025 }}
      whileTap={{ scale: 0.98 }}
      className="search-collection-card group"
      onClick={handleClick}
    >
      <div className="search-collection-card__image">
        <img src={item.image} alt={item.title} loading="lazy" />
        <span>
          <Play size={15} fill="currentColor" strokeWidth={0} />
        </span>
      </div>
      <strong>{item.title}</strong>
      <small>
        <Icon size={12} />
        {item.subtitle || item.meta || type}
      </small>
    </motion.button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="search-stream-sections">
      <div className="search-skeleton-list">
        {[0, 1, 2, 3].map((item) => <div key={item} className="search-skeleton search-skeleton--row" />)}
      </div>
    </div>
  );
}

function SearchResults({
  query,
  activeTrackId,
  isLoading,
  searched,
  errorMessage,
  warningMessage,
  hasAnyResults,
  groupedResults,
  likedSongIds,
  recentSearches,
  trendingQueries = [],
  popularArtists = [],
  onPlayTrack,
  onQueueTrack,
  onLikeTrack,
  onCollectionActivate,
}) {
  const navigate = useNavigate();
  const songs = groupedResults.songs || [];
  const albums = groupedResults.albums || [];
  const artists = groupedResults.artists || [];
  if (!query) {
    return (
      <SuggestionsSection
        recentSearches={recentSearches}
        trendingQueries={trendingQueries}
        popularArtists={popularArtists}
        onSearch={onCollectionActivate}
      />
    );
  }

  if (isLoading) return <LoadingSkeleton />;

  if (errorMessage) {
    return (
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="search-empty-state search-empty-state--error">
        <SearchIcon size={24} />
        <h2>Search unavailable</h2>
        <p>{errorMessage}</p>
      </motion.section>
    );
  }

  if (searched && !hasAnyResults) {
    return (
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="search-empty-state">
        <SearchIcon size={24} />
        <h2>No results found</h2>
        <p>{warningMessage || 'Try another song, artist, album, or playlist.'}</p>
      </motion.section>
    );
  }

  return (
    <div className="search-tab-interface">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        className="search-stream-sections"
      >
        <div className="search-results-feature-grid">
          <section className="search-section">
            <div className="search-section-header">
              <h2>Top Songs</h2>
              <button
                type="button"
                className="search-view-all-link"
                onClick={() => navigate(`/search/songs?q=${encodeURIComponent(query)}`)}
              >
                View All <ChevronRight size={14} />
              </button>
            </div>
            <div className="search-song-list-vertical">
              {songs.slice(0, 4).map((song) => (
                <PremiumSongRow
                  key={song.id}
                  song={song}
                  isActive={activeTrackId === song.id}
                  onPlayTrack={onPlayTrack}
                  onLikeTrack={onLikeTrack}
                  onQueueTrack={onQueueTrack}
                  isLiked={likedSongIds?.includes(song.id)}
                />
              ))}
              {songs.length === 0 && (
                <div className="text-slate-400 text-sm py-4">No songs available</div>
              )}
            </div>
          </section>
        </div>

        {/* Albums Preview Section */}
        {albums.length > 0 && (
          <section className="search-section mt-8">
            <div className="search-section-header flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">Albums</h2>
              <button
                type="button"
                className="search-view-all-link text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
                onClick={() => navigate(`/search/albums?q=${encodeURIComponent(query)}`)}
              >
                View All <ChevronRight size={14} />
              </button>
            </div>
            <div className="search-results-grid">
              {albums.slice(0, 5).map((item) => (
                <CollectionCard
                  key={item.id}
                  item={{
                    ...item,
                    image: item.cover,
                    subtitle: item.composer,
                  }}
                  type="album"
                />
              ))}
            </div>
          </section>
        )}

        {/* Artists Preview Section */}
        {artists.length > 0 && (
          <section className="search-section mt-8">
            <div className="search-section-header flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">Artists</h2>
              <button
                type="button"
                className="search-view-all-link text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
                onClick={() => navigate(`/search/artists?q=${encodeURIComponent(query)}`)}
              >
                View All <ChevronRight size={14} />
              </button>
            </div>
            <div className="search-results-grid">
              {artists.slice(0, 5).map((item) => (
                <ArtistCard
                  key={item.id}
                  item={{
                    ...item,
                    title: item.name,
                    meta: item.profession,
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </motion.div>
    </div>
  );
}

export default memo(SearchResults);
