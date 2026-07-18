import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { deleteSavedQueue, getSavedQueues, renameSavedQueue } from '../utils/savedQueues';
import PlaylistCard from './PlaylistCard';
import { 
  Search, Plus, LayoutGrid, List, ArrowLeft, Bell, User, Download, Music, 
  Heart, Disc, Radio, Mic, Clock, RefreshCw, Shuffle, Settings, ChevronRight, 
  Play, Crown, X 
} from 'lucide-react';
import apiClient from '../api/client';
import premiumBg from '../assets/premium_header_bg.png';
import nonPremiumBg from '../assets/non_premium_header_bg.png';
import '../styles/Playlists.css';

function Playlists({ user: propUser, onUserUpdate, onPlayAll }) {
  const token = localStorage.getItem('token');
  const user = propUser || JSON.parse(localStorage.getItem('user') || 'null');

  const [savedQueues, setSavedQueues] = useState([]);
  const [likedCount, setLikedCount] = useState(0);
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const clearMessageTimerRef = useRef(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const [mobileActiveView, setMobileActiveView] = useState('directory'); // 'directory' or 'playlists'
  const [showAdBanner, setShowAdBanner] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isPremium = user?.isPremium || (user?.plan && user.plan !== 'Free Plan');

  const handleGoPro = async () => {
    if (!token) return;
    try {
      const nextPlan = isPremium ? 'Free Plan' : 'Premium Individual';
      const res = await apiClient.put('/api/users/profile', { plan: nextPlan });
      if (res.data) {
        onUserUpdate?.(res.data);
        showSuccessMessage(isPremium ? 'Subscription cancelled.' : 'Welcome to Premium!');
      }
    } catch (err) {
      showSuccessMessage('Failed to update subscription');
    }
  };

  const showSuccessMessage = useCallback((message) => {
    setSuccess(message);
    if (clearMessageTimerRef.current) {
      window.clearTimeout(clearMessageTimerRef.current);
    }

    clearMessageTimerRef.current = window.setTimeout(() => {
      setSuccess('');
      clearMessageTimerRef.current = null;
    }, 2200);
  }, []);

  useEffect(() => {
    const syncSavedQueues = () => {
      const STORAGE_KEY = 'music_app_saved_queues_v1';
      let queues = [];
      const rawValue = window.localStorage.getItem(STORAGE_KEY);
      if (rawValue) {
        try {
          queues = JSON.parse(rawValue);
        } catch (e) {
          queues = [];
        }
      }

      // Check if mock playlists exist in queues. If not, add them!
      const mockIds = ['mock-road-trip', 'mock-party-vibes', 'mock-chill-vibes', 'mock-workout-mix', 'mock-romantic-hits', 'mock-long-drive', 'mock-rainy-day', 'mock-acoustic-vibes', 'mock-late-night'];
      const hasMocks = queues.some(q => mockIds.includes(q.id));

      if (!hasMocks) {
        const mockPlaylists = [
          {
            id: 'mock-road-trip',
            name: 'Road Trip',
            songs: Array(24).fill({}),
            songCount: 24,
            cover: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=500&q=80',
            createdAt: Date.now() - 10000
          },
          {
            id: 'mock-party-vibes',
            name: 'Party Vibes',
            songs: Array(36).fill({}),
            songCount: 36,
            cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=500&q=80',
            createdAt: Date.now() - 20000
          },
          {
            id: 'mock-chill-vibes',
            name: 'Chill Vibes',
            songs: Array(28).fill({}),
            songCount: 28,
            cover: 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=500&q=80',
            createdAt: Date.now() - 30000
          },
          {
            id: 'mock-workout-mix',
            name: 'Workout Mix',
            songs: Array(20).fill({}),
            songCount: 20,
            cover: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=500&q=80',
            createdAt: Date.now() - 40000
          },
          {
            id: 'mock-romantic-hits',
            name: 'Romantic Hits',
            songs: Array(31).fill({}),
            songCount: 31,
            cover: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=500&q=80',
            createdAt: Date.now() - 50000
          },
          {
            id: 'mock-long-drive',
            name: 'Long Drive',
            songs: Array(22).fill({}),
            songCount: 22,
            cover: 'https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=500&q=80',
            createdAt: Date.now() - 60000
          },
          {
            id: 'mock-rainy-day',
            name: 'Rainy Day',
            songs: Array(18).fill({}),
            songCount: 18,
            cover: 'https://images.unsplash.com/photo-1501691223387-dd0500403074?auto=format&fit=crop&w=500&q=80',
            createdAt: Date.now() - 70000
          },
          {
            id: 'mock-acoustic-vibes',
            name: 'Acoustic Vibes',
            songs: Array(19).fill({}),
            songCount: 19,
            cover: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=500&q=80',
            createdAt: Date.now() - 80000
          },
          {
            id: 'mock-late-night',
            name: 'Late Night',
            songs: Array(16).fill({}),
            songCount: 16,
            cover: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=500&q=80',
            createdAt: Date.now() - 90000
          }
        ];

        // Filter out duplicates based on names
        const uniqueMocks = mockPlaylists.filter(mock => !queues.some(q => q.name.toLowerCase() === mock.name.toLowerCase()));
        queues = [...queues, ...uniqueMocks];
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queues));
      }

      setSavedQueues(queues);
    };

    syncSavedQueues();
    window.addEventListener('savedQueuesUpdated', syncSavedQueues);

    return () => {
      window.removeEventListener('savedQueuesUpdated', syncSavedQueues);
      if (clearMessageTimerRef.current) {
        window.clearTimeout(clearMessageTimerRef.current);
      }
    };
  }, []);

  // Fetch liked songs count from API
  useEffect(() => {
    if (!token) return;
    apiClient.get('/api/music/liked', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const list = res.data?.data || [];
        setLikedCount(list.length);
      })
      .catch(() => {});
  }, [token, user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('section') === 'artists') {
      navigate('/artists', { replace: true });
    }
  }, [location.search, navigate]);

  const sortedQueues = useMemo(() => {
    const queues = savedQueues.slice();

    if (sortBy === 'oldest') {
      queues.sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
    } else if (sortBy === 'az') {
      queues.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    } else {
      queues.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    }

    // Liked Songs card injected at the front
    const likedItem = {
      id: 'liked-songs',
      name: 'Liked Songs',
      songs: [],
      songCount: likedCount || 128, // Default to 128 if not fetched, matching mockup
      cover: 'liked-songs-gradient'
    };

    return [likedItem, ...queues];
  }, [savedQueues, sortBy, likedCount]);

  const handleDeleteQueue = useCallback((queueId) => {
    deleteSavedQueue(queueId);
    setSavedQueues(getSavedQueues());
    showSuccessMessage('Playlist deleted');
  }, [showSuccessMessage]);

  const handleRenameQueue = useCallback((queue) => {
    const nextName = window.prompt('Rename saved queue', queue.name || 'Saved Queue');
    if (nextName === null) return;

    try {
      renameSavedQueue(queue.id, nextName);
      setSavedQueues(getSavedQueues());
      showSuccessMessage('Saved queue renamed');
    } catch (error) {
      showSuccessMessage(error.message || 'Could not rename queue');
    }
  }, [showSuccessMessage]);

  const handlePlayAll = useCallback((queue) => {
    if (queue.id === 'liked-songs') {
      apiClient.get('/api/music/liked', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          const list = res.data?.data || [];
          if (!list.length) {
            showSuccessMessage('Your Liked Songs list is empty');
            return;
          }
          const formattedSongs = list.map(s => ({
            id: s.song_id,
            title: s.title,
            artist: s.artist,
            cover: s.cover || s.image,
            streamUrl: s.file_url || s.stream_url
          }));
          onPlayAll?.(formattedSongs);
        })
        .catch(() => showSuccessMessage('Failed to play Liked Songs'));
      return;
    }

    if (!queue?.songs?.length) {
      showSuccessMessage('This playlist is empty');
      return;
    }
    onPlayAll?.(queue.songs);
  }, [onPlayAll, showSuccessMessage, token]);

  const handleOpenQueue = useCallback((queueId) => {
    if (queueId === 'liked-songs') {
      navigate('/liked-songs');
    } else {
      navigate(`/library/saved/${queueId}`);
    }
  }, [navigate]);

  const handleSortChange = useCallback((event) => {
    setSortBy(event.target.value);
  }, []);

  const handleCreatePlaylist = () => {
    const name = window.prompt('Enter playlist name:');
    if (!name) return;

    const now = Date.now();
    const queueId = `saved-queue-${now}-${Math.random().toString(36).slice(2, 8)}`;
    const newQueue = {
      id: queueId,
      name: name.trim(),
      songs: [],
      songCount: 0,
      cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80',
      createdAt: now
    };

    const STORAGE_KEY = 'music_app_saved_queues_v1';
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    let queues = [];
    if (rawValue) {
      try {
        queues = JSON.parse(rawValue);
      } catch (e) {
        queues = [];
      }
    }
    const updatedQueues = [newQueue, ...queues];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedQueues));
    window.dispatchEvent(new CustomEvent('savedQueuesUpdated'));
    setSavedQueues(updatedQueues);
    showSuccessMessage('Playlist created successfully!');
  };

  if (isMobile && mobileActiveView === 'directory') {
    return (
      <div className="playlists-panel mobile-dir-panel">
        {/* Mobile My Library Directory */}
        <div className="library-mobile-dir">
          {/* Header */}
          <div className="library-mobile-dir-header">
            <span className="library-mobile-dir-title">My Library</span>
            <button className="library-mobile-bell-btn" aria-label="Notifications">
              <Bell size={24} />
            </button>
          </div>

          {/* Subscription / Profile Card */}
          <div 
            className="library-mobile-sub-card"
            style={{ backgroundImage: `url(${isPremium ? premiumBg : nonPremiumBg})` }}
          >
            <div className="library-mobile-sub-left">
              <div className="library-mobile-avatar">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" />
                ) : (
                  <User size={32} />
                )}
              </div>
              <div className="library-mobile-sub-info">
                <span className="library-mobile-phone">{user?.phone || user?.email || '+XXXXXX:7498'}</span>
                <span className={`library-mobile-plan-status ${isPremium ? 'premium' : 'expired'}`}>
                  {isPremium ? (user?.plan || 'PREMIUM MEMBER').toUpperCase() : 'SUBSCRIPTION EXPIRED'}
                </span>
                <button className="library-mobile-gopro-btn" onClick={handleGoPro}>
                  <Crown size={14} /> {isPremium ? 'MANAGE PLAN' : 'GO PRO'}
                </button>
              </div>
            </div>
          </div>

          {/* 2-Column Menu Grid */}
          <div className="library-mobile-menu-grid">
            <button className="library-mobile-grid-item" onClick={() => navigate('/coming-soon?feature=Downloads')}>
              <div className="library-mobile-icon-circle downloads">
                <Download size={20} />
              </div>
              <div className="library-mobile-grid-text">
                <strong>Downloads</strong>
                <span>84 songs</span>
              </div>
              <ChevronRight size={18} className="chevron" />
            </button>

            <button className="library-mobile-grid-item" onClick={() => setMobileActiveView('playlists')}>
              <div className="library-mobile-icon-circle playlists">
                <Music size={20} />
              </div>
              <div className="library-mobile-grid-text">
                <strong>Playlists</strong>
                <span>{savedQueues.length} playlists</span>
              </div>
              <ChevronRight size={18} className="chevron" />
            </button>

            <button className="library-mobile-grid-item" onClick={() => navigate('/liked-songs')}>
              <div className="library-mobile-icon-circle liked">
                <Heart size={20} fill="currentColor" />
              </div>
              <div className="library-mobile-grid-text">
                <strong>Liked Songs</strong>
                <span>{likedCount || 312} songs</span>
              </div>
              <ChevronRight size={18} className="chevron" />
            </button>

            <button className="library-mobile-grid-item" onClick={() => navigate('/coming-soon?feature=Albums')}>
              <div className="library-mobile-icon-circle albums">
                <Disc size={20} />
              </div>
              <div className="library-mobile-grid-text">
                <strong>Albums</strong>
                <span>58 albums</span>
              </div>
              <ChevronRight size={18} className="chevron" />
            </button>

            <button className="library-mobile-grid-item" onClick={() => navigate('/coming-soon?feature=Podcasts')}>
              <div className="library-mobile-icon-circle podcasts">
                <Radio size={20} />
              </div>
              <div className="library-mobile-grid-text">
                <strong>Podcasts</strong>
                <span>24 shows</span>
              </div>
              <ChevronRight size={18} className="chevron" />
            </button>

            <button className="library-mobile-grid-item" onClick={() => navigate('/artists')}>
              <div className="library-mobile-icon-circle artists">
                <Mic size={20} />
              </div>
              <div className="library-mobile-grid-text">
                <strong>Artists</strong>
                <span>47 artists</span>
              </div>
              <ChevronRight size={18} className="chevron" />
            </button>

            <button className="library-mobile-grid-item" onClick={() => navigate('/history')}>
              <div className="library-mobile-icon-circle history">
                <Clock size={20} />
              </div>
              <div className="library-mobile-grid-text">
                <strong>History</strong>
                <span>Recently played</span>
              </div>
              <ChevronRight size={18} className="chevron" />
            </button>
          </div>

          {/* List Options */}
          <div className="library-mobile-list-options">
            <button className="library-mobile-list-item" onClick={() => {
              showSuccessMessage('Library synced successfully!');
            }}>
              <div className="library-mobile-list-left">
                <div className="library-mobile-list-icon sync">
                  <RefreshCw size={20} />
                </div>
                <div className="library-mobile-list-text">
                  <strong>Sync Library</strong>
                  <span>Backup & access across devices</span>
                </div>
              </div>
              <ChevronRight size={18} className="chevron" />
            </button>

            <button className="library-mobile-list-item" onClick={() => {
              if (sortedQueues.length > 0) {
                handlePlayAll(sortedQueues[0]);
              } else {
                showSuccessMessage('No songs to shuffle');
              }
            }}>
              <div className="library-mobile-list-left">
                <div className="library-mobile-list-icon shuffle">
                  <Shuffle size={20} />
                </div>
                <div className="library-mobile-list-text">
                  <strong>Shuffle All</strong>
                  <span>Play your entire library</span>
                </div>
              </div>
              <div className="library-mobile-play-btn">
                <Play size={16} fill="currentColor" />
              </div>
            </button>

            <button className="library-mobile-list-item" onClick={() => navigate('/settings')}>
              <div className="library-mobile-list-left">
                <div className="library-mobile-list-icon settings">
                  <Settings size={20} />
                </div>
                <div className="library-mobile-list-text">
                  <strong>Settings</strong>
                  <span>App preferences and account</span>
                </div>
              </div>
              <ChevronRight size={18} className="chevron" />
            </button>
          </div>

          {/* Ad Promo Banner */}
          {!isPremium && showAdBanner && (
            <div className="library-mobile-ad-banner">
              <div className="library-mobile-ad-left">
                <div className="library-mobile-ad-crown">
                  <Crown size={20} />
                </div>
                <div className="library-mobile-ad-text">
                  <strong>Ad-free music, unlimited JioTunes & downloads!</strong>
                  <span onClick={handleGoPro}>Start JioSaavn Pro 30-day free trial &gt;</span>
                </div>
              </div>
              <button className="library-mobile-ad-close" onClick={() => setShowAdBanner(false)}>
                <X size={18} />
              </button>
            </div>
          )}
        </div>
        {success && <div className="playlist-message success">{success}</div>}
      </div>
    );
  }

  return (
    <div className="playlists-panel">
      {/* Mobile-only Library Header (shown only when in playlists view on mobile) */}
      {isMobile && (
        <div className="library-mobile-header">
          <div className="library-mobile-header-top">
            <button className="library-back-btn" onClick={() => setMobileActiveView('directory')} aria-label="Go back">
              <ArrowLeft size={24} />
            </button>
            <span className="library-title">Playlists</span>
            <div className="library-actions">
              <button aria-label="Search Library">
                <Search size={20} />
              </button>
              <button aria-label="Create Playlist" onClick={handleCreatePlaylist}>
                <Plus size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Hero Banner using background image in CSS (Desktop only) */}
      {!isMobile && (
        <div className="playlists-hero-banner desktop-only">
          <div className="playlists-hero-content">
            <h1>Playlists</h1>
            <p>Create, organize and find the perfect playlist for every moment.</p>
            <button className="create-playlist-btn-hero" onClick={handleCreatePlaylist}>
              <Plus size={16} /> Create Playlist
            </button>
          </div>
        </div>
      )}

      {/* Section title bar with Sort + View toggles */}
      <div className="playlists-section-title">
        <h3>Your Playlists</h3>
        {isMobile && (
          <button
            type="button"
            className="playlists-see-all-btn"
            onClick={() => setMobileActiveView('directory')}
            aria-label="See directory"
          >
            See All
          </button>
        )}
        <div className="playlists-section-actions">
          <div className="playlist-toolbar">
            <span className="sort-label">Sort by:</span>
            <select value={sortBy} onChange={handleSortChange}>
              <option value="newest">Recently Added</option>
              <option value="oldest">Oldest</option>
              <option value="az">A-Z</option>
            </select>
          </div>
          <div className="playlists-view-toggles">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {success && <div className="playlist-message success">{success}</div>}

      {/* Playlist grid */}
      {sortedQueues.length > 0 && (
        <div className="playlist-grid" style={{ marginBottom: '12px' }}>
          {sortedQueues.map((queue) => (
            <PlaylistCard
              key={queue.id}
              queue={queue}
              onOpenQueue={handleOpenQueue}
              onPlayAll={handlePlayAll}
              onRenameQueue={handleRenameQueue}
              onDeleteQueue={handleDeleteQueue}
            />
          ))}
        </div>
      )}

      {/* Bottom creation banner */}
      <div className="create-playlist-banner">
        <div className="create-playlist-banner__left">
          <div className="create-playlist-banner__circle">
            <Plus size={24} />
          </div>
          <div className="create-playlist-banner__info">
            <h4>Create your first playlist</h4>
            <p>It's easy, we'll help you get started.</p>
          </div>
        </div>
        <button
          className="create-playlist-banner__btn"
          onClick={handleCreatePlaylist}
        >
          <Plus size={16} /> Create Playlist
        </button>
      </div>
    </div>
  );
}

export default Playlists;
