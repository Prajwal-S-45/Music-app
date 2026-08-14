import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Album, Heart, Play, Search, Sparkles, Disc, Compass } from 'lucide-react';
import { getLikedAlbums, likeAlbum, unlikeAlbum, searchSongs, getAlbumDetails, searchCategory } from '../api/musicApi';
import '../styles/AlbumsStyles.css';

const LOCAL_STORAGE_KEY = 'music_app_liked_albums';

export default function AlbumsPage({ token, user, onPlayTrack, onQueueTrack }) {
  const navigate = useNavigate();
  const [likedAlbums, setLikedAlbums] = useState([]);
  const [suggestedAlbums, setSuggestedAlbums] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [loading, setLoading] = useState(true);
  const [loadingSuggested, setLoadingSuggested] = useState(true);

  // Helper to read local storage fallback
  const getLocalLikedAlbums = () => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Load liked albums dynamically from backend API + LocalStorage fallback
  const fetchLikedAlbums = useCallback(async () => {
    setLoading(true);
    let apiAlbums = [];
    if (token) {
      try {
        const res = await getLikedAlbums(token);
        if (res.data?.data) {
          apiAlbums = res.data.data;
        }
      } catch (err) {
        console.warn('Failed to fetch liked albums from server:', err.message);
      }
    }

    const localAlbums = getLocalLikedAlbums();
    const albumMap = new Map();
    localAlbums.forEach((alb) => {
      const key = String(alb.id || alb.album_id || alb.name).toLowerCase();
      albumMap.set(key, alb);
    });
    apiAlbums.forEach((alb) => {
      const key = String(alb.id || alb.album_id || alb.name).toLowerCase();
      albumMap.set(key, alb);
    });

    const combined = Array.from(albumMap.values());
    setLikedAlbums(combined);
    setLoading(false);
  }, [token]);

  // Fetch popular/trending soundtrack albums dynamically from API (no static data!)
  const fetchSuggestedAlbums = useCallback(async () => {
    setLoadingSuggested(true);
    try {
      const res = await searchCategory('albums', 'Hindi Movie Soundtracks', 14);
      const items = res.data?.data || [];
      const mapped = items.map((alb, index) => ({
        id: alb.id || `dyn-album-${index}`,
        album_id: alb.id,
        name: alb.name || alb.title || 'Soundtrack Album',
        artist: alb.artist || alb.music || alb.singers || 'Various Artists',
        year: alb.year || alb.release_date || '',
        type: alb.type || 'Movie Album',
        cover: alb.cover || alb.image || alb.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=500&q=80',
      }));
      setSuggestedAlbums(mapped);
    } catch (err) {
      console.warn('Failed to fetch suggested albums dynamically:', err);
      setSuggestedAlbums([]);
    } finally {
      setLoadingSuggested(false);
    }
  }, []);

  useEffect(() => {
    fetchLikedAlbums();
    fetchSuggestedAlbums();

    const handleSync = () => fetchLikedAlbums();
    window.addEventListener('likedAlbumsUpdated', handleSync);
    return () => window.removeEventListener('likedAlbumsUpdated', handleSync);
  }, [fetchLikedAlbums, fetchSuggestedAlbums]);

  // Check if an album is liked
  const isAlbumLiked = useCallback(
    (album) => {
      const key = String(album.id || album.album_id || album.name).toLowerCase();
      return likedAlbums.some(
        (a) => String(a.id || a.album_id || a.name).toLowerCase() === key
      );
    },
    [likedAlbums]
  );

  // Toggle Like / Unlike an album
  const handleToggleLike = async (e, album) => {
    e.stopPropagation();
    const albumId = String(album.id || album.album_id || album.name).trim();
    const liked = isAlbumLiked(album);

    let updatedLocal;
    const local = getLocalLikedAlbums();

    if (liked) {
      // Unlike
      updatedLocal = local.filter(
        (a) => String(a.id || a.album_id || a.name).toLowerCase() !== albumId.toLowerCase()
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLocal));
      if (token) {
        try {
          await unlikeAlbum(albumId, token);
        } catch (err) {
          console.warn('Server unlike error:', err.message);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local));
          alert(`Failed to unsave album: ${err.message || 'Server error'}`);
        }
      }
    } else {
      // Like
      const payload = {
        albumId,
        id: albumId,
        name: album.name || album.title,
        artist: album.artist || 'Unknown Artist',
        cover: album.cover || album.image || album.thumbnail,
        year: album.year || '',
        type: album.type || 'Movie Album',
      };
      updatedLocal = [payload, ...local.filter((a) => String(a.album_id || a.id || a.name).toLowerCase() !== albumId.toLowerCase())];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLocal));
      if (token) {
        try {
          await likeAlbum(payload, token);
        } catch (err) {
          console.warn('Server like error:', err.message);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local));
          alert(`Failed to save album: ${err.message || 'Server error'}`);
        }
      }
    }

    window.dispatchEvent(new CustomEvent('likedAlbumsUpdated'));
    fetchLikedAlbums();
  };

  // Play full album dynamically
  const handlePlayAlbum = async (e, album) => {
    e.stopPropagation();
    try {
      let songs = [];
      const albumId = album.id || album.album_id;
      if (albumId && !String(albumId).startsWith('dyn-')) {
        const res = await getAlbumDetails(albumId).catch(() => null);
        const details = res?.data?.data || res?.data;
        if (details && Array.isArray(details.songs) && details.songs.length > 0) {
          songs = details.songs;
        }
      }

      if (songs.length === 0) {
        const query = `${album.name} movie songs`;
        const res = await searchSongs(query, 25);
        const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.data) ? res.data.data : [];
        songs = arr.map((s) => ({
          ...s,
          id: s.id,
          title: s.title || s.name,
          cover: s.thumbnail || s.cover || album.cover,
          artist: s.artist || album.artist,
          source: 'jiosaavn',
        }));
      }

      if (songs.length > 0 && onPlayTrack) {
        onPlayTrack(songs[0]);
        if (onQueueTrack && songs.length > 1) {
          songs.slice(1).forEach((t) => onQueueTrack(t));
        }
      }
    } catch (err) {
      console.error('Error playing album:', err);
    }
  };

  // Open Album Detail Page
  const handleNavigateToAlbum = (album) => {
    const albumName = album.name || album.title;
    if (!albumName) {
      console.warn('Invalid album: Name or title is missing.', album);
      return;
    }
    const artist = encodeURIComponent(album.artist || 'Various Artists');
    const name = encodeURIComponent(albumName);
    const idQuery = album.id && !String(album.id).startsWith('dyn-') ? `?id=${encodeURIComponent(album.id)}` : '';
    navigate(`/album/${artist}/${name}${idQuery}`);
  };

  // Filter & Sort
  const filteredAlbums = likedAlbums.filter((album) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (album.name || '').toLowerCase().includes(q) ||
      (album.artist || '').toLowerCase().includes(q)
    );
  });

  const sortedAlbums = [...filteredAlbums].sort((a, b) => {
    if (sortBy === 'name') {
      return (a.name || '').localeCompare(b.name || '');
    }
    if (sortBy === 'artist') {
      return (a.artist || '').localeCompare(b.artist || '');
    }
    return 0; // recent (default)
  });

  return (
    <div className="albums-page">
      {/* ── Header ── */}
      <div className="albums-header">
        <div className="albums-header__main">
          <div className="albums-header__icon-badge">
            <Album size={36} />
          </div>
          <div>
            <h1 className="albums-header__title">My Album Library</h1>
            <p className="albums-header__subtitle">
              Your saved movie soundtrack albums, studio albums, and full collections.
            </p>
          </div>
        </div>
        <div className="albums-header__count-badge">
          <Disc size={18} color="#a855f7" />
          <span>
            {likedAlbums.length} {likedAlbums.length === 1 ? 'Saved Album' : 'Saved Albums'}
          </span>
        </div>
      </div>

      {/* ── Controls (Search & Sort) ── */}
      {likedAlbums.length > 0 && (
        <div className="albums-controls">
          <div className="albums-search-wrap">
            <Search size={18} className="albums-search-icon" />
            <input
              type="text"
              className="albums-search-input"
              placeholder="Search in saved albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="albums-sort-wrap">
            <span className="albums-sort-label">Sort by:</span>
            <select
              className="albums-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="recent">Recently Added</option>
              <option value="name">Album Name (A-Z)</option>
              <option value="artist">Artist Name</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Saved Albums Section ── */}
      <section className="albums-section">
        <h2 className="albums-section__title">
          <Heart size={22} color="#ef4444" fill="#ef4444" /> Saved Albums
        </h2>

        {loading ? (
          <div className="albums-loading">
            <div className="albums-loading-spinner" />
            <p className="albums-loading-text">Loading your albums...</p>
          </div>
        ) : sortedAlbums.length === 0 ? (
          <div className="albums-empty-card">
            <div className="albums-empty-icon">
              <Album size={32} />
            </div>
            <h3 className="albums-empty-title">
              {searchQuery ? 'No matching albums found' : 'Your Album Library is Empty'}
            </h3>
            <p className="albums-empty-text">
              {searchQuery
                ? `No saved albums match "${searchQuery}". Try clearing your search.`
                : 'Save full movie soundtracks and music albums to keep them organized in your Albums library.'}
            </p>
            {!searchQuery && suggestedAlbums.length > 0 && (
              <button
                className="albums-cta-btn"
                onClick={() => {
                  const el = document.getElementById('popular-soundtracks-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Compass size={18} /> Discover Suggested Soundtracks Below
              </button>
            )}
          </div>
        ) : (
          <div className="albums-grid">
            {sortedAlbums.map((album, idx) => {
              const liked = isAlbumLiked(album);
              return (
                <div
                  key={album.id || album.album_id || idx}
                  className="album-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNavigateToAlbum(album)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      if (e.target !== e.currentTarget) return;
                      e.preventDefault();
                      handleNavigateToAlbum(album);
                    }
                  }}
                >
                  <button
                    type="button"
                    className={`album-card__like-btn ${liked ? 'liked' : ''}`}
                    onClick={(e) => handleToggleLike(e, album)}
                    title={liked ? 'Remove from Saved Albums' : 'Save to Albums'}
                  >
                    <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
                  </button>

                  <div className="album-card__img-wrap">
                    <img
                      src={
                        album.cover ||
                        album.image ||
                        album.thumbnail ||
                        'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=500&q=80'
                      }
                      alt={album.name}
                      className="album-card__img"
                      loading="lazy"
                    />
                    <div className="album-card__overlay">
                      <button
                        type="button"
                        className="album-card__play-btn"
                        onClick={(e) => handlePlayAlbum(e, album)}
                        title={`Play ${album.name}`}
                      >
                        <Play size={24} fill="currentColor" />
                      </button>
                    </div>
                  </div>

                  <div className="album-card__info">
                    <h3 className="album-card__title">{album.name || album.title}</h3>
                    <span className="album-card__artist">{album.artist || 'Various Artists'}</span>
                    <div className="album-card__meta">
                      <span className="album-card__type-tag">{album.type || 'Movie Album'}</span>
                      {album.year && <span>• {album.year}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Dynamic Live Discovery: Suggested Soundtracks & Albums ── */}
      {suggestedAlbums.length > 0 && (
        <section className="albums-section" id="popular-soundtracks-section">
          <h2 className="albums-section__title">
            <Sparkles size={22} color="#a855f7" /> Suggested Albums & Soundtracks
          </h2>

          <div className="albums-grid">
            {suggestedAlbums.map((album) => {
              const liked = isAlbumLiked(album);
              return (
                <div
                  key={album.id}
                  className="album-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNavigateToAlbum(album)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      if (e.target !== e.currentTarget) return;
                      e.preventDefault();
                      handleNavigateToAlbum(album);
                    }
                  }}
                >
                  <button
                    type="button"
                    className={`album-card__like-btn ${liked ? 'liked' : ''}`}
                    onClick={(e) => handleToggleLike(e, album)}
                    title={liked ? 'Remove from Saved Albums' : 'Save to Albums'}
                  >
                    <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
                  </button>

                  <div className="album-card__img-wrap">
                    <img
                      src={album.cover}
                      alt={album.name}
                      className="album-card__img"
                      loading="lazy"
                    />
                    <div className="album-card__overlay">
                      <button
                        type="button"
                        className="album-card__play-btn"
                        onClick={(e) => handlePlayAlbum(e, album)}
                        title={`Play ${album.name}`}
                      >
                        <Play size={24} fill="currentColor" />
                      </button>
                    </div>
                  </div>

                  <div className="album-card__info">
                    <h3 className="album-card__title">{album.name}</h3>
                    <span className="album-card__artist">{album.artist}</span>
                    <div className="album-card__meta">
                      <span className="album-card__type-tag">{album.type}</span>
                      {album.year && <span>• {album.year}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
