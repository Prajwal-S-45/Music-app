import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserCheck, Sparkles, Compass, Play, Search, Heart, Music2, Users } from 'lucide-react';
import apiClient from '../api/client';
import '../styles/MyArtistsStyles.css';

function ArtistAvatar({ name, initialImage, className }) {
  const [src, setSrc] = useState(
    initialImage && typeof initialImage === 'string' && initialImage.startsWith('http') && !initialImage.includes('unsplash.com')
      ? initialImage
      : ''
  );
  const generationRef = useRef(0);

  useEffect(() => {
    generationRef.current += 1;
    const currentGen = generationRef.current;

    if (initialImage && typeof initialImage === 'string' && initialImage.startsWith('http') && !initialImage.includes('unsplash.com')) {
      setSrc(initialImage);
      return;
    }

    setSrc('');
    if (!name) return;

    apiClient.get(`/api/music/artist-image?name=${encodeURIComponent(name)}`)
      .then(res => {
        if (generationRef.current === currentGen && res.data?.url) {
          setSrc(res.data.url);
        }
      })
      .catch(() => {});

    return () => {
      generationRef.current += 1;
    };
  }, [name, initialImage]);

  const handleError = () => {
    generationRef.current += 1;
    const currentGen = generationRef.current;
    setSrc('');

    if (name) {
      apiClient.get(`/api/music/artist-image?name=${encodeURIComponent(name)}`)
        .then(res => {
          if (generationRef.current === currentGen && res.data?.url) {
            setSrc(res.data.url);
          }
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
  const [recsError, setRecsError] = useState(null);

  // Sync followed artists from localStorage
  const loadFollowedArtists = () => {
    try {
      const saved = localStorage.getItem('music_app_followed_artists');
      const parsed = saved ? JSON.parse(saved) : [];
      const isValid =
        Array.isArray(parsed) &&
        parsed.every(item => item && typeof item === 'object' && typeof item.name === 'string');
      setFollowedArtists(isValid ? parsed : []);
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
      if (mounted) {
        setIsLoadingRecs(true);
        setRecsError(null);
        setRecommendedArtists([]);
      }
      try {
        const endpoint = user ? '/api/recommendations/artists' : '/api/music/trending-artists';
        const res = await apiClient.get(endpoint, { params: { limit: 8 } });
        if (mounted && res.data?.data) {
          setRecommendedArtists(res.data.data);
        }
      } catch (err) {
        if (mounted) {
          setRecsError('Failed to load recommended artists.');
        }
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
          {followedArtists.length > 0 && (
            <div className="my-artists-search-box">
              <Search size={16} className="my-artists-search-icon" />
              <input
                type="text"
                placeholder="Search followed artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="my-artists-search-input"
              />
            </div>
          )}
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
        ) : filteredFollowed.length === 0 ? (
          <div className="my-artists-empty-card">
            <h3 className="my-artists-empty-title">No Matching Artists Found</h3>
            <p className="my-artists-empty-text">
              No artists in your library match "{searchQuery}".
            </p>
          </div>
        ) : (
          <div className="my-artists-grid">
            {filteredFollowed.map((artist, idx) => (
              <Link
                key={artist.id || idx}
                to={`/artists/${encodeURIComponent(artist.name)}`}
                className="my-artist-card"
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
              </Link>
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

        {isLoadingRecs ? (
          <div className="my-artists-empty-card">
            <p className="my-artists-empty-text">Loading recommendations...</p>
          </div>
        ) : recsError ? (
          <div className="my-artists-empty-card">
            <h3 className="my-artists-empty-title">Unable to Load Recommendations</h3>
            <p className="my-artists-empty-text">{recsError}</p>
          </div>
        ) : recommendedArtists.length > 0 ? (
          <div className="my-artists-grid">
            {recommendedArtists.map((artist, idx) => (
              <Link
                key={artist.id || idx}
                to={`/artists/${encodeURIComponent(artist.name)}`}
                className="my-artist-card"
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
              </Link>
            ))}
          </div>
        ) : (
          <div className="my-artists-empty-card">
            <p className="my-artists-empty-text">No recommended artists available right now.</p>
          </div>
        )}
      </section>
    </div>
  );
}
