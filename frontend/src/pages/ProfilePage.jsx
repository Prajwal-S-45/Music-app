import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, PenTool, Lock, Award, CreditCard, Settings as SettingsIcon, LogOut,
  Plus, CheckCircle2, ChevronRight, ArrowLeft, History, User, Check,
  Music, Download, Headphones, X, ShieldAlert, Heart, ChevronLeft, Users, Clock
} from 'lucide-react';
import apiClient from '../api/client';
import '../styles/ProfilePage.css';

// Fallback lists from image representation
const DEFAULT_PLAYLISTS = [
  { id: 'mock-1', name: 'Chill Vibes', count: 25, cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=500&q=80' },
  { id: 'mock-2', name: 'Workout Hits', count: 18, cover: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=500&q=80' },
  { id: 'mock-3', name: 'Road Trip', count: 32, cover: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=500&q=80' },
  { id: 'mock-4', name: 'Bollywood Mix', count: 42, cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80' },
  { id: 'mock-5', name: 'Feel Good', count: 30, cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=500&q=80' }
];

const DEFAULT_ARTISTS = [
  { id: 'arijit', name: 'Arijit Singh', role: 'Singer', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80' },
  { id: 'atif', name: 'Atif Aslam', role: 'Singer', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80' },
  { id: 'pritam', name: 'Pritam', role: 'Music Director', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80' },
  { id: 'allu', name: 'Allu Arjun', role: 'Actor', image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80' },
  { id: 'prabhas', name: 'Prabhas', role: 'Actor', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80' },
  { id: 'rashmika', name: 'Rashmika Mandanna', role: 'Actor', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80' },
  { id: 'anirudh', name: 'Anirudh Ravichander', role: 'Music Director', image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80' }
];

const PRESET_AVATARS = [
  'http://localhost:5000/uploads/profile_avatar.png',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80'
];

function ProfilePage({ user, token, onLogout, onUserUpdate, refreshSignal, onPlayTrack, onQueueTrack }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // States
  const [profile, setProfile] = useState(user);
  const [activeTab, setActiveTab] = useState('Overview');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Data Loading
  const [playlists, setPlaylists] = useState([]);
  const [likedSongs, setLikedSongs] = useState([]);
  const [followedArtists, setFollowedArtists] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  // Forms
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    bio: user?.bio || '“Music is the soundtrack of my life.”',
    plan: user?.plan || 'Free Plan',
    avatar: user?.avatar || ''
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [paymentForm, setPaymentForm] = useState({
    cardholder: '',
    cardNumber: '',
    expiry: '',
    cvv: ''
  });
  const [savedCards, setSavedCards] = useState([
    { id: 1, brand: 'Visa', last4: '4321', holder: 'Prajwal S A', expiry: '12/28' }
  ]);

  // Form notifications
  const [formMsg, setFormMsg] = useState({ text: '', type: '' });

  // Load latest user profile from API on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/api/users/profile');
        if (res.data) {
          const u = res.data;
          setProfile(u);
          setEditForm({
            name: u.name || '',
            bio: u.bio || '“Music is the soundtrack of my life.”',
            plan: u.plan || 'Free Plan',
            avatar: u.avatar || ''
          });
          onUserUpdate?.(u);
        }
      } catch (err) {
        console.error('Failed to load user profile from DB:', err);
      }
    };
    fetchProfile();
  }, [token]);

  // Load playlists, liked songs, follows, recently played, history
  useEffect(() => {
    const loadAllData = async () => {
      // 1. Playlists
      setLoadingPlaylists(true);
      try {
        const res = await apiClient.get('/api/playlists');
        const dbPlaylists = Array.isArray(res.data) ? res.data : [];
        
        // Grab from localStorage saved queues too
        let localSaved = [];
        try {
          const savedStr = localStorage.getItem('music_app_saved_queues');
          localSaved = savedStr ? JSON.parse(savedStr) : [];
        } catch {}

        // Combine
        const combined = [
          ...dbPlaylists.map(p => ({
            id: p.id,
            name: p.name,
            count: 0, // Will fetch counts if needed or display default
            cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80',
            description: p.description,
            isDb: true
          })),
          ...localSaved.map(p => ({
            id: p.id,
            name: p.name,
            count: p.songs?.length || 0,
            cover: p.songs?.[0]?.cover || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=500&q=80',
            isLocal: true
          }))
        ];
        setPlaylists(combined);
      } catch (err) {
        console.error('Failed to load playlists:', err);
      } finally {
        setLoadingPlaylists(false);
      }

      // 2. Liked Songs
      try {
        const res = await apiClient.get('/api/music/liked');
        setLikedSongs(Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
      } catch (err) {
        console.error('Failed to load liked songs:', err);
      }

      // 3. Followed Artists
      try {
        const saved = localStorage.getItem('music_app_followed_artists');
        setFollowedArtists(saved ? JSON.parse(saved) : []);
      } catch {}

      // 4. Recently Played
      try {
        const saved = localStorage.getItem('music_app_recently_played');
        setRecentlyPlayed(saved ? JSON.parse(saved) : []);
      } catch {}

      // 5. History
      try {
        const res = await apiClient.get('/api/history');
        setHistoryItems(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to load history items:', err);
      }
    };

    loadAllData();

    // Event listener for updates on follow status
    const handleFollowsUpdate = () => {
      try {
        const saved = localStorage.getItem('music_app_followed_artists');
        setFollowedArtists(saved ? JSON.parse(saved) : []);
      } catch {}
    };
    window.addEventListener('followedArtistsUpdated', handleFollowsUpdate);
    return () => window.removeEventListener('followedArtistsUpdated', handleFollowsUpdate);
  }, [token, refreshSignal]);

  const showNotification = (text, type = 'success') => {
    setFormMsg({ text, type });
    setTimeout(() => setFormMsg({ text: '', type: '' }), 4000);
  };

  // Avatar conversion to base64
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showNotification('Profile picture must be smaller than 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result;
      if (base64) {
        setEditForm(prev => ({ ...prev, avatar: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle profile edit submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiClient.put('/api/users/profile', editForm);
      if (res.data) {
        setProfile(res.data);
        onUserUpdate?.(res.data);
        showNotification('Profile updated successfully!');
        setTimeout(() => setShowEditModal(false), 800);
      }
    } catch (err) {
      showNotification(err.response?.data?.error || 'Failed to update profile', 'error');
    }
  };

  // Handle password change submission
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }
    try {
      await apiClient.post('/api/users/change-password', {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });
      showNotification('Password updated successfully!');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setShowPasswordModal(false), 800);
    } catch (err) {
      showNotification(err.response?.data?.error || 'Failed to change password', 'error');
    }
  };

  // Handle payment method addition
  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (!paymentForm.cardNumber || !paymentForm.cardholder) {
      showNotification('Please fill in card details', 'error');
      return;
    }
    const newCard = {
      id: Date.now(),
      brand: paymentForm.cardNumber.startsWith('4') ? 'Visa' : 'Mastercard',
      last4: paymentForm.cardNumber.slice(-4) || '1111',
      holder: paymentForm.cardholder,
      expiry: paymentForm.expiry || '12/29'
    };
    setSavedCards(prev => [...prev, newCard]);
    setPaymentForm({ cardholder: '', cardNumber: '', expiry: '', cvv: '' });
    showNotification('Card saved successfully!');
  };

  const handleRemoveCard = (cardId) => {
    setSavedCards(prev => prev.filter(c => c.id !== cardId));
    showNotification('Card removed');
  };

  // Create playlist triggers redirection or local modal
  const handleCreatePlaylist = async () => {
    const name = prompt('Enter playlist name:');
    if (!name) return;
    try {
      await apiClient.post('/api/playlists/create', { name, description: '' });
      // Reload playlists
      const res = await apiClient.get('/api/playlists');
      setPlaylists(prev => [
        ...res.data.map(p => ({
          id: p.id,
          name: p.name,
          count: 0,
          cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80',
          isDb: true
        })),
        ...prev.filter(x => x.isLocal)
      ]);
      showNotification('Playlist created successfully!');
    } catch (err) {
      console.error(err);
      // Fallback local storage creation
      try {
        const savedStr = localStorage.getItem('music_app_saved_queues');
        const localSaved = savedStr ? JSON.parse(savedStr) : [];
        const newLocal = {
          id: `local-${Date.now()}`,
          name,
          songs: [],
          createdAt: Date.now()
        };
        localSaved.push(newLocal);
        localStorage.setItem('music_app_saved_queues', JSON.stringify(localSaved));
        setPlaylists(prev => [...prev, { id: newLocal.id, name: newLocal.name, count: 0, cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=500&q=80', isLocal: true }]);
        showNotification('Playlist created locally');
      } catch (localErr) {
        showNotification('Could not create playlist', 'error');
      }
    }
  };

  // Profile photo check
  const avatarUrl = profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
  const initialLetter = profile?.name ? profile.name.charAt(0).toUpperCase() : 'P';

  return (
    <div className="premium-profile">
      {isMobile ? (
        /* Mobile Profile Layout matching uploaded image */
        <div className="mobile-profile-layout">
          <div className="mobile-profile__banner-cover">
            <div className="mobile-profile__nav-bar">
              <button 
                type="button"
                className="mobile-profile__circle-btn" 
                onClick={() => navigate(-1)} 
                title="Go Back"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                type="button"
                className="mobile-profile__circle-btn" 
                onClick={() => setShowSettingsDrawer(true)} 
                title="Settings"
              >
                <SettingsIcon size={20} />
              </button>
            </div>

            <div className="mobile-profile__user-row">
              <div className="mobile-profile__avatar-wrap">
                <img 
                  src={profile?.avatar || 'http://localhost:5000/uploads/profile_avatar.png'} 
                  alt={profile?.name} 
                  className="mobile-profile__avatar-img" 
                />
                <button 
                  type="button"
                  className="mobile-profile__avatar-edit"
                  onClick={() => setShowEditModal(true)}
                >
                  <Camera size={14} />
                </button>
              </div>

              <div className="mobile-profile__user-info">
                <h1 className="mobile-profile__user-name">{profile?.name || 'Prajwal Angadi'}</h1>
                <span className="mobile-profile__plan-badge">{profile?.plan || 'Free Plan'}</span>
                <p className="mobile-profile__bio">{profile?.bio || '“Music is the soundtrack of my life.” 🎵'}</p>
              </div>
            </div>
          </div>

          <div className="mobile-profile__content">
            {activeTab === 'Overview' ? (
              <>
                <div className="mobile-profile__stats-card">
                  <button type="button" className="mobile-profile__stat-item" onClick={() => setActiveTab('Liked Songs')}>
                    <div className="mobile-profile__stat-icon liked">
                      <Heart size={18} fill="#a855f7" />
                    </div>
                    <span className="label">Liked Songs</span>
                    <span className="value">128</span>
                  </button>

                  <button type="button" className="mobile-profile__stat-item" onClick={() => setActiveTab('Downloads')}>
                    <div className="mobile-profile__stat-icon downloads">
                      <Download size={18} />
                    </div>
                    <span className="label">Downloads</span>
                    <span className="value">24</span>
                  </button>

                  <button type="button" className="mobile-profile__stat-item" onClick={() => setActiveTab('History')}>
                    <div className="mobile-profile__stat-icon history">
                      <Clock size={18} />
                    </div>
                    <span className="label">History</span>
                    <span className="value">Recent</span>
                  </button>

                  <button type="button" className="mobile-profile__stat-item" onClick={() => setActiveTab('Following')}>
                    <div className="mobile-profile__stat-icon following">
                      <Users size={18} />
                    </div>
                    <span className="label">Following</span>
                    <span className="value">Artists</span>
                  </button>
                </div>

                <div className="mobile-profile__playlists-card">
                  <h2 className="mobile-profile__section-header">Your Playlists</h2>
                  {playlists.length === 0 ? (
                    <div className="mobile-profile__empty-playlists">
                      <div className="mobile-profile__empty-note-icon">
                        <Music size={28} />
                      </div>
                      <h3 className="mobile-profile__empty-title">No Playlists Yet</h3>
                      <p className="mobile-profile__empty-desc">Create your first playlist and it will show up here.</p>
                      <button 
                        type="button"
                        className="mobile-profile__purple-btn"
                        onClick={handleCreatePlaylist}
                      >
                        <Plus size={16} /> Create Playlist
                      </button>
                    </div>
                  ) : (
                    <div className="playlists-horizontal-grid">
                      {playlists.slice(0, 4).map(p => (
                        <div 
                          key={p.id} 
                          className="playlist-item-card" 
                          onClick={() => p.isLocal ? navigate(`/library/saved/${p.id}`) : navigate('/library')}
                        >
                          <div className="playlist-item-card__image-container">
                            <img src={p.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80'} alt={p.name} />
                          </div>
                          <strong>{p.name}</strong>
                          <span>{p.count || 0} songs</span>
                        </div>
                      ))}
                      <div className="playlist-item-card create-card" onClick={handleCreatePlaylist}>
                        <div className="create-card__inner">
                          <Plus size={24} className="plus-icon" />
                          <strong>Create</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mobile-profile__quick-access">
                  <h2 className="mobile-profile__quick-title">Quick Access</h2>
                  <div className="mobile-profile__quick-row">
                    <div className="mobile-profile__quick-card" onClick={() => setActiveTab('Liked Songs')}>
                      <Heart size={20} fill="#a855f7" color="#a855f7" />
                      <strong>Liked Songs</strong>
                      <span>128 songs</span>
                    </div>

                    <div className="mobile-profile__quick-card" onClick={() => setActiveTab('Downloads')}>
                      <Download size={20} color="#22c55e" />
                      <strong>Downloads</strong>
                      <span>24 songs</span>
                    </div>

                    <div className="mobile-profile__quick-card" onClick={() => setActiveTab('History')}>
                      <Clock size={20} color="#f97316" />
                      <strong>History</strong>
                      <span>Recently played</span>
                    </div>

                    <div className="mobile-profile__quick-card" onClick={() => setActiveTab('Following')}>
                      <Users size={20} color="#3b82f6" />
                      <strong>Following</strong>
                      <span>Artists</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Mobile subviews */
              <div className="mobile-profile__subview">
                <button 
                  type="button" 
                  className="mobile-profile__subview-back-btn" 
                  onClick={() => setActiveTab('Overview')}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  ← Back to Profile Overview
                </button>

                {activeTab === 'Playlists' && (
                  <div className="tab-view__grid">
                    <div className="tab-view__grid-header">
                      <h2>Your Playlists</h2>
                      <button className="premium-profile__btn-glow" onClick={handleCreatePlaylist}>
                        <Plus size={16} /> Create Playlist
                      </button>
                    </div>
                    <div className="playlists-grid-layout">
                      {(playlists.length > 0 ? playlists : DEFAULT_PLAYLISTS).map(playlist => (
                        <div 
                          key={playlist.id} 
                          className="playlist-item-card"
                          onClick={() => playlist.isLocal ? navigate(`/library/saved/${playlist.id}`) : navigate('/library')}
                        >
                          <img src={playlist.cover} alt={playlist.name} />
                          <strong>{playlist.name}</strong>
                          <span>{playlist.count} songs</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'Liked Songs' && (
                  <div className="tab-view__list">
                    <h2>Liked Songs</h2>
                    {likedSongs.length === 0 ? (
                      <div className="empty-tab-state">
                        <Heart size={48} className="icon" />
                        <p>Songs you like will appear here.</p>
                      </div>
                    ) : (
                      <table className="songs-list-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Title</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {likedSongs.map((song, index) => (
                            <tr key={song.id} onClick={() => onPlayTrack?.(song)}>
                              <td>{index + 1}</td>
                              <td className="song-title-cell">
                                <img src={song.thumbnail || song.cover} alt="" />
                                <div>
                                  <strong>{song.title}</strong>
                                  <span>{song.artist}</span>
                                </div>
                              </td>
                              <td>
                                <button 
                                  className="play-song-row-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onQueueTrack?.(song);
                                  }}
                                >
                                  Queue
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeTab === 'Following' && (
                  <div className="tab-view__grid">
                    <h2>Following</h2>
                    {followedArtists.length === 0 ? (
                      <div className="empty-tab-state">
                        <CheckCircle2 size={48} className="icon" />
                        <p>Artists you follow will appear here.</p>
                      </div>
                    ) : (
                      <div className="playlists-grid-layout">
                        {followedArtists.map(artist => (
                          <div 
                            key={artist.id} 
                            className="artist-circle-card"
                            onClick={() => navigate(`/artist/${encodeURIComponent(artist.name)}`)}
                          >
                            <div className="artist-circle-card__image">
                              <img src={artist.image} alt={artist.name} />
                            </div>
                            <strong>{artist.name}</strong>
                            <span>{artist.role}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'History' && (
                  <div className="tab-view__list">
                    <h2>Listening History</h2>
                    {historyItems.length === 0 ? (
                      <div className="empty-tab-state">
                        <History size={48} className="icon" />
                        <p>Your listening history is empty.</p>
                      </div>
                    ) : (
                      <table className="songs-list-table">
                        <thead>
                          <tr>
                            <th>Activity</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyItems.map(item => (
                            <tr key={item.id}>
                              <td>
                                <strong>{item.title}</strong>
                                {item.subtitle && <span className="subtitle"> - {item.subtitle}</span>}
                              </td>
                              <td>{new Date(item.created_at || item.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeTab === 'Recently Played' && (
                  <div className="tab-view__grid">
                    <h2>Recently Played</h2>
                    {recentlyPlayed.length === 0 ? (
                      <div className="empty-tab-state">
                        <Music size={48} className="icon" />
                        <p>No recently played tracks.</p>
                      </div>
                    ) : (
                      <div className="playlists-grid-layout">
                        {recentlyPlayed.map((track, index) => (
                          <div 
                            key={`${track.id}-${index}`} 
                            className="playlist-item-card"
                            onClick={() => onPlayTrack?.(track)}
                          >
                            <img src={track.cover || track.thumbnail} alt={track.title} />
                            <strong>{track.title}</strong>
                            <span>{track.artist}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'Downloads' && (
                  <div className="tab-view__list">
                    <h2>Downloads</h2>
                    <div className="empty-tab-state">
                      <Download size={48} className="icon" />
                      <p>Download songs on premium device plans to play offline.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Desktop Profile Layout */
        <div className="desktop-profile-view">
          {/* Background Gradient Effect */}
          <div className="premium-profile__bg-glow" />

          {/* Header Banner */}
          <div className="premium-profile__banner">
            <div className="premium-profile__user-card">
              <div className="premium-profile__avatar-container">
                <img 
                  src={profile?.avatar || 'http://localhost:5000/uploads/profile_avatar.png'} 
                  alt={profile?.name} 
                  className="premium-profile__avatar-img" 
                />
                <button 
                  className="premium-profile__avatar-edit-btn" 
                  onClick={() => setShowEditModal(true)}
                  title="Edit Profile"
                >
                  <Camera size={18} />
                </button>
              </div>

              <div className="premium-profile__user-details">
                <h1 className="premium-profile__user-name">{profile?.name || 'Prajwal Angadi'}</h1>
                <span className="premium-profile__plan-badge">{profile?.plan || 'Free Plan'}</span>
                <p className="premium-profile__user-bio">
                  {profile?.bio || '“Music is the soundtrack of my life.”'}
                </p>
                <button 
                  className="premium-profile__edit-profile-btn" 
                  onClick={() => setShowEditModal(true)}
                >
                  <PenTool size={14} style={{ marginRight: '6px' }} />
                  Edit Profile
                </button>
              </div>
            </div>

            {/* Right Section Account Card */}
            <div className="premium-profile__account-card">
              <h3>Account</h3>
              <ul className="premium-profile__account-menu">
                <li onClick={() => setShowEditModal(true)}>
                  <PenTool size={16} />
                  <span>Edit Profile</span>
                  <ChevronRight size={16} className="chevron" />
                </li>
                <li onClick={() => setShowPasswordModal(true)}>
                  <Lock size={16} />
                  <span>Change Password</span>
                  <ChevronRight size={16} className="chevron" />
                </li>
                <li onClick={() => setShowSubModal(true)}>
                  <Award size={16} />
                  <span>Subscription</span>
                  <ChevronRight size={16} className="chevron" />
                </li>
                <li onClick={() => setShowPaymentModal(true)}>
                  <CreditCard size={16} />
                  <span>Payment Methods</span>
                  <ChevronRight size={16} className="chevron" />
                </li>
                <li onClick={() => navigate('/settings')}>
                  <SettingsIcon size={16} />
                  <span>Settings</span>
                  <ChevronRight size={16} className="chevron" />
                </li>
                <li onClick={onLogout} className="logout">
                  <LogOut size={16} />
                  <span>Log Out</span>
                  <ChevronRight size={16} className="chevron" />
                </li>
              </ul>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="premium-profile__tabs-container">
            <div className="premium-profile__tabs">
              {['Overview', 'Playlists', 'Liked Songs', 'Following', 'Recently Played', 'Downloads', 'History'].map(tab => (
                <button 
                  key={tab}
                  className={activeTab === tab ? 'active' : ''} 
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Main Tab Content */}
          <div className="premium-profile__content">
            
            {/* --- OVERVIEW TAB --- */}
            {activeTab === 'Overview' && (
              <div className="overview-subview">
                
                {/* Playlists Section */}
                <div className="overview-section">
                  <div className="overview-section__header">
                    <h2>Your Playlists</h2>
                    <button className="see-all-btn" onClick={() => setActiveTab('Playlists')}>See All</button>
                  </div>

                  <div className="playlists-horizontal-grid">
                    {(playlists.length > 0 ? playlists : DEFAULT_PLAYLISTS).slice(0, 5).map(playlist => (
                      <div 
                        key={playlist.id} 
                        className="playlist-item-card"
                        onClick={() => playlist.isLocal ? navigate(`/library/saved/${playlist.id}`) : navigate('/library')}
                      >
                        <div className="playlist-item-card__image-container">
                          <img src={playlist.cover} alt={playlist.name} />
                          <div className="play-hover-overlay">
                            <div className="play-icon-circle">
                              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </div>
                        </div>
                        <strong>{playlist.name}</strong>
                        <span>{playlist.count} songs</span>
                      </div>
                    ))}
                    
                    {/* Create Playlist Grid Card */}
                    <div className="playlist-item-card create-card" onClick={handleCreatePlaylist}>
                      <div className="create-card__inner">
                        <Plus size={36} className="plus-icon" />
                        <strong>Create Playlist</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Followed Artists Section */}
                <div className="overview-section" style={{ marginTop: '40px' }}>
                  <div className="overview-section__header">
                    <h2>Artists, Actors & Singers You Follow</h2>
                    <button className="see-all-btn" onClick={() => setActiveTab('Following')}>See All</button>
                  </div>

                  <div className="artists-horizontal-grid">
                    {(followedArtists.length > 0 ? followedArtists : DEFAULT_ARTISTS).slice(0, 7).map(artist => (
                      <div 
                        key={artist.id} 
                        className="artist-circle-card"
                        onClick={() => navigate(`/artist/${encodeURIComponent(artist.name)}`)}
                      >
                        <div className="artist-circle-card__image">
                          <img src={artist.image} alt={artist.name} />
                        </div>
                        <strong>{artist.name}</strong>
                        <span>{artist.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* --- PLAYLISTS TAB --- */}
            {activeTab === 'Playlists' && (
              <div className="tab-view__grid">
                <div className="tab-view__grid-header">
                  <h2>Your Playlists</h2>
                  <button className="premium-profile__btn-glow" onClick={handleCreatePlaylist}>
                    <Plus size={16} /> Create Playlist
                  </button>
                </div>
                
                <div className="playlists-grid-layout">
                  {(playlists.length > 0 ? playlists : DEFAULT_PLAYLISTS).map(playlist => (
                    <div 
                      key={playlist.id} 
                      className="playlist-item-card"
                      onClick={() => playlist.isLocal ? navigate(`/library/saved/${playlist.id}`) : navigate('/library')}
                    >
                      <img src={playlist.cover} alt={playlist.name} />
                      <strong>{playlist.name}</strong>
                      <span>{playlist.count} songs</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- LIKED SONGS TAB --- */}
            {activeTab === 'Liked Songs' && (
              <div className="tab-view__list">
                <h2>Liked Songs</h2>
                {likedSongs.length === 0 ? (
                  <div className="empty-tab-state">
                    <Heart size={48} className="icon" />
                    <p>Songs you like will appear here.</p>
                    <button className="browse-btn" onClick={() => navigate('/search')}>Search Music</button>
                  </div>
                ) : (
                  <table className="songs-list-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Title</th>
                        <th>Album</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {likedSongs.map((song, index) => (
                        <tr key={song.id} onClick={() => onPlayTrack?.(song)}>
                          <td>{index + 1}</td>
                          <td className="song-title-cell">
                            <img src={song.thumbnail || song.cover} alt="" />
                            <div>
                              <strong>{song.title}</strong>
                              <span>{song.artist}</span>
                            </div>
                          </td>
                          <td>{song.album || '—'}</td>
                          <td>
                            <button 
                              className="play-song-row-btn"
                              onClick={(e) => {
                                    e.stopPropagation();
                                    onQueueTrack?.(song);
                              }}
                            >
                              Add to Queue
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* --- FOLLOWING TAB --- */}
            {activeTab === 'Following' && (
              <div className="tab-view__grid">
                <h2>Following</h2>
                {followedArtists.length === 0 ? (
                  <div className="empty-tab-state">
                    <CheckCircle2 size={48} className="icon" />
                    <p>Artists you follow will appear here.</p>
                    <button className="browse-btn" onClick={() => navigate('/artists')}>Find Artists</button>
                  </div>
                ) : (
                  <div className="playlists-grid-layout">
                    {followedArtists.map(artist => (
                      <div 
                        key={artist.id} 
                        className="artist-circle-card"
                        onClick={() => navigate(`/artist/${encodeURIComponent(artist.name)}`)}
                      >
                        <div className="artist-circle-card__image">
                          <img src={artist.image} alt={artist.name} />
                        </div>
                        <strong>{artist.name}</strong>
                        <span>{artist.role}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* --- RECENTLY PLAYED TAB --- */}
            {activeTab === 'Recently Played' && (
              <div className="tab-view__grid">
                <h2>Recently Played</h2>
                {recentlyPlayed.length === 0 ? (
                  <div className="empty-tab-state">
                    <Music size={48} className="icon" />
                    <p>No recently played tracks found.</p>
                  </div>
                ) : (
                  <div className="playlists-grid-layout">
                    {recentlyPlayed.map((track, index) => (
                      <div 
                        key={`${track.id}-${index}`} 
                        className="playlist-item-card"
                        onClick={() => onPlayTrack?.(track)}
                      >
                        <img src={track.cover || track.thumbnail} alt={track.title} />
                        <strong>{track.title}</strong>
                        <span>{track.artist}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* --- DOWNLOADS TAB --- */}
            {activeTab === 'Downloads' && (
              <div className="tab-view__list">
                <h2>Downloads</h2>
                <div className="empty-tab-state">
                  <Download size={48} className="icon" />
                  <p>Download songs on premium device plans to play offline.</p>
                  <button className="browse-btn" onClick={() => setShowSubModal(true)}>Upgrade Plan</button>
                </div>
              </div>
            )}

            {/* --- HISTORY TAB --- */}
            {activeTab === 'History' && (
              <div className="tab-view__list">
                <h2>Listening History</h2>
                {historyItems.length === 0 ? (
                  <div className="empty-tab-state">
                    <History size={48} className="icon" />
                    <p>Your listening history is empty.</p>
                  </div>
                ) : (
                  <table className="songs-list-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Activity</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyItems.map(item => (
                        <tr key={item.id}>
                          <td className="history-type-cell">
                            <span className={`badge ${item.type}`}>{item.type}</span>
                          </td>
                          <td>
                            <strong>{item.title}</strong>
                            {item.subtitle && <span className="subtitle"> - {item.subtitle}</span>}
                          </td>
                          <td>{new Date(item.created_at || item.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. EDIT PROFILE MODAL */}
      {showEditModal && (
        <div className="profile-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-modal__header">
              <h2>Edit Profile Details</h2>
              <button onClick={() => setShowEditModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleEditSubmit} className="profile-modal__form">
              {formMsg.text && (
                <div className={`form-message ${formMsg.type}`}>
                  {formMsg.text}
                </div>
              )}

              <div className="form-group avatar-selector-group">
                <label>Profile Picture</label>
                <div className="avatar-preview-wrapper">
                  <img 
                    src={editForm.avatar || 'http://localhost:5000/uploads/profile_avatar.png'} 
                    alt="Preview" 
                    className="avatar-preview" 
                  />
                  <div className="avatar-actions">
                    <button type="button" className="upload-btn" onClick={() => fileInputRef.current?.click()}>
                      Upload Picture
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                    />
                    <button 
                      type="button" 
                      className="reset-btn" 
                      onClick={() => setEditForm(prev => ({ ...prev, avatar: '' }))}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="preset-avatars-label">Or choose a preset avatar:</div>
                <div className="preset-avatars-grid">
                  {PRESET_AVATARS.map((preset, idx) => (
                    <img 
                      key={idx} 
                      src={preset} 
                      alt="" 
                      className={`preset-avatar-option ${editForm.avatar === preset ? 'selected' : ''}`}
                      onClick={() => setEditForm(prev => ({ ...prev, avatar: preset }))}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="name-input">Display Name</label>
                <input 
                  id="name-input"
                  type="text" 
                  value={editForm.name} 
                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  required 
                />
              </div>

              <div className="form-group">
                <label htmlFor="bio-input">Bio / Quote</label>
                <textarea 
                  id="bio-input"
                  rows="2" 
                  value={editForm.bio} 
                  onChange={e => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="plan-select">Subscription Plan</label>
                <select 
                  id="plan-select"
                  value={editForm.plan} 
                  onChange={e => setEditForm(prev => ({ ...prev, plan: e.target.value }))}
                >
                  <option value="Free Plan">Free Plan</option>
                  <option value="Premium Individual">Premium Individual</option>
                  <option value="Premium Duo">Premium Duo</option>
                  <option value="Premium Family">Premium Family</option>
                </select>
              </div>

              <div className="profile-modal__actions">
                <button type="button" className="cancel-btn" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="save-btn">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="profile-modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-modal__header">
              <h2>Change Password</h2>
              <button onClick={() => setShowPasswordModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="profile-modal__form">
              {formMsg.text && (
                <div className={`form-message ${formMsg.type}`}>
                  {formMsg.text}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="old-password">Current Password</label>
                <input 
                  id="old-password"
                  type="password" 
                  value={passwordForm.oldPassword} 
                  onChange={e => setPasswordForm(prev => ({ ...prev, oldPassword: e.target.value }))}
                  required 
                />
              </div>

              <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                <input 
                  id="new-password"
                  type="password" 
                  value={passwordForm.newPassword} 
                  onChange={e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  required 
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password">Confirm New Password</label>
                <input 
                  id="confirm-password"
                  type="password" 
                  value={passwordForm.confirmPassword} 
                  onChange={e => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required 
                />
              </div>

              <div className="profile-modal__actions">
                <button type="button" className="cancel-btn" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                <button type="submit" className="save-btn">Change Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. SUBSCRIPTION INFO MODAL */}
      {showSubModal && (
        <div className="profile-modal-overlay" onClick={() => setShowSubModal(false)}>
          <div className="profile-modal sub-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-modal__header">
              <h2>Membership Subscription</h2>
              <button onClick={() => setShowSubModal(false)}><X size={20} /></button>
            </div>

            <div className="sub-modal__content">
              <div className="current-plan-card">
                <span>YOUR CURRENT PLAN</span>
                <h2>{profile?.plan || 'Free Plan'}</h2>
                <p>Status: Active • Auto-renews monthly</p>
              </div>

              <h3>Upgrade Plan</h3>
              <div className="sub-plans-list">
                <div 
                  className={`sub-plan-option ${editForm.plan === 'Premium Individual' ? 'active' : ''}`}
                  onClick={() => {
                    setEditForm(prev => ({ ...prev, plan: 'Premium Individual' }));
                    showNotification('Subscription updated in form! Press save inside Edit Profile.');
                  }}
                >
                  <div>
                    <strong>Premium Individual</strong>
                    <span>Ad-free music, offline downloads, high quality audio.</span>
                  </div>
                  <span className="price">$9.99 / mo</span>
                </div>

                <div 
                  className={`sub-plan-option ${editForm.plan === 'Premium Duo' ? 'active' : ''}`}
                  onClick={() => {
                    setEditForm(prev => ({ ...prev, plan: 'Premium Duo' }));
                    showNotification('Subscription updated in form! Press save inside Edit Profile.');
                  }}
                >
                  <div>
                    <strong>Premium Duo</strong>
                    <span>2 accounts under one roof. Shared playlists.</span>
                  </div>
                  <span className="price">$14.99 / mo</span>
                </div>

                <div 
                  className={`sub-plan-option ${editForm.plan === 'Premium Family' ? 'active' : ''}`}
                  onClick={() => {
                    setEditForm(prev => ({ ...prev, plan: 'Premium Family' }));
                    showNotification('Subscription updated in form! Press save inside Edit Profile.');
                  }}
                >
                  <div>
                    <strong>Premium Family</strong>
                    <span>Up to 6 accounts. Kid friendly filters.</span>
                  </div>
                  <span className="price">$19.99 / mo</span>
                </div>
              </div>

              <div className="profile-modal__actions" style={{ marginTop: '24px' }}>
                <button className="save-btn" onClick={() => {
                  setShowSubModal(false);
                  setShowEditModal(true);
                }}>
                  Modify Plan in Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. PAYMENT METHODS MODAL */}
      {showPaymentModal && (
        <div className="profile-modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-modal__header">
              <h2>Payment Methods</h2>
              <button onClick={() => setShowPaymentModal(false)}><X size={20} /></button>
            </div>

            <div className="payment-modal__content">
              {formMsg.text && (
                <div className={`form-message ${formMsg.type}`} style={{ marginBottom: '16px' }}>
                  {formMsg.text}
                </div>
              )}

              <h3>Saved Cards</h3>
              {savedCards.length === 0 ? (
                <p style={{ color: '#b3b3b3', margin: '8px 0 16px 0' }}>No cards saved.</p>
              ) : (
                <div className="saved-cards-list">
                  {savedCards.map(card => (
                    <div key={card.id} className="saved-card-item">
                      <div className="card-logo">
                        <CreditCard size={20} />
                      </div>
                      <div className="card-info">
                        <strong>{card.brand} ending in {card.last4}</strong>
                        <span>Expires {card.expiry} • {card.holder}</span>
                      </div>
                      <button className="remove-card-btn" onClick={() => handleRemoveCard(card.id)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <h3 style={{ marginTop: '24px' }}>Add New Card</h3>
              <form onSubmit={handlePaymentSubmit} className="profile-modal__form payment-form">
                <div className="form-group">
                  <label htmlFor="cardholder-input">Cardholder Name</label>
                  <input 
                    id="cardholder-input"
                    type="text" 
                    placeholder="e.g. Prajwal S A"
                    value={paymentForm.cardholder} 
                    onChange={e => setPaymentForm(prev => ({ ...prev, cardholder: e.target.value }))}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cardnumber-input">Card Number</label>
                  <input 
                    id="cardnumber-input"
                    type="text" 
                    placeholder="1234 5678 9876 5432"
                    value={paymentForm.cardNumber} 
                    onChange={e => setPaymentForm(prev => ({ ...prev, cardNumber: e.target.value }))}
                    maxLength="19"
                    required 
                  />
                </div>

                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="expiry-input">Expiry Date</label>
                    <input 
                      id="expiry-input"
                      type="text" 
                      placeholder="MM/YY"
                      value={paymentForm.expiry} 
                      onChange={e => setPaymentForm(prev => ({ ...prev, expiry: e.target.value }))}
                      maxLength="5"
                      required 
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="cvv-input">CVV</label>
                    <input 
                      id="cvv-input"
                      type="password" 
                      placeholder="***"
                      value={paymentForm.cvv} 
                      onChange={e => setPaymentForm(prev => ({ ...prev, cvv: e.target.value }))}
                      maxLength="3"
                      required 
                    />
                  </div>
                </div>

                <button type="submit" className="save-btn" style={{ width: '100%', marginTop: '8px' }}>
                  Save Card
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 5. MOBILE SETTINGS SLIDE-UP DRAWER */}
      {showSettingsDrawer && (
        <div className="mobile-settings-overlay" onClick={() => setShowSettingsDrawer(false)}>
          <div className="mobile-settings-drawer" onClick={e => e.stopPropagation()}>
            <div className="mobile-settings-drawer__header">
              <h2>Settings & Account</h2>
              <button type="button" className="mobile-settings-drawer__close" onClick={() => setShowSettingsDrawer(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="mobile-settings-list">
              <button 
                type="button"
                className="mobile-settings-item" 
                onClick={() => { setShowSettingsDrawer(false); setShowEditModal(true); }}
              >
                <User size={18} style={{ marginRight: '8px' }} /> Edit Profile
              </button>
              <button 
                type="button"
                className="mobile-settings-item" 
                onClick={() => { setShowSettingsDrawer(false); setShowPasswordModal(true); }}
              >
                <Lock size={18} style={{ marginRight: '8px' }} /> Change Password
              </button>
              <button 
                type="button"
                className="mobile-settings-item" 
                onClick={() => { setShowSettingsDrawer(false); setShowSubModal(true); }}
              >
                <Award size={18} style={{ marginRight: '8px' }} /> Subscription Plan
              </button>
              <button 
                type="button"
                className="mobile-settings-item" 
                onClick={() => { setShowSettingsDrawer(false); setShowPaymentModal(true); }}
              >
                <CreditCard size={18} style={{ marginRight: '8px' }} /> Payment Methods
              </button>
              <button 
                type="button"
                className="mobile-settings-item logout" 
                onClick={() => { setShowSettingsDrawer(false); onLogout(); }}
              >
                <LogOut size={18} style={{ marginRight: '8px' }} /> Log Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ProfilePage;
