import { memo, useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Disc3, Heart, Mic2, Play, Search as SearchIcon, Sparkles, TrendingUp, Radio, MoreHorizontal, ListPlus } from 'lucide-react';
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

function SuggestionsSection({ recentSearches = [], onSearch }) {
  const recent = recentSearches.length ? recentSearches.slice(0, 6) : ['Kesariya', 'Tum Hi Ho', 'Arijit Singh'];
  const TRENDING_SONGS = ['Saiyaara', 'Aaj Ki Raat', 'Finding Her', 'Kesariya'];
  const POPULAR_ARTISTS = ['Arijit Singh', 'Pritam', 'Shreya Ghoshal', 'Amit Trivedi'];

  const groups = [
    { title: 'Recent Searches', icon: SearchIcon, items: recent },
    { title: 'Trending Now', icon: TrendingUp, items: TRENDING_SONGS },
    { title: 'Popular Artists', icon: Mic2, items: POPULAR_ARTISTS },
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
  }, [song.id, song.videoId, song.title]);

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

function ArtistCard({ item, onActivate }) {
  const [imageUrl, setImageUrl] = useState(item.image);

  useEffect(() => {
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
  }, [item.title]);

  return (
    <motion.button
      type="button"
      whileHover={{ y: -4, scale: 1.025 }}
      whileTap={{ scale: 0.98 }}
      className="search-artist-card group"
      onClick={() => onActivate?.({ query: item.title, type: 'artist' })}
    >
      <img src={imageUrl} alt={item.title} loading="lazy" />
      <span>{item.title}</span>
      <small>{item.meta || 'Artist'}</small>
    </motion.button>
  );
}

function CollectionCard({ item, type, onActivate }) {
  const Icon = type === 'podcast' ? Radio : type === 'playlist' ? Sparkles : Disc3;
  return (
    <motion.button
      type="button"
      whileHover={{ y: -4, scale: 1.025 }}
      whileTap={{ scale: 0.98 }}
      className="search-collection-card group"
      onClick={() => onActivate?.({ query: item.title, type: type === 'album' ? 'album' : 'song' })}
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
  onPlayTrack,
  onQueueTrack,
  onLikeTrack,
  onCollectionActivate,
}) {
  
  const songs = groupedResults.songs || [];
  const albums = groupedResults.albums || [];
  const artists = groupedResults.artists || [];
  const playlists = groupedResults.playlists || [];

  const syntheticPlaylists = useMemo(() => {
    if (playlists.length) return playlists;
    return songs.slice(0, 20).map((song, index) => ({
      id: `playlist-${song.id}-${index}`,
      title: index % 2 === 0 ? `${song.title} Hits` : `${song.artist} Mix`,
      subtitle: 'Playlist',
      image: song.cover,
      meta: 'Playlist',
    }));
  }, [playlists, songs]);
  
  const podcastsData = songs.slice(0, 20).map(s => ({...s, meta: 'Podcast Episode', title: `${s.artist} Interviews`}));

  const tabs = ['Playlists', 'Songs', 'Albums', 'Podcasts', 'Artists'];
  
  const [activeTab, setActiveTab] = useState('Songs');
  
  // Set default tab based on what's available
  useEffect(() => {
    if (songs.length > 0) setActiveTab('Songs');
    else if (albums.length > 0) setActiveTab('Albums');
    else if (artists.length > 0) setActiveTab('Artists');
    else if (playlists.length > 0) setActiveTab('Playlists');
  }, [songs, albums, artists, playlists, query]);

  if (!query) return <SuggestionsSection recentSearches={recentSearches} onSearch={onCollectionActivate} />;
  if (isLoading) return <LoadingSkeleton />;
  if (errorMessage) return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="search-empty-state search-empty-state--error">
      <SearchIcon size={24} />
      <h2>Search unavailable</h2>
      <p>{errorMessage}</p>
    </motion.section>
  );
  if (searched && !hasAnyResults) return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="search-empty-state">
      <SearchIcon size={24} />
      <h2>No results found</h2>
      <p>{warningMessage || 'Try another song, artist, album, or playlist.'}</p>
    </motion.section>
  );

  const totalResults = songs.length + albums.length + artists.length + syntheticPlaylists.length;

  return (
    <div className="search-tab-interface">
      {/* Search Header */}
      <div className="search-tab-header">
        <span className="search-tab-count">{totalResults} results</span>
      </div>

      {/* Tabs */}
      <nav className="search-tabs-nav">
        {tabs.map(tab => (
          <button 
            key={tab} 
            className={`search-tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      <motion.div 
        key={activeTab} 
        initial="hidden" 
        animate="visible" 
        variants={sectionVariants} 
        className="search-stream-sections"
      >
        
        {activeTab === 'Songs' && (
          <div className="search-song-list-vertical">
            {songs.map(song => (
              <PremiumSongRow key={song.id} song={song} isActive={activeTrackId === song.id} onPlayTrack={onPlayTrack} onLikeTrack={onLikeTrack} onQueueTrack={onQueueTrack} isLiked={likedSongIds?.includes(song.id)} />
            ))}
          </div>
        )}

        {activeTab === 'Artists' && (
          <div className="search-results-grid">
            {artists.map(item => <ArtistCard key={item.id} item={item} onActivate={onCollectionActivate} />)}
          </div>
        )}

        {activeTab === 'Albums' && (
          <div className="search-results-grid">
            {albums.map(item => <CollectionCard key={item.id} item={item} type="album" onActivate={onCollectionActivate} />)}
          </div>
        )}

        {activeTab === 'Playlists' && (
          <div className="search-results-grid">
            {syntheticPlaylists.map(item => <CollectionCard key={item.id} item={item} type="playlist" onActivate={onCollectionActivate} />)}
          </div>
        )}

        {activeTab === 'Podcasts' && (
          <div className="search-results-grid">
            {podcastsData.map((item, i) => <CollectionCard key={`podcast-${item.id}-${i}`} item={item} type="podcast" onActivate={onCollectionActivate} />)}
          </div>
        )}

      </motion.div>
    </div>
  );
}

export default memo(SearchResults);
