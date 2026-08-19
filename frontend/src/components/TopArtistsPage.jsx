import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, TrendingUp, Play, Flame, Music, Sparkles, Grid, List as ListIcon, Heart, Search } from 'lucide-react';
import apiClient from '../api/client';
import '../styles/TopArtistsStyles.css';

const DEFAULT_ARTIST_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231e293b"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="%2338bdf8" font-size="36" font-family="sans-serif" font-weight="bold">🎵</text></svg>';

const handleArtistImageError = (e, name) => {
  const img = e?.target;
  if (!img) return;

  img.onerror = () => {
    img.onerror = null;
    if (img.alt === name) {
      img.src = DEFAULT_ARTIST_SVG;
    }
  };

  if (!name) {
    if (img.alt === name || !img.alt) {
      img.src = DEFAULT_ARTIST_SVG;
    }
    return;
  }

  apiClient
    .get(`/api/music/artist-image?name=${encodeURIComponent(name)}`)
    .then((res) => {
      if (img.alt !== name) return;
      if (res.data?.url) {
        img.src = res.data.url;
      } else {
        img.src = DEFAULT_ARTIST_SVG;
      }
    })
    .catch(() => {
      if (img.alt !== name) return;
      img.src = DEFAULT_ARTIST_SVG;
    });
};

const GENRES = ['All Languages', 'Hindi', 'Punjabi', 'Tamil', 'Telugu', 'English', 'Malayalam'];

export default function TopArtistsPage({ user }) {
  const navigate = useNavigate();
  const [artists, setArtists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState('All Languages');
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTopArtists = async (isMountedRef) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get('/api/music/trending-artists', {
        params: { limit: 50 }
      });
      if (!isMountedRef || isMountedRef.current) {
        if (res.data?.data) {
          setArtists(res.data.data);
        }
      }
    } catch (err) {
      console.error('Failed to load top artists chart:', err);
      if (!isMountedRef || isMountedRef.current) {
        setError(err?.message || 'Failed to load top artists chart');
      }
    } finally {
      if (!isMountedRef || isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const isMountedRef = { current: true };
    fetchTopArtists(isMountedRef);
    return () => { isMountedRef.current = false; };
  }, []);

  const filteredArtists = artists.filter(artist => {
    const matchesGenre = selectedGenre === 'All Languages' || 
      (artist.language && artist.language.toLowerCase() === selectedGenre.toLowerCase());
    const matchesQuery = !searchQuery || 
      artist.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGenre && matchesQuery;
  });

  const podiumTop3 = filteredArtists.slice(0, 3);
  const leaderboardRest = filteredArtists.slice(3);

  const getMonthlyListeners = (score, index) => {
    if (score) return `${(score * 0.3 + 5.2).toFixed(1)}M listeners`;
    return `${(18.5 - index * 0.4).toFixed(1)}M listeners`;
  };

  return (
    <div className="top-artists-page">
      {/* Hero Banner */}
      <div className="top-artists-hero">
        <div className="top-artists-hero__bg-glow" />
        <div className="top-artists-hero__content">
          <div className="top-artists-hero__badge">
            <Flame size={14} /> Global Charts & Trending
          </div>
          <h1 className="top-artists-hero__title">Top Platform Artists</h1>
          <p className="top-artists-hero__subtitle">
            The most streamed, trending, and celebrated musical artists across the platform right now.
          </p>
          <div className="top-artists-hero__stats">
            <div className="top-artists-stat-item">
              <span className="top-artists-stat-value">#1 Charts</span>
              <span className="top-artists-stat-label">Global Leaderboard</span>
            </div>
            <div className="top-artists-stat-item">
              <span className="top-artists-stat-value">50+</span>
              <span className="top-artists-stat-label">Charted Artists</span>
            </div>
            <div className="top-artists-stat-item">
              <span className="top-artists-stat-value">Current</span>
              <span className="top-artists-stat-label">Stream Rankings</span>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: '#94a3b8',
          background: 'rgba(30, 41, 59, 0.4)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          margin: '24px 0'
        }}>
          <Sparkles size={28} style={{ marginBottom: '12px', color: '#38bdf8' }} />
          <p style={{ fontSize: '16px', fontWeight: '500', margin: 0 }}>Loading top artists chart...</p>
        </div>
      ) : error ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: '#f8fafc',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '16px',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          margin: '24px 0'
        }}>
          <p style={{ color: '#f87171', fontSize: '15px', fontWeight: '500', marginBottom: '16px' }}>
            {error}
          </p>
          <button
            onClick={() => fetchTopArtists()}
            className="podium-btn"
            style={{ margin: '0 auto', background: '#ef4444', borderColor: '#ef4444', color: '#fff' }}
          >
            Retry Loading Chart
          </button>
        </div>
      ) : (
        <>
          {/* Top 3 Podium Cards */}
          {podiumTop3.length >= 3 && (
            <section className="top-artists-podium-section">
              <div className="section-title-row">
                <h2><Trophy size={22} color="#eab308" /> Top 3 Platform Icons</h2>
              </div>
              <div className="top-artists-podium">
                {/* Rank 2 */}
                <div className="podium-card podium-card--rank-2" onClick={() => navigate(`/artists/${encodeURIComponent(podiumTop3[1]?.name)}`)}>
                  <div className="podium-badge podium-badge--2">🥈 #2 Rank</div>
                  <div className="podium-avatar-wrapper">
                    <img src={podiumTop3[1]?.image} alt={podiumTop3[1]?.name} className="podium-avatar" onError={(e) => handleArtistImageError(e, podiumTop3[1]?.name)} />
                  </div>
                  <div className="podium-name">{podiumTop3[1]?.name}</div>
                  <div className="podium-listeners">{getMonthlyListeners(podiumTop3[1]?.trendingScore, 1)}</div>
                  <button className="podium-btn"><Play size={14} /> View Profile</button>
                </div>

                {/* Rank 1 */}
                <div className="podium-card podium-card--rank-1" onClick={() => navigate(`/artists/${encodeURIComponent(podiumTop3[0]?.name)}`)}>
                  <div className="podium-badge podium-badge--1"><Sparkles size={14} /> 👑 #1 Chart Leader</div>
                  <div className="podium-avatar-wrapper">
                    <img src={podiumTop3[0]?.image} alt={podiumTop3[0]?.name} className="podium-avatar" onError={(e) => handleArtistImageError(e, podiumTop3[0]?.name)} />
                  </div>
                  <div className="podium-name">{podiumTop3[0]?.name}</div>
                  <div className="podium-listeners">{getMonthlyListeners(podiumTop3[0]?.trendingScore, 0)}</div>
                  <button className="podium-btn"><Play size={14} /> View Profile</button>
                </div>

                {/* Rank 3 */}
                <div className="podium-card podium-card--rank-3" onClick={() => navigate(`/artists/${encodeURIComponent(podiumTop3[2]?.name)}`)}>
                  <div className="podium-badge podium-badge--3">🥉 #3 Rank</div>
                  <div className="podium-avatar-wrapper">
                    <img src={podiumTop3[2]?.image} alt={podiumTop3[2]?.name} className="podium-avatar" onError={(e) => handleArtistImageError(e, podiumTop3[2]?.name)} />
                  </div>
                  <div className="podium-name">{podiumTop3[2]?.name}</div>
                  <div className="podium-listeners">{getMonthlyListeners(podiumTop3[2]?.trendingScore, 2)}</div>
                  <button className="podium-btn"><Play size={14} /> View Profile</button>
                </div>
              </div>
            </section>
          )}

          {/* Filter and Control Bar */}
          <div className="top-artists-controls">
            <div className="genre-pills">
              {GENRES.map(genre => (
                <button
                  key={genre}
                  className={`genre-pill ${selectedGenre === genre ? 'active' : ''}`}
                  onClick={() => setSelectedGenre(genre)}
                >
                  {genre}
                </button>
              ))}
            </div>

            <div className="view-mode-toggle">
              <button
                className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <ListIcon size={18} />
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <Grid size={18} />
              </button>
            </div>
          </div>

          {/* Leaderboard Table / List / Grid */}
          <div className={`top-artists-leaderboard top-artists-leaderboard--${viewMode}`}>
            {leaderboardRest.map((artist, idx) => {
              const rank = idx + 4;
              return (
                <div
                  key={artist.id || rank}
                  className="leaderboard-row"
                  onClick={() => navigate(`/artists/${encodeURIComponent(artist.name)}`)}
                >
                  <div className={`leaderboard-rank ${rank <= 10 ? 'leaderboard-rank--top10' : ''}`}>
                    #{rank}
                  </div>

                  <div className="leaderboard-artist-info">
                    <img src={artist.image} alt={artist.name} className="leaderboard-avatar" onError={(e) => handleArtistImageError(e, artist.name)} />
                    <div>
                      <div className="leaderboard-name">{artist.name}</div>
                      <div className="leaderboard-lang">{artist.language || 'Global'}</div>
                    </div>
                  </div>

                  <div className="leaderboard-listeners">
                    {getMonthlyListeners(artist.trendingScore, idx + 3)}
                  </div>

                  <div className="leaderboard-trend">
                    <TrendingUp size={16} /> Trending
                  </div>

                  <div className="leaderboard-actions">
                    <button className="podium-btn" onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/artists/${encodeURIComponent(artist.name)}`);
                    }}>
                      <Play size={14} /> Profile
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
