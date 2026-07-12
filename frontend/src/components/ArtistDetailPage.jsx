import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Heart, MoreHorizontal, Clock, Shuffle, CheckCircle2, UserPlus, ChevronDown, AlignLeft, Headphones, Music, Disc, Globe, Search, Grid, List, Plus, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchArtist, getArtistDetails, searchSongs, getArtistAlbums } from '../api/musicApi';
import '../styles/ArtistDetailStyles.css';
import '../styles/AlbumDetailsStyles.css';

const TABS = [
  'Overview',
  'Popular Songs',
  'Albums',
  'About'
];

const FILTER_TYPES = [
  'All',
  'Albums',
  'EP',
  'Singles',
  'Compilations',
  'Movie Albums',
  'Live Albums'
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 25 } }
};


export default function ArtistDetailPage({ token, onPlayTrack, onQueueTrack, onLikeUpdate }) {
  const { name: rawName } = useParams();
  const navigate = useNavigate();
  const artistName = rawName || 'Unknown Artist';
  
  const [activeTab, setActiveTab] = useState('Overview');
  const [artistImage, setArtistImage] = useState('https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1500&q=80');
  const [artistBanner, setArtistBanner] = useState(null);
  const [artistFanart, setArtistFanart] = useState(null);
  const [popularSongs, setPopularSongs] = useState([]);
  const [relatedArtists, setRelatedArtists] = useState([]);
  const [aboutStats, setAboutStats] = useState({ fans: 0, playcount: 0, bio: '', country: '', genre: '' });
  const [isLoading, setIsLoading] = useState(true);

  // Lazy-loaded tab data
  const [albumCards, setAlbumCards] = useState([]);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const [albumsLoaded, setAlbumsLoaded] = useState(false);
  const [albumsError, setAlbumsError] = useState(false);
  const [singlesSongs, setSinglesSongs] = useState([]);
  const [singlesLoading, setSinglesLoading] = useState(false);
  const [singlesLoaded, setSinglesLoaded] = useState(false);

  // Albums tab controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [sortKey, setSortKey] = useState('Popular');
  const [visibleCount, setVisibleCount] = useState(100);
  const albumsSentinelRef = useRef(null);

  // Liked albums (persisted to localStorage)
  const [likedAlbums, setLikedAlbums] = useState(() => {
    try {
      const saved = localStorage.getItem(`liked_albums_${artistName}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('music_app_followed_artists');
      const followed = saved ? JSON.parse(saved) : [];
      setIsFollowing(followed.some(a => a.name.toLowerCase() === artistName.toLowerCase()));
    } catch {
      // Ignore
    }
  }, [artistName]);

  const handleFollowToggle = () => {
    try {
      const saved = localStorage.getItem('music_app_followed_artists');
      let followed = saved ? JSON.parse(saved) : [];
      
      const isAlreadyFollowed = followed.some(a => a.name.toLowerCase() === artistName.toLowerCase());
      
      if (isAlreadyFollowed) {
        followed = followed.filter(a => a.name.toLowerCase() !== artistName.toLowerCase());
        setIsFollowing(false);
      } else {
        followed.push({
          id: artistName,
          name: decodeURIComponent(artistName),
          image: artistImage,
          role: aboutStats.genre || 'Singer'
        });
        setIsFollowing(true);
      }
      
      localStorage.setItem('music_app_followed_artists', JSON.stringify(followed));
      window.dispatchEvent(new Event('followedArtistsUpdated'));
    } catch (e) {
      console.error('Failed to toggle follow status:', e);
    }
  };

  const toggleLikeAlbum = (albumId, e) => {
    e.stopPropagation();
    setLikedAlbums(prev => {
      const updated = { ...prev, [albumId]: !prev[albumId] };
      try {
        localStorage.setItem(`liked_albums_${artistName}`, JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };
  
  const formatNumber = (num) => {
    const n = Number(num) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  const listeners = aboutStats.fans > 0 ? aboutStats.fans : null;
  const followers = aboutStats.fans > 0 ? Math.floor(aboutStats.fans * 0.8) : null;

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setArtistImage('https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1500&q=80');
    setArtistBanner(null);
    setArtistFanart(null);
    setPopularSongs([]);
    setRelatedArtists([]);
    setAboutStats({ fans: 0, playcount: 0, bio: '', country: '', genre: '' });

    const fetchAll = async () => {
      const [artistRes, songsRes] = await Promise.allSettled([
        searchArtist(artistName),
        searchSongs(artistName, 10),
      ]);

      if (!isMounted) return;

      if (artistRes.status === 'fulfilled') {
        const artistData = artistRes.value?.data?.data?.[0];
        if (artistData) {
          const images = artistData.images || {};
          if (images.thumbnail) setArtistImage(images.thumbnail);
          if (images.banner) setArtistBanner(images.banner);
          if (images.fanart || images.wide_thumb) setArtistFanart(images.fanart || images.wide_thumb);

          const bio = artistData.biography || {};
          setAboutStats({
            fans: bio.listeners || 0,
            playcount: bio.playcount || 0,
            bio: bio.biography || '',
            country: artistData.country || '',
            genre: artistData.genre || '',
            similarArtists: bio.similarArtists || [],
          });

          if (bio.similarArtists?.length > 0) {
            setRelatedArtists(bio.similarArtists);
          }
        }
      }

      if (songsRes.status === 'fulfilled') {
        const songs = Array.isArray(songsRes.value?.data?.data) ? songsRes.value.data.data : [];
        setPopularSongs(songs.map((s) => ({
          ...s,
          id: s.videoId || s.id,
          videoId: s.videoId || s.id,
          cover: s.thumbnail || s.cover,
          artist: s.channelTitle || s.artist || artistName,
          source: 'jiosaavn',
          playable: Boolean(s.videoId || s.id),
        })));
      }

      if (isMounted) setIsLoading(false);
    };

    fetchAll();
    return () => { isMounted = false; };
  }, [artistName]);

  const formatDuration = (sec) => {
    if (!sec) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Load album cards from TheAudioDB
  const loadAlbumCards = async (force = false) => {
    if (!force && (albumsLoaded || albumsLoading)) return;
    setAlbumsLoading(true);
    setAlbumsError(false);
    try {
      const res = await getArtistAlbums(decodeURIComponent(artistName), { nocache: 'true' });
      const albums = Array.isArray(res?.data?.data) ? res.data.data : [];
      setAlbumCards(albums);
    } catch (e) {
      console.error('Failed to load albums', e);
      setAlbumCards([]);
      setAlbumsError(true);
    } finally {
      setAlbumsLoading(false);
      setAlbumsLoaded(true);
    }
  };

  // Play entire album
  const handlePlayAlbum = async (album, e) => {
    e.stopPropagation();
    try {
      const query = `${decodeURIComponent(artistName)} ${album.name}`;
      const res = await searchSongs(query, 15);
      const songs = Array.isArray(res?.data?.data) ? res.data.data : [];
      if (songs.length > 0) {
        const formattedSongs = songs.map((s) => ({
          ...s,
          id: s.videoId || s.id,
          videoId: s.videoId || s.id,
          cover: s.thumbnail || s.cover,
          artist: s.channelTitle || s.artist || artistName,
          source: 'jiosaavn',
          playable: true,
        }));
        handlePlaySong(formattedSongs[0]);
        if (onQueueTrack) {
          formattedSongs.slice(1).forEach(song => onQueueTrack(song));
        }
      }
    } catch (err) {
      console.error('Error playing album:', err);
    }
  };

  // Queue album
  const handleQueueAlbum = async (album, e) => {
    e.stopPropagation();
    try {
      const query = `${decodeURIComponent(artistName)} ${album.name}`;
      const res = await searchSongs(query, 15);
      const songs = Array.isArray(res?.data?.data) ? res.data.data : [];
      if (songs.length > 0 && onQueueTrack) {
        songs.forEach(s => {
          onQueueTrack({
            ...s,
            id: s.videoId || s.id,
            videoId: s.videoId || s.id,
            cover: s.thumbnail || s.cover,
            artist: s.channelTitle || s.artist || artistName,
            source: 'jiosaavn',
            playable: true,
          });
        });
      }
    } catch (err) {
      console.error('Error queuing album:', err);
    }
  };

  // Filtered + sorted albums
  const filteredSortedAlbums = useMemo(() => {
    let result = [...albumCards];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(album =>
        (album.name || '').toLowerCase().includes(query) ||
        (album.year || '').toString().toLowerCase().includes(query) ||
        (album.genre || '').toLowerCase().includes(query) ||
        (album.label || '').toLowerCase().includes(query)
      );
    }

    if (selectedType !== 'All') {
      const typeLower = selectedType.toLowerCase();
      result = result.filter(album => {
        const albumType = (album.type || '').toLowerCase();
        const title = (album.name || '').toLowerCase();

        if (typeLower === 'albums')       return albumType === 'album';
        if (typeLower === 'ep')           return albumType === 'ep' || title.includes(' ep') || title.includes('(ep)');
        if (typeLower === 'singles')      return albumType === 'single';
        if (typeLower === 'compilations') return albumType === 'compilation' || title.includes('greatest hits') || title.includes('best of');
        if (typeLower === 'movie albums') return title.includes('ost') || title.includes('soundtrack') || albumType.includes('soundtrack') || albumType.includes('movie');
        if (typeLower === 'live albums')  return title.includes('live') || title.includes('concert');
        return true;
      });
    }

    result.sort((a, b) => {
      const getPopularity = (album) => {
        const charCodeSum = (album.name || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
        return (charCodeSum % 100) + (Number(album.year) || 2000) * 0.05;
      };

      if (sortKey === 'Popular')      return getPopularity(b) - getPopularity(a);
      if (sortKey === 'Newest')       return (Number(b.year) || 0) - (Number(a.year) || 0);
      if (sortKey === 'Oldest')       return (Number(a.year) || 9999) - (Number(b.year) || 9999);
      if (sortKey === 'Alphabetical') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });

    return result;
  }, [albumCards, searchQuery, selectedType, sortKey]);

  // Infinite scroll
  useEffect(() => {
    const currentSentinel = albumsSentinelRef.current;
    if (!currentSentinel || activeTab !== 'Albums' || albumsLoading) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => prev + 20);
      }
    }, { rootMargin: '200px' });

    observer.observe(currentSentinel);
    return () => observer.disconnect();
  }, [activeTab, albumsLoading]);

  const handleAlbumClick = (album) => {
    navigate(`/album/${encodeURIComponent(artistName)}/${encodeURIComponent(album.name)}`);
  };

  const loadSinglesSongs = async () => {
    if (singlesLoaded || singlesLoading) return;
    setSinglesLoading(true);
    try {
      const res = await searchSongs(`${decodeURIComponent(artistName)} latest new songs`, 20);
      const songs = Array.isArray(res?.data?.data) ? res.data.data : [];
      setSinglesSongs(songs.map((s) => ({
        ...s,
        id: s.videoId || s.id,
        videoId: s.videoId || s.id,
        cover: s.thumbnail || s.cover,
        artist: s.channelTitle || s.artist || artistName,
        source: 'jiosaavn',
        playable: Boolean(s.videoId || s.id),
      })));
    } catch (e) {
      console.error('Failed to load singles', e);
    } finally {
      setSinglesLoading(false);
      setSinglesLoaded(true);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'Albums') loadAlbumCards();
  };

  const handlePlaySong = (song) => {
    if (onPlayTrack) onPlayTrack(song);
  };
  
  const handleLike = (song, e) => {
    e.stopPropagation();
    if (onLikeUpdate) onLikeUpdate(song);
  };

  return (
    <div className="artist-page">
      <header className="artist-header" style={{ backgroundImage: `url(${artistBanner || artistFanart || artistImage})` }}>
        <div className="artist-header-content">
          <img src={artistImage} alt={artistName} className="artist-profile-img" />
          <div className="artist-title-wrap">
            <div className="artist-badge">
              <CheckCircle2 size={16} fill="#3b82f6" color="#fff" />
              Verified Artist
            </div>
            <h1 className="artist-title">{decodeURIComponent(artistName)}</h1>
            {(listeners || aboutStats.country) && (
              <p className="artist-stats">
                {listeners ? `${formatNumber(listeners)} Monthly Listeners` : ''}
                {listeners && aboutStats.country ? '\u00a0\u2022\u00a0' : ''}
                {aboutStats.country || ''}
                {aboutStats.genre ? ` · ${aboutStats.genre}` : ''}
              </p>
            )}
            <p className="artist-bio-snippet">
              {aboutStats.bio
                ? (aboutStats.bio.length > 180 ? aboutStats.bio.substring(0, 180) + '...' : aboutStats.bio)
                : `${decodeURIComponent(artistName)} is a highly acclaimed artist known for delivering soulful melodies and powerful performances that resonate globally.`}
            </p>
          </div>
        </div>
      </header>

      <div className="artist-actions">
        <button className="btn-play-large" onClick={() => popularSongs[0] && handlePlaySong(popularSongs[0])}>
          <Play size={28} fill="currentColor" />
        </button>
        <button 
          className={`btn-follow ${isFollowing ? 'following' : ''}`}
          onClick={handleFollowToggle}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
        <button className="btn-icon"><Shuffle size={24} /></button>
        <button className="btn-icon"><MoreHorizontal size={24} /></button>
      </div>

      <nav className="artist-tabs-nav">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`artist-tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => handleTabChange(tab)}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="activeTabUnderline"
                className="active-tab-underline"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        ))}
      </nav>

      <div className="artist-content">

        {/* ── Overview Tab ── */}
        {activeTab === 'Overview' && (
          <div className="overview-tab">
            <div className="overview-stats">
              <div className="stat-card">
                <div className="stat-card-icon"><Headphones size={24} /></div>
                <div className="stat-card-info">
                  <span className="stat-card-value">{listeners ? formatNumber(listeners) : '—'}</span>
                  <span className="stat-card-label">Monthly Listeners</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-icon"><UserPlus size={24} /></div>
                <div className="stat-card-info">
                  <span className="stat-card-value">{followers ? formatNumber(followers) : '—'}</span>
                  <span className="stat-card-label">Followers</span>
                </div>
              </div>
              {aboutStats.playcount > 0 && (
                <div className="stat-card">
                  <div className="stat-card-icon"><Music size={24} /></div>
                  <div className="stat-card-info">
                    <span className="stat-card-value">{formatNumber(aboutStats.playcount)}</span>
                    <span className="stat-card-label">All-time Plays</span>
                  </div>
                </div>
              )}
              {aboutStats.country && (
                <div className="stat-card">
                  <div className="stat-card-icon"><Globe size={24} /></div>
                  <div className="stat-card-info">
                    <span className="stat-card-value">{aboutStats.country}</span>
                    <span className="stat-card-label">{aboutStats.genre || 'Origin'}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="overview-grid-section">
              <div className="section-header">
                <h2 className="section-title">Popular Songs</h2>
                <button className="section-see-all filter-dropdown" onClick={() => setActiveTab('Popular Songs')}>See All</button>
              </div>
              <table className="songs-table">
                <tbody>
                  {popularSongs.slice(0, 10).map((song, idx) => (
                    <tr key={song.id || song.videoId} onClick={() => handlePlaySong(song)}>
                      <td className="title-col">
                        <div className="title-col-index">
                          <span className="song-index">{idx + 1}</span>
                          <Play size={16} className="song-play-icon" />
                        </div>
                        <div className="song-info">
                          <img src={song.thumbnail || song.image} alt="" className="song-cover" />
                          <div className="song-details">
                            <span className="song-name">{song.title}</span>
                          </div>
                        </div>
                      </td>
                      <td className="hide-mobile">{song.album || 'Single'}</td>

                      <td>{formatDuration(song.duration)}</td>
                      <td>
                        <div className="row-actions">
                          <Heart size={18} className="cursor-pointer" onClick={(e) => handleLike(song, e)} />
                          <MoreHorizontal size={18} className="cursor-pointer" onClick={(e) => e.stopPropagation()} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="overview-grid-section" style={{ marginTop: 40 }}>
              <h2 className="section-title" style={{ marginBottom: 16 }}>More From This Artist</h2>
              <div className="media-grid-container">
                {popularSongs.slice(0, 6).map((song, i) => (
                  <div key={song.id || i} className="media-card" onClick={() => handlePlaySong(song)}>
                    <div className="media-card-img-wrap">
                      <img src={song.cover || song.thumbnail} alt="" />
                      <button className="media-card-play"><Play size={24} fill="currentColor" /></button>
                    </div>
                    <div className="media-card-title">{song.title}</div>
                    <div className="media-card-subtitle">{song.artist || artistName}</div>
                  </div>
                ))}
                {popularSongs.length === 0 && <p style={{color: '#b3b3b3'}}>No songs found.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── Popular Songs Tab ── */}
        {activeTab === 'Popular Songs' && (
          <div className="popular-songs-tab">
            <div className="section-header">
              <h2 className="section-title">Popular Songs</h2>
            </div>
            <table className="songs-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}># &nbsp; Title</th>
                  <th className="hide-mobile">Album</th>

                  <th><Clock size={16} /></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {popularSongs.map((song, idx) => (
                  <tr key={song.id || song.videoId} onClick={() => handlePlaySong(song)}>
                    <td className="title-col">
                      <div className="title-col-index">
                        <span className="song-index">{idx + 1}</span>
                        <Play size={16} className="song-play-icon" />
                      </div>
                      <div className="song-info">
                        <img src={song.thumbnail || song.image} alt="" className="song-cover" />
                        <div className="song-details">
                          <span className="song-name">{song.title}</span>
                        </div>
                      </div>
                    </td>
                    <td className="hide-mobile">{song.album || 'Single'}</td>

                    <td>{formatDuration(song.duration)}</td>
                    <td>
                      <div className="row-actions">
                        <Heart size={18} className="cursor-pointer" onClick={(e) => handleLike(song, e)} />
                        <MoreHorizontal size={18} className="cursor-pointer" onClick={(e) => e.stopPropagation()} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Albums Tab ── */}
        {activeTab === 'Albums' && (
          <div className="atab-container">

            {/* Controls */}
            <div className="atab-controls">
              <div className="atab-search-wrap">
                <Search size={15} className="atab-search-icon" />
                <input
                  className="atab-search-input"
                  type="text"
                  placeholder="Search albums..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setVisibleCount(100); }}
                />
              </div>
              <select
                className="atab-select"
                value={sortKey}
                onChange={e => { setSortKey(e.target.value); setVisibleCount(100); }}
              >
                <option value="Popular">Popular</option>
                <option value="Newest">Newest</option>
                <option value="Oldest">Oldest</option>
                <option value="Alphabetical">A – Z</option>
              </select>
            </div>

            {/* Filter Chips */}
            <div className="atab-chips">
              {FILTER_TYPES.map(type => (
                <button
                  key={type}
                  className={`atab-chip${selectedType === type ? ' active' : ''}`}
                  onClick={() => { setSelectedType(type); setVisibleCount(100); }}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Skeleton */}
            {albumsLoading && (
              <div className="atab-grid">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="atab-skel-card">
                    <div className="atab-skel-thumb" />
                    <div className="atab-skel-info">
                      <div className="atab-skel-line" style={{ height: 14, width: '80%' }} />
                      <div className="atab-skel-line" style={{ height: 11, width: '50%' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {albumsError && !albumsLoading && (
              <div className="atab-empty">
                <AlertTriangle size={72} color="#ef4444" />
                <h3>Failed to load albums</h3>
                <p>Check your connection and try again.</p>
                <button
                  onClick={() => loadAlbumCards(true)}
                  style={{ marginTop: 8, padding: '10px 24px', background: '#1ed760', color: '#000', border: 'none', borderRadius: 24, fontWeight: 700, cursor: 'pointer' }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty */}
            {!albumsLoading && !albumsError && albumsLoaded && filteredSortedAlbums.length === 0 && (
              <div className="atab-empty">
                <Disc size={80} style={{ color: 'rgba(255,255,255,0.12)' }} />
                <h3>No albums available</h3>
                <p>Try adjusting your search or filter.</p>
              </div>
            )}

            {/* Albums Grid — Categorized or Flat */}
            {!albumsLoading && !albumsError && filteredSortedAlbums.length > 0 && (() => {
              const noFilter = !searchQuery && selectedType === 'All';

              const AlbumGrid = ({ albums }) => (
                <div className="atab-grid">
                  {albums.map(album => {
                    const liked = Boolean(likedAlbums[album.id]);
                    return (
                      <div
                        key={album.id}
                        className="atab-card"
                        onClick={() => handleAlbumClick(album)}
                      >
                        <div className="atab-card-img-wrap">
                          <img src={album.cover} alt={album.name} loading="lazy" />
                          <div className="atab-card-overlay">
                            <div className="atab-card-top-actions">
                              <button
                                className={`atab-card-action-btn${liked ? ' liked' : ''}`}
                                onClick={e => toggleLikeAlbum(album.id, e)}
                                title={liked ? 'Unlike' : 'Like'}
                              >
                                <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
                              </button>
                              <button
                                className="atab-card-action-btn"
                                onClick={e => e.stopPropagation()}
                                title="More"
                              >
                                <MoreHorizontal size={14} />
                              </button>
                            </div>
                          </div>
                          <button
                            className="atab-card-play-btn"
                            onClick={e => handlePlayAlbum(album, e)}
                            title={`Play ${album.name}`}
                          >
                            <Play size={20} fill="currentColor" />
                          </button>
                        </div>
                        <div className="atab-card-info">
                          <div className="atab-card-title">{album.name}</div>
                          <div className="atab-card-meta">
                            {album.year && <span>{album.year}</span>}
                            {album.year && album.type && <span>·</span>}
                            {album.type && <span className="atab-card-type-pill">{album.type}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );

              if (noFilter) {
                const categories = [
                  {
                    label: 'Studio Albums',
                    albums: filteredSortedAlbums.filter(a =>
                      !a.type || a.type.toLowerCase() === 'album'
                    ),
                  },
                  {
                    label: 'Movie Albums',
                    albums: filteredSortedAlbums.filter(a =>
                      a.type && (
                        a.type.toLowerCase().includes('soundtrack') ||
                        a.type.toLowerCase().includes('movie') ||
                        (a.genre || '').toLowerCase().includes('soundtrack')
                      )
                    ),
                  },
                  {
                    label: 'Singles & EPs',
                    albums: filteredSortedAlbums.filter(a =>
                      a.type && (
                        a.type.toLowerCase() === 'single' ||
                        a.type.toLowerCase() === 'ep'
                      )
                    ),
                  },
                  {
                    label: 'Live & Compilations',
                    albums: filteredSortedAlbums.filter(a =>
                      a.type && (
                        a.type.toLowerCase() === 'compilation' ||
                        a.type.toLowerCase() === 'live'
                      )
                    ),
                  },
                ];

                const hasCategories = categories.slice(1).some(c => c.albums.length > 0);

                if (!hasCategories) {
                  return (
                    <>
                      <AlbumGrid albums={filteredSortedAlbums.slice(0, visibleCount)} />
                      {visibleCount < filteredSortedAlbums.length && (
                        <div className="atab-load-more">
                          <button className="atab-load-more-btn" onClick={() => setVisibleCount(v => v + 20)}>
                            Show More
                          </button>
                        </div>
                      )}
                    </>
                  );
                }

                return (
                  <>
                    {categories.map(cat => cat.albums.length === 0 ? null : (
                      <div key={cat.label} className="atab-cat-section">
                        <h2 className="atab-cat-heading">{cat.label}</h2>
                        <AlbumGrid albums={cat.albums.slice(0, visibleCount)} />
                      </div>
                    ))}
                  </>
                );
              }

              return (
                <>
                  <AlbumGrid albums={filteredSortedAlbums.slice(0, visibleCount)} />
                  {visibleCount < filteredSortedAlbums.length && (
                    <div className="atab-load-more">
                      <button className="atab-load-more-btn" onClick={() => setVisibleCount(v => v + 20)}>
                        Show More
                      </button>
                    </div>
                  )}
                </>
              );
            })()}

            <div ref={albumsSentinelRef} className="albums-scroll-sentinel" />
          </div>
        )}

        {/* ── About Tab ── */}
        {activeTab === 'About' && (
          <div className="about-tab">
            <div className="filters-bar">
              <h2 className="section-title">About {decodeURIComponent(artistName)}</h2>
            </div>
            <div className="about-layout">
              <div className="about-sidebar">
                <div className="about-stats-list">
                  {listeners > 0 && (
                    <div className="about-stat-item">
                      <span className="about-stat-label">Monthly Listeners</span>
                      <span className="about-stat-val">{formatNumber(listeners)}</span>
                    </div>
                  )}
                  {followers > 0 && (
                    <div className="about-stat-item">
                      <span className="about-stat-label">Followers</span>
                      <span className="about-stat-val">{formatNumber(followers)}</span>
                    </div>
                  )}
                  {aboutStats.playcount > 0 && (
                    <div className="about-stat-item">
                      <span className="about-stat-label">All-time Plays</span>
                      <span className="about-stat-val">{formatNumber(aboutStats.playcount)}</span>
                    </div>
                  )}
                  {aboutStats.country && (
                    <div className="about-stat-item">
                      <span className="about-stat-label">Country</span>
                      <span className="about-stat-val">{aboutStats.country}</span>
                    </div>
                  )}
                  {aboutStats.genre && (
                    <div className="about-stat-item">
                      <span className="about-stat-label">Genre</span>
                      <span className="about-stat-val">{aboutStats.genre}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="about-main">
                <img src={artistFanart || artistBanner || artistImage} alt="" className="about-hero-img" />
                <div className="about-bio">
                  <p>
                    {aboutStats.bio 
                      ? aboutStats.bio.replace(/<[^>]*>?/gm, '') 
                      : `${decodeURIComponent(artistName)} is a highly acclaimed artist known for delivering soulful melodies and powerful performances that resonate globally. With numerous accolades and chart-topping hits, their music continues to inspire millions.`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
