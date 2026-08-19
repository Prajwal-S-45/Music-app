import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { fetchPopularSongs, fetchRecommendations } from '../api/musicApi';

const RecommendationCard = () => {
  const [popularSongs, setPopularSongs] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const [recsLoading, setRecsLoading] = useState(true);
  const [popularError, setPopularError] = useState(null);
  const [recsError, setRecsError] = useState(null);
  const location = useLocation();

  // If we're on the profile or home page, show recommendations prominently
  const isHomeOrProfilePage =
    location.pathname === '/' ||
    location.pathname === '/profile' ||
    location.pathname.startsWith('/profile/') ||
    location.pathname === '/history';

  // Fetch popular songs and recommendations independently when eligible
  useEffect(() => {
    if (!isHomeOrProfilePage) return;

    let isMounted = true;

    const getPopular = async () => {
      setPopularLoading(true);
      setPopularError(null);
      try {
        const popularRes = await fetchPopularSongs({ limit: 20 });
        if (isMounted) {
          setPopularSongs(popularRes.data || []);
        }
      } catch (error) {
        console.error('Error fetching popular songs:', error);
        if (isMounted) {
          setPopularError(error?.message || 'Failed to load popular songs');
        }
      } finally {
        if (isMounted) setPopularLoading(false);
      }
    };

    const getRecommendations = async () => {
      setRecsLoading(true);
      setRecsError(null);
      try {
        const recommendationsRes = await fetchRecommendations({ limit: 5 });
        if (isMounted) {
          setRecommendations(recommendationsRes.data || []);
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        if (isMounted) {
          setRecsError(error?.message || 'Failed to load recommendations');
        }
      } finally {
        if (isMounted) setRecsLoading(false);
      }
    };

    getPopular();
    getRecommendations();

    return () => {
      isMounted = false;
    };
  }, [isHomeOrProfilePage]);

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
        {recsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px' }}>
            <span style={{ color: '#888' }}>Loading recommendations...</span>
          </div>
        ) : recsError ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px' }}>
            <span style={{ color: '#ef4444' }}>Failed to load recommendations</span>
          </div>
        ) : recommendations.length > 0 ? (
          <div style={{ display: 'flex', gap: '10px' }}>
            {recommendations.slice(0, 3).map(recommendation => (
              <Link
                key={recommendation.id}
                to={`/track/${recommendation.id}`}
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(50, 231, 174, 0.1)',
                  transition: 'all 0.2s',
                  position: 'relative',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block'
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
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <span style={{ color: '#888', pointerEvents: 'none' }}>No recommendations yet</span>
          </div>
        )}
      </div>

      {/* Popular Songs Grid */}
      {popularLoading ? (
        <div style={{ padding: '10px', color: '#888', textAlign: 'center' }}>
          Loading popular songs...
        </div>
      ) : popularError ? (
        <div style={{ padding: '10px', color: '#ef4444', textAlign: 'center' }}>
          Failed to load popular songs
        </div>
      ) : popularSongs.length > 0 ? (
        <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {popularSongs.slice(0, 9).map(song => (
            <Link
              key={song.id}
              to={`/track/${song.id}`}
              style={{
                padding: '10px',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: 'rgba(30, 41, 56, 0.1)',
                transition: 'all 0.2s',
                textAlign: 'center',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block'
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
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default RecommendationCard;