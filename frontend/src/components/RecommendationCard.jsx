import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchPopularSongs, fetchRecommendations } from '../api/musicApi';

const RecommendationCard = () => {
  const [popularSongs, setPopularSongs] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // Fetch popular songs when component loads
  useEffect(() => {
    const fetchMusicData = async () => {
      try {
        // Fetch popular songs
        const popularRes = await fetchPopularSongs({ limit: 20 });
        setPopularSongs(popularRes.data || []);

        // Fetch personalized recommendations
        const recommendationsRes = await fetchRecommendations({ limit: 5 });
        setRecommendations(recommendationsRes.data || []);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching recommendation data:', error);
        setLoading(false);
      }
    };

    fetchMusicData();
  }, [navigate]);

  // If we're on the profile or home page, show recommendations prominently
  const isHomeOrProfilePage =
    location.pathname === '/' ||
    location.pathname === '/profile' ||
    location.pathname.startsWith('/profile/') ||
    location.pathname === '/history';

  // Render based on current route
  if (!isHomeOrProfilePage) {
    // If not on home/profile/history pages, don't render recommendation components
    return null;
  }

  return (
    <div className="recommendations-section" style={{ marginTop: '20px' }}>
      <h3>Recommended Songs</h3>

      {/* Featured Recommendations */}
      <div className="recommendations-preview" style={{
        padding: '10px',
        backgroundColor: '#1f2937',
        borderRadius: '8px',
        marginBottom: '15px',
        border: '1px solid #e5e7fa'
      }}>
        {recommendations.length > 0 ? (
          <div style={{ display: 'flex', gap: '10px' }}>
            {recommendations.slice(0, 3).map(recommendation => (
              <div
                key={recommendation.id}
                onClick={() => navigate(`/track/${recommendation.id}`)}
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(50, 231, 174, 0.1)',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                {recommendation.thumbnail && (
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginBottom: '4px',
                    backgroundImage: `url(${recommendation.thumbnail})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }} />
                )}
                <div style={{
                  color: '#fff',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  letterSpacing: '0.5px',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  height: '1.5rem',
                  display: '-webkit-box',
                  WebkitLineClamp: '1',
                  WebkitBoxOrient: 'vertical'
                }}>
                  {recommendation.title || recommendation.name || 'Unknown Song'}
                </div>
                <div style={{
                  color: '#a1b2a8',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}>
                  {recommendation.artist || 'Unknown Artist'}
                </div>
                {recommendation.score !== undefined && (
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    fontSize: '0.6rem',
                    color: '#59d363',
                    fontWeight: '600'
                  }}>
                    {(recommendation.score * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <span style={{ color: '#888', pointerEvents: 'none' }}>No recommendations yet</span>
          </div>
        )}
      </div>

      {/* Popular Songs Grid */}
      {popularSongs.length > 0 && (
        <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {popularSongs.slice(0, 9).map(song => (
            <div
              key={song.id}
              onClick={() => navigate(`/track/${song.id}`)}
              style={{
                padding: '10px',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: 'rgba(30, 41, 56, 0.1)',
                transition: 'all 0.2s',
                textAlign: 'center',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}
            >
              {song.thumbnail && (
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  margin: '0 auto 6px',
                  backgroundImage: `url(${song.thumbnail})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }} />
              )}
              <div style={{
                color: '#ffffff',
                height: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                  {song.title || 'Unknown Title'}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: '400' }}>{song.artist || 'Unknown Artist'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecommendationCard;