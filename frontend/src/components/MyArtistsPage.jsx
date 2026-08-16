import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Sparkles, Compass, Play, Search, Heart, Music2, Users } from 'lucide-react';
import apiClient from '../api/client';
import '../styles/MyArtistsStyles.css';

function ArtistAvatar({ name, initialImage, className }) {
  const [src, setSrc] = useState(
    initialImage && typeof initialImage === 'string' && initialImage.startsWith('http') && !initialImage.includes('unsplash.com')
      ? initialImage
      : ''
  );

  useEffect(() => {
    if (initialImage && typeof initialImage === 'string' && initialImage.startsWith('http') && !initialImage.includes('unsplash.com')) {
      setSrc(initialImage);
      return;
    }
    if (!name) return;
    let isMounted = true;
    apiClient.get(`/api/music/artist-image?name=${encodeURIComponent(name)}`)
      .then(res => {
        if (isMounted && res.data?.url) setSrc(res.data.url);
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [name, initialImage]);

  const handleError = () => {
    if (name) {
      apiClient.get(`/api/music/artist-image?name=${encodeURIComponent(name)}`)
        .then(res => {
          if (res.data?.url) setSrc(res.data.url);
        })
        .catch(() => {});
    }
  };

  if (!src) {
    return (
      <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e293b, #334155)', color: '#38bdf8', fontWeight: 700, fontSize: 24 }}>
        {name ? name.charAt(0).toUpperCase() : 'A'}
      </div>
    );
  }

  return <img src={src} alt={name} className={className} onError={handleError} />;
}

export default function MyArtistsPage({ user }) {
  const navigate = useNavigate();
  const [followedArtists, setFollowedArtists] = useState([]);
  const [recommendedArtists, setRecommendedArtists] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingRecs, setIsLoadingRecs] = useState(true);

  // Sync followed artists from localStorage
  const loadFollowedArtists = () => {
    try {
      const saved = localStorage.getItem('music_app_followed_artists');
      setFollowedArtists(saved ? JSON.parse(saved) : []);
    } catch {
      setFollowedArtists([]);
    }
  };

  useEffect(() => {
    loadFollowedArtists();
    const handleSync = () => loadFollowedArtists();
    window.addEventListener('followedArtistsUpdated', handleSync);
    return () => window.removeEventListener('followedArtistsUpdated', handleSync);
  }, []);

  // Fetch recommended artists
  useEffect(() => {
    let mounted = true;
    const fetchRecs = async () => {
      try {
        setIsLoadingRecs(true);
        const endpoint = user ? '/api/recommendations/artists' : '/api/music/trending-artists';
        const res = await apiClient.get(endpoint, { params: { limit: 8 } });
        if (mounted && res.data?.data) {
          setRecommendedArtists(res.data.data);
        }
      } catch (err) {
        console.warn('Failed to load recommended artists:', err);
      } finally {
        if (mounted) setIsLoadingRecs(false);
      }
    };

    fetchRecs();
    return () => { mounted = false; };
  }, [user]);

  const unfollowArtist = (e, artistName) => {
    e.stopPropagation();
    const updated = followedArtists.filter(fa => fa.name.toLowerCase() !== artistName.toLowerCase());
    setFollowedArtists(updated);
    localStorage.setItem('music_app_followed_artists', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('followedArtistsUpdated'));
  };

  const filteredFollowed = followedArtists.filter(fa =>
    !searchQuery || fa.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="my-artists-page">
      {/* Personal Library Header */}
      <div className="my-artists-header">
        <div className="my-artists-header__title-row">
          <div className="my-artists-header__icon-box">
            <Music2 size={28} />
          </div>
          <div>
            <h1 className="my-artists-header__title">My Artist Library</h1>
            <p className="my-artists-header__subtitle">
              Your customized personal space for followed artists, saved musicians, and curated recommendations.
            </p>
          </div>
        </div>
        <div className="my-artists-stats-pill">
          <UserCheck size={16} />
          {followedArtists.length} {followedArtists.length === 1 ? 'Artist Followed' : 'Artists Followed'}
        </div>
      </div>

      {/* Followed Artists Section */}
      <section className="my-artists-section">
        <div className="my-artists-section__header">
          <h2 className="my-artists-section__title">
            <UserCheck size={20} color="#10b981" /> Artists You Follow
          </h2>
        </div>

        {followedArtists.length === 0 ? (
          <div className="my-artists-empty-card">
            <div className="my-artists-empty-icon">
              <Users size={32} />
            </div>
            <h3 className="my-artists-empty-title">Your Artist Library is Empty</h3>
            <p className="my-artists-empty-text">
              Follow your favorite musicians to build your custom library and stay updated on their latest tracks and releases.
            </p>
            <button className="my-artists-cta-btn" onClick={() => navigate('/top-artists')}>
              <Compass size={16} style={{ display: 'inline', marginRight: '6px' }} /> Explore Global Top Artists
            </button>
          </div>
        ) : (
          <div className="my-artists-grid">
            {filteredFollowed.map((artist, idx) => (
              <div
                key={artist.id || idx}
                className="my-artist-card"
                onClick={() => navigate(`/artists/${encodeURIComponent(artist.name)}`)}
              >
                <ArtistAvatar
                  name={artist.name}
                  initialImage={artist.image || artist.photo}
                  className="my-artist-avatar"
                />
                <div className="my-artist-name">{artist.name}</div>
                <div className="my-artist-role">{artist.role || 'Artist'}</div>
                <button
                  className="my-artist-unfollow-btn"
                  onClick={(e) => unfollowArtist(e, artist.name)}
                >
                  Following ✓
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Personalized Recommendations */}
      <section className="my-artists-section">
        <div className="my-artists-section__header">
          <h2 className="my-artists-section__title">
            <Sparkles size={20} color="#38bdf8" /> Suggested For Your Taste
          </h2>
        </div>

        <div className="my-artists-grid">
          {recommendedArtists.map((artist, idx) => (
            <div
              key={artist.id || idx}
              className="my-artist-card"
              onClick={() => navigate(`/artists/${encodeURIComponent(artist.name)}`)}
            >
              <ArtistAvatar
                name={artist.name}
                initialImage={artist.image || artist.thumbnail}
                className="my-artist-avatar"
              />
              <div className="my-artist-name">{artist.name}</div>
              <div className="my-artist-role">{artist.language || 'Trending'}</div>
              <button
                className="podium-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/artists/${encodeURIComponent(artist.name)}`);
                }}
              >
                <Play size={12} /> Explore
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
