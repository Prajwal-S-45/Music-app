import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, PenTool, Lock, Award, CreditCard, Settings as SettingsIcon, LogOut,
  Plus, CheckCircle2, ChevronRight, ArrowLeft, History, User, Check,
  Music, Download, Headphones, X, ShieldAlert, Heart, ChevronLeft, Users, Clock, Trash2
} from 'lucide-react';
import apiClient from '../api/client';
import { getSavedQueues, deleteSavedQueue, saveQueueToLibrary } from '../utils/savedQueues';
import '../styles/ProfilePage.css';

// Pre-set avatars for profile selection

const PRESET_AVATARS = [
  'http://localhost:5000/uploads/profile_avatar.png',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80'
];

function ProfileArtistAvatar({ artist }) {
  const name = artist?.name || '';
  const initialImg = artist?.image || artist?.avatar || artist?.thumbnail || artist?.cover || artist?.img || artist?.picture || '';

  const [src, setSrc] = useState(
    initialImg && typeof initialImg === 'string' && initialImg.startsWith('http')
      ? initialImg
      : ''
  );
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (initialImg && typeof initialImg === 'string' && initialImg.startsWith('http') && !hasError) {
      setSrc(initialImg);
    } else if (name) {
      apiClient.get(`/api/music/artist-image?name=${encodeURIComponent(name)}`)
        .then(res => {
          if (isMounted && res.data?.url) {
            setSrc(res.data.url);
          }
        })
        .catch(() => { });
    }
    return () => { isMounted = false; };
  }, [name, initialImg, hasError]);

  const handleError = () => {
    if (!hasError && name) {
      setHasError(true);
      apiClient.get(`/api/music/artist-image?name=${encodeURIComponent(name)}`)
        .then(res => {
          if (res.data?.url) {
            setSrc(res.data.url);
          }
        })
        .catch(() => { });
    }
  };

  if (!src || (hasError && !src)) {
    const letter = name ? name.charAt(0).toUpperCase() : 'A';
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1e293b, #334155)',
          color: '#38bdf8',
          fontWeight: 700,
          fontSize: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {letter}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      onError={handleError}
      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
    />
  );
}

