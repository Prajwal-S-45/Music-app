import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { deleteSavedQueue, getSavedQueues, renameSavedQueue } from '../utils/savedQueues';
import PlaylistCard from './PlaylistCard';
import { Search, Plus } from 'lucide-react';
import '../styles/Playlists.css';

function Playlists({ onPlayAll, user }) {
  const [savedQueues, setSavedQueues] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const clearMessageTimerRef = useRef(null);

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
      const queues = getSavedQueues();
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('section') === 'artists') {
      navigate('/artists', { replace: true });
    }
  }, [location.search, navigate]);

  const sortedQueues = useMemo(() => {
    const queues = savedQueues.slice();

    if (sortBy === 'oldest') {
      return queues.sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
    }

    if (sortBy === 'az') {
      return queues.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    }

    return queues.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  }, [savedQueues, sortBy]);

  const handleDeleteQueue = useCallback((queueId) => {
    deleteSavedQueue(queueId);
    setSavedQueues(getSavedQueues());
    showSuccessMessage('Playlist deleted');
  }, [showSuccessMessage]);

  const handleRenameQueue = useCallback((queue) => {
    const nextName = window.prompt('Rename saved queue', queue.name || 'Saved Queue');
    if (nextName === null) {
      return;
    }

    try {
      renameSavedQueue(queue.id, nextName);
      setSavedQueues(getSavedQueues());
      showSuccessMessage('Saved queue renamed');
    } catch (error) {
      showSuccessMessage(error.message || 'Could not rename queue');
    }
  }, [showSuccessMessage]);

  const handlePlayAll = useCallback((queue) => {
    if (!queue?.songs?.length) {
      showSuccessMessage('This playlist is empty');
      return;
    }

    onPlayAll?.(queue.songs);
  }, [onPlayAll, showSuccessMessage]);

  const handleOpenQueue = useCallback((queueId) => {
    navigate(`/library/saved/${queueId}`);
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

  return (
    <div className="playlists-panel">
      {/* Mobile-only Library Header */}
      <div className="library-mobile-header">
        <div className="library-mobile-header-top">
          <div className="library-profile-btn" onClick={() => navigate('/profile')}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
          </div>
          <span className="library-title">Your Library</span>
          <div className="library-actions">
            <button aria-label="Search Library">
              <Search size={20} />
            </button>
            <button aria-label="Create Playlist" onClick={handleCreatePlaylist}>
              <Plus size={24} />
            </button>
          </div>
        </div>
        <div className="library-mobile-pills">
          <button className="active" onClick={() => navigate('/library')}>Playlists</button>
          <button onClick={() => navigate('/artists')}>Artists</button>
        </div>
      </div>

      <div className="playlists-header desktop-only">
        <div className="playlists-header-left">
          <h1>Playlists</h1>
          <p>Create, organize and find the perfect playlist for every moment.</p>
        </div>
        <button className="create-playlist-btn-top" onClick={handleCreatePlaylist}>
          <Plus size={16} /> Create Playlist
        </button>
      </div>

      <div className="playlists-section-title">
        <h3>Your Playlists</h3>
        {sortedQueues.length > 0 && (
          <div className="playlist-toolbar">
            <label>
              Sort
              <select value={sortBy} onChange={handleSortChange}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="az">A-Z</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {success && <div className="playlist-message success">{success}</div>}

      {/* Renders both the grid of playlists (if they exist) and the bottom empty state card exactly as represented in reference image */}
      {sortedQueues.length > 0 && (
        <div className="playlist-grid" style={{ marginBottom: '24px' }}>
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

      {/* Empty State / Creation card displayed at the bottom or when list is empty */}
      <div className="empty-playlists-box">
        <div className="empty-playlists-box__inner">
          <div className="empty-playlists-note-icon">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <h2>No playlists yet!</h2>
          <p>Create your first playlist and it will show up here.</p>
          <button 
            className="purple-create-btn"
            onClick={handleCreatePlaylist}
          >
            <Plus size={16} /> Create Playlist
          </button>
        </div>
      </div>
    </div>
  );
}

export default Playlists;