function ProfilePage({ user, token, onLogout, onUserUpdate, refreshSignal, onPlayTrack, onQueueTrack }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // States
  const [profile, setProfile] = useState(user);
  const [activeTab, setActiveTab] = useState('Playlists');
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

  const [formMsg, setFormMsg] = useState({ text: '', type: '' });

  // Format artist role (Singer, Artist, etc.)
  const getArtistRole = (artist) => {
    if (!artist) return 'Artist';
    const role = artist.role || artist.type || artist.subtitle;
    if (!role || typeof role !== 'string') return 'Artist';
    const cleanRole = role.trim();
    const isLanguage = ['hindi', 'english', 'punjabi', 'tamil', 'telugu', 'kannada', 'marathi', 'bengali', 'malayalam'].includes(cleanRole.toLowerCase());
    if (isLanguage) return 'Singer';
    return cleanRole.charAt(0).toUpperCase() + cleanRole.slice(1);
  };

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
  const syncAllPlaylists = useCallback(async () => {
    setLoadingPlaylists(true);
    try {
      // Blacklist filter for requested items to delete
      const isBlacklisted = (name) => {
        if (!name) return false;
        const n = String(name).trim().toLowerCase();
        const blacklist = [
          'liked songs',
          'saved queue',
          'praj',
          'road trip',
          'party vibes',
          'chill vibes',
          'workout',
          'romantic',
          'long drive',
          'rainy day',
          'acoustic',
          'late night'
        ];
        return blacklist.some(term => n.includes(term));
      };

      // 1. DB Playlists
      let dbPlaylists = [];
      try {
        const res = await apiClient.get('/api/playlists');
        dbPlaylists = Array.isArray(res.data) ? res.data : [];
      } catch (err) {
        console.warn('Could not fetch DB playlists:', err);
      }

      // 2. Local Saved Queues (from savedQueues.js)
      const v1Queues = getSavedQueues();

      // 3. Legacy Local Saved Queues
      let legacyQueues = [];
      try {
        const legacyStr = localStorage.getItem('music_app_saved_queues');
        legacyQueues = legacyStr ? JSON.parse(legacyStr) : [];
      } catch { }

      // 4. Liked / Saved External Playlists
      let likedPlaylists = [];
      try {
        const likedStr = localStorage.getItem('music_app_liked_playlists');
        likedPlaylists = likedStr ? JSON.parse(likedStr) : [];
      } catch { }

      // 5. Purge blacklisted playlists from localStorage
      try {
        const v1Str = localStorage.getItem('music_app_saved_queues_v1');
        if (v1Str) {
          const parsed = JSON.parse(v1Str);
          const filtered = parsed.filter(p => !isBlacklisted(p.name));
          if (filtered.length !== parsed.length) {
            localStorage.setItem('music_app_saved_queues_v1', JSON.stringify(filtered));
          }
        }
        const legacyStr = localStorage.getItem('music_app_saved_queues');
        if (legacyStr) {
          const parsed = JSON.parse(legacyStr);
          const filtered = parsed.filter(p => !isBlacklisted(p.name));
          if (filtered.length !== parsed.length) {
            localStorage.setItem('music_app_saved_queues', JSON.stringify(filtered));
          }
        }
        const likedStr = localStorage.getItem('music_app_liked_playlists');
        if (likedStr) {
          const parsed = JSON.parse(likedStr);
          const filtered = parsed.filter(p => !isBlacklisted(p.title || p.name));
          if (filtered.length !== parsed.length) {
            localStorage.setItem('music_app_liked_playlists', JSON.stringify(filtered));
          }
        }
      } catch (e) {
        console.warn('Error purging local blacklisted playlists:', e);
      }

      // 6. Delete blacklisted DB playlists via API
      for (const p of dbPlaylists) {
        if (isBlacklisted(p.name)) {
          try {
            await apiClient.delete(`/api/playlists/${p.id}`);
          } catch { }
        }
      }

      const validDb = dbPlaylists.filter(p => !isBlacklisted(p.name));

      // Map and deduplicate local queues
      const localMap = new Map();
      v1Queues.forEach(q => {
        if (q && q.id && !isBlacklisted(q.name)) {
          localMap.set(String(q.id), {
            id: q.id,
            name: q.name || 'Saved Playlist',
            count: q.songs?.length || q.songCount || 0,
            cover: q.cover || q.songs?.[0]?.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80',
            isLocal: true,
            type: 'Saved Queue'
          });
        }
      });

      legacyQueues.forEach(q => {
        if (q && q.id && !isBlacklisted(q.name) && !localMap.has(String(q.id))) {
          localMap.set(String(q.id), {
            id: q.id,
            name: q.name || 'Saved Playlist',
            count: q.songs?.length || 0,
            cover: q.cover || q.songs?.[0]?.cover || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=500&q=80',
            isLocal: true,
            type: 'Local Playlist'
          });
        }
      });

      const formattedDb = validDb.map(p => ({
        id: p.id,
        name: p.name,
        count: p.song_count || 0,
        cover: p.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80',
        description: p.description,
        isDb: true,
        type: 'Created'
      }));

      const formattedLikedExt = likedPlaylists
        .filter(p => !isBlacklisted(p.title || p.name))
        .map(p => ({
          id: p.id,
          name: p.title || p.name || 'Saved Playlist',
          count: p.songCount || p.songs?.length || 0,
          cover: p.cover || p.image || p.thumbnail || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80',
          isLikedPlaylist: true,
          type: 'Liked'
        }));

      const combined = [
        ...formattedDb,
        ...Array.from(localMap.values()),
        ...formattedLikedExt
      ];

      // Keep ONLY the last two playlists
      const lastTwo = combined.slice(Math.max(0, combined.length - 2));

      setPlaylists(lastTwo);
    } catch (err) {
      console.error('Failed to sync playlists:', err);
    } finally {
      setLoadingPlaylists(false);
    }
  }, []);

  useEffect(() => {
    const loadAllData = async () => {
      // 1. Playlists
      await syncAllPlaylists();

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
        const list = saved ? JSON.parse(saved) : [];
        setFollowedArtists(list);

        // Auto-enrich any followed artists missing images via API
        list.forEach(async (a) => {
          if (!a.image || !a.image.startsWith('http') || a.image.includes('unsplash.com')) {
            try {
              const imgRes = await apiClient.get(`/api/music/artist-image?name=${encodeURIComponent(a.name)}`);
              if (imgRes.data?.url) {
                setFollowedArtists(prev => {
                  const updated = prev.map(item => item.name.toLowerCase() === a.name.toLowerCase() ? { ...item, image: imgRes.data.url } : item);
                  try { localStorage.setItem('music_app_followed_artists', JSON.stringify(updated)); } catch { }
                  return updated;
                });
              }
            } catch { }
          }
        });
      } catch { }

      // 4. Recently Played
      try {
        const saved = localStorage.getItem('music_app_recently_played');
        setRecentlyPlayed(saved ? JSON.parse(saved) : []);
      } catch { }

      // 5. History
      try {
        const res = await apiClient.get('/api/history');
        setHistoryItems(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to load history items:', err);
      }
    };

    loadAllData();

    // Listeners for updates across the app
    const handleFollowsUpdate = () => {
      try {
        const saved = localStorage.getItem('music_app_followed_artists');
        setFollowedArtists(saved ? JSON.parse(saved) : []);
      } catch { }
    };
    const handlePlaylistUpdate = () => syncAllPlaylists();

    window.addEventListener('followedArtistsUpdated', handleFollowsUpdate);
    window.addEventListener('savedQueuesUpdated', handlePlaylistUpdate);
    window.addEventListener('playlistsUpdated', handlePlaylistUpdate);
    window.addEventListener('likedPlaylistsUpdated', handlePlaylistUpdate);
    window.addEventListener('storage', handlePlaylistUpdate);

    return () => {
      window.removeEventListener('followedArtistsUpdated', handleFollowsUpdate);
      window.removeEventListener('savedQueuesUpdated', handlePlaylistUpdate);
      window.removeEventListener('playlistsUpdated', handlePlaylistUpdate);
      window.removeEventListener('likedPlaylistsUpdated', handlePlaylistUpdate);
      window.removeEventListener('storage', handlePlaylistUpdate);
    };
  }, [token, refreshSignal, syncAllPlaylists]);

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

  // Create & Delete playlist helpers
  const handleCreatePlaylist = async () => {
    const name = prompt('Enter playlist name:');
    if (!name || !name.trim()) return;
    const cleanName = name.trim();

    try {
      saveQueueToLibrary({ name: cleanName, songs: [] });
      showNotification('Playlist created successfully!');
    } catch (e) {
      const now = Date.now();
      const queueId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `saved-queue-${now}-${Math.random().toString(36).slice(2, 8)}`;
      const fallbackQueue = {
        id: queueId,
        name: cleanName,
        songs: [],
        songCount: 0,
        cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80',
        createdAt: now
      };
      const STORAGE_KEY = 'music_app_saved_queues_v1';
      let queues = [];
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) queues = JSON.parse(raw);
      } catch { }
      queues.unshift(fallbackQueue);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queues));
      window.dispatchEvent(new CustomEvent('savedQueuesUpdated'));
      showNotification('Playlist created successfully!');
    }

    try {
      await apiClient.post('/api/playlists/create', { name: cleanName, description: '' });
    } catch (err) {
      console.warn('API creation skipped or failed:', err);
    }

    syncAllPlaylists();
  };

  const handleDeletePlaylist = async (e, playlist) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${playlist.name}"?`)) return;

    if (playlist.isLocal) {
      deleteSavedQueue(playlist.id);
      try {
        const legacyStr = localStorage.getItem('music_app_saved_queues');
        if (legacyStr) {
          const legacyArr = JSON.parse(legacyStr).filter(q => q.id !== playlist.id);
          localStorage.setItem('music_app_saved_queues', JSON.stringify(legacyArr));
        }
      } catch { }
      window.dispatchEvent(new CustomEvent('savedQueuesUpdated'));
      showNotification('Playlist deleted');
      syncAllPlaylists();
    } else if (playlist.isDb) {
      try {
        await apiClient.delete(`/api/playlists/${playlist.id}`);
        showNotification('Playlist deleted');
        syncAllPlaylists();
      } catch (err) {
        showNotification('Could not delete playlist', 'error');
      }
    } else if (playlist.isLikedPlaylist) {
      try {
        const likedStr = localStorage.getItem('music_app_liked_playlists');
        if (likedStr) {
          const likedArr = JSON.parse(likedStr).filter(p => p.id !== playlist.id);
          localStorage.setItem('music_app_liked_playlists', JSON.stringify(likedArr));
          window.dispatchEvent(new CustomEvent('likedPlaylistsUpdated'));
        }
      } catch { }
      showNotification('Removed from saved playlists');
    }
  };

  // Remove handlers for tabs
  const handleRemoveLikedSong = async (songId) => {
    try {
      await apiClient.delete(`/api/music/liked-songs/${songId}`);
    } catch (err) {
      try {
        await apiClient.delete(`/api/music/liked/${songId}`);
      } catch (e) {
        console.warn('API unlike failed:', e);
      }
    }
    setLikedSongs(prev => prev.filter(s => (s.song_id || s.id) !== songId));
    showNotification('Song removed from Liked Songs');
  };

  const handleUnfollowArtist = (artistId, artistName) => {
    try {
      const saved = localStorage.getItem('music_app_followed_artists');
      let list = saved ? JSON.parse(saved) : [];
      list = list.filter(a => (a.id !== artistId && a.name !== artistName));
      localStorage.setItem('music_app_followed_artists', JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('followedArtistsUpdated'));
      setFollowedArtists(list);
      showNotification(`Unfollowed ${artistName || 'artist'}`);
    } catch (err) {
      console.error('Failed to unfollow artist:', err);
    }
  };

  const handleRemoveRecentlyPlayedTrack = (trackIndex) => {
    try {
      const saved = localStorage.getItem('music_app_recently_played');
      let list = saved ? JSON.parse(saved) : [];
      list = list.filter((_, idx) => idx !== trackIndex);
      localStorage.setItem('music_app_recently_played', JSON.stringify(list));
      setRecentlyPlayed(list);
      showNotification('Track removed from Recently Played');
    } catch (err) {
      console.error('Failed to remove track:', err);
    }
  };

  const handleClearRecentlyPlayed = () => {
    if (!window.confirm('Clear all recently played tracks?')) return;
    localStorage.removeItem('music_app_recently_played');
    setRecentlyPlayed([]);
    showNotification('Recently Played cleared');
  };

  const handleDeleteHistoryItem = async (itemId) => {
    try {
      await apiClient.delete(`/api/history/${itemId}`);
    } catch (err) {
      console.warn('API history delete failed:', err);
    }
    setHistoryItems(prev => prev.filter(item => item.id !== itemId));
    showNotification('History item removed');
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all listening history?')) return;
    try {
      await apiClient.delete('/api/history');
    } catch (err) {
      console.warn('API history clear failed:', err);
    }
    setHistoryItems([]);
    showNotification('Listening history cleared');
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
            {activeTab === 'Playlists' ? (
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

                  <button type="button" className="mobile-profile__stat-item" onClick={() => navigate('/history')}>
                    <div className="mobile-profile__stat-icon history">
                      <Clock size={18} />
                    </div>
                    <span className="label">History</span>
                    <span className="value">Recent</span>
                  </button>

                  <button type="button" className="mobile-profile__stat-item" onClick={() => setActiveTab('Artists')}>
                    <div className="mobile-profile__stat-icon following">
                      <Users size={18} />
                    </div>
                    <span className="label">Artists</span>
                    <span className="value">Followed</span>
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
                      <Download size={20} color="#e2e8f0" />
                      <strong>Downloads</strong>
                      <span>24 songs</span>
                    </div>

                    <div className="mobile-profile__quick-card" onClick={() => navigate('/history')}>
                      <Clock size={20} color="#f97316" />
                      <strong>History</strong>
                      <span>Recently played</span>
                    </div>

                    <div className="mobile-profile__quick-card" onClick={() => setActiveTab('Artists')}>
                      <Users size={20} color="#3b82f6" />
                      <strong>Artists</strong>
                      <span>Followed artists</span>
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
                  onClick={() => setActiveTab('Playlists')}
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
                  ← Back to Profile
                </button>

                {activeTab === 'Playlists' && (
                  <div className="tab-view__grid">
                    <div className="tab-view__grid-header">
                      <h2>Your Saved & Liked Playlists</h2>
                      <button className="premium-profile__btn-glow" onClick={handleCreatePlaylist}>
                        <Plus size={16} /> Create Playlist
                      </button>
                    </div>
                    <div className="playlists-grid-layout">
                      {playlists.length === 0 ? (
                        <div className="empty-tab-state" style={{ gridColumn: '1 / -1' }}>
                          <Music size={48} className="icon" />
                          <p>No playlists found.</p>
                        </div>
                      ) : playlists.map(playlist => (
                        <div
                          key={playlist.id}
                          className="playlist-item-card"
                          style={{ position: 'relative' }}
                          onClick={() => {
                            if (playlist.isLocal) {
                              navigate(`/library/saved/${playlist.id}`);
                            } else if (playlist.isDb) {
                              navigate('/library');
                            } else if (playlist.isLikedPlaylist) {
                              navigate(`/playlist/${playlist.id}`);
                            } else {
                              navigate('/library');
                            }
                          }}
                        >
                          <div className="playlist-item-card__image-container" style={{ position: 'relative' }}>
                            <img src={playlist.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80'} alt={playlist.name} />
                            <button
                              className="delete-playlist-btn"
                              title="Delete Playlist"
                              onClick={(e) => handleDeletePlaylist(e, playlist)}
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                background: 'rgba(0,0,0,0.65)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '28px',
                                height: '28px',
                                color: '#ef4444',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 5
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <strong>{playlist.name}</strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span className="playlist-badge" style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', fontWeight: '600' }}>
                              {playlist.type || 'Playlist'}
                            </span>
                            <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.85rem' }}>
                              {playlist.count || 0} songs
                            </span>
                          </div>
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
                            <tr key={song.id || index} onClick={() => onPlayTrack?.(song)}>
                              <td>{index + 1}</td>
                              <td className="song-title-cell">
                                <img src={song.thumbnail || song.cover} alt="" />
                                <div>
                                  <strong>{song.title}</strong>
                                  <span>{song.artist}</span>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <button
                                    className="play-song-row-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onQueueTrack?.(song);
                                    }}
                                  >
                                    Queue
                                  </button>
                                  <button
                                    className="remove-song-row-btn"
                                    title="Remove from Liked Songs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveLikedSong(song.song_id || song.id);
                                    }}
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.15)',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      borderRadius: '6px',
                                      padding: '6px 10px',
                                      color: '#f87171',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.8rem',
                                      fontWeight: '600'
                                    }}
                                  >
                                    <Trash2 size={13} /> Remove
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeTab === 'Artists' && (
                  <div className="tab-view__grid">
                    <h2>Followed Artists</h2>
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
                            onClick={() => navigate(`/artists/${encodeURIComponent(artist.name)}`)}
                          >
                            <div className="artist-circle-card__image">
                              <ProfileArtistAvatar artist={artist} />
                            </div>
                            <strong>{artist.name}</strong>
                            <span>{getArtistRole(artist)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'History' && (
                  <div className="tab-view__list">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h2 style={{ margin: 0 }}>Listening History</h2>
                      {historyItems.length > 0 && (
                        <button
                          onClick={handleClearHistory}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            color: '#f87171',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Trash2 size={13} /> Clear History
                        </button>
                      )}
                    </div>
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
                            <th>Action</th>
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
                              <td>
                                <button
                                  title="Delete Item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteHistoryItem(item.id);
                                  }}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    color: '#f87171',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.78rem',
                                    fontWeight: '600'
                                  }}
                                >
                                  <Trash2 size={12} /> Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
              {['Playlists', 'Liked Songs', 'Artists', 'Downloads', 'History'].map(tab => (
                <button
                  key={tab}
                  className={activeTab === tab ? 'active' : ''}
                  onClick={() => {
                    if (tab === 'History') {
                      navigate('/history');
                    } else {
                      setActiveTab(tab);
                    }
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Main Tab Content */}
          <div className="premium-profile__content">

            {/* --- PLAYLISTS TAB --- */}
            {activeTab === 'Playlists' && (
              <div className="tab-view__grid">
                <div className="tab-view__grid-header">
                  <div>
                    <h2>Your Saved & Liked Playlists</h2>
                    <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.88rem', marginTop: '4px' }}>
                      All playlists created, saved, or liked across your library
                    </p>
                  </div>
                  <button className="premium-profile__btn-glow" onClick={handleCreatePlaylist}>
                    <Plus size={16} /> Create Playlist
                  </button>
                </div>

                <div className="playlists-grid-layout">
                  {playlists.length === 0 ? (
                    <div className="empty-tab-state" style={{ gridColumn: '1 / -1' }}>
                      <Music size={48} className="icon" />
                      <p>No playlists found.</p>
                    </div>
                  ) : playlists.map(playlist => (
                    <div
                      key={playlist.id}
                      className="playlist-item-card"
                      style={{ position: 'relative' }}
                      onClick={() => {
                        if (playlist.isLocal) {
                          navigate(`/library/saved/${playlist.id}`);
                        } else if (playlist.isDb) {
                          navigate('/library');
                        } else if (playlist.isLikedPlaylist) {
                          navigate(`/playlist/${playlist.id}`);
                        } else {
                          navigate('/library');
                        }
                      }}
                    >
                      <div className="playlist-item-card__image-container" style={{ position: 'relative' }}>
                        <img
                          src={playlist.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80'}
                          alt={playlist.name}
                        />
                        <button
                          className="delete-playlist-btn"
                          title="Delete Playlist"
                          onClick={(e) => handleDeletePlaylist(e, playlist)}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'rgba(0,0,0,0.65)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 5
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <strong>{playlist.name}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span className="playlist-badge" style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', fontWeight: '600' }}>
                          {playlist.type || 'Playlist'}
                        </span>
                        <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.85rem' }}>
                          {playlist.count || 0} songs
                        </span>
                      </div>
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
                        <tr key={song.id || index} onClick={() => onPlayTrack?.(song)}>
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
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button
                                className="play-song-row-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onQueueTrack?.(song);
                                }}
                              >
                                Add to Queue
                              </button>
                              <button
                                className="remove-song-row-btn"
                                title="Remove from Liked Songs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveLikedSong(song.song_id || song.id);
                                }}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  borderRadius: '6px',
                                  padding: '6px 12px',
                                  color: '#f87171',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '0.82rem',
                                  fontWeight: '600'
                                }}
                              >
                                <Trash2 size={14} /> Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* --- ARTISTS TAB --- */}
            {activeTab === 'Artists' && (
              <div className="tab-view__grid">
                <h2>Followed Artists</h2>
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
                        onClick={() => navigate(`/artists/${encodeURIComponent(artist.name)}`)}
                      >
                        <div className="artist-circle-card__image">
                          <ProfileArtistAvatar artist={artist} />
                        </div>
                        <strong>{artist.name}</strong>
                        <span>{getArtistRole(artist)}</span>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ margin: 0 }}>Listening History</h2>
                  {historyItems.length === 0 ? null : (
                    <button
                      onClick={handleClearHistory}
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        color: '#f87171',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Trash2 size={14} /> Clear History
                    </button>
                  )}
                </div>
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
                        <th>Action</th>
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
                          <td>
                            <button
                              className="remove-song-row-btn"
                              title="Delete Item"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteHistoryItem(item.id);
                              }}
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '6px',
                                padding: '5px 10px',
                                color: '#f87171',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.78rem',
                                fontWeight: '600'
                              }}
                            >
                              <Trash2 size={13} /> Remove
                            </button>
                          </td>
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
