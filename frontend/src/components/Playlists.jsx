import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { deleteSavedQueue, getSavedQueues, renameSavedQueue } from '../utils/savedQueues';
import ArtistsPage from './ArtistsPage';
import PlaylistCard from './PlaylistCard';
import '../styles/Playlists.css';

function Playlists({ onPlayAll }) {
  const [savedQueues, setSavedQueues] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const artistsSectionRef = useRef(null);
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
    if (params.get('section') !== 'artists') {
      return;
    }

    const timerId = window.setTimeout(() => {
      artistsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [location.search]);

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

    showSuccessMessage('Saved queue deleted');
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
      return;
    }

    onPlayAll?.(queue.songs);
  }, [onPlayAll]);

  const handleOpenQueue = useCallback((queueId) => {
    navigate(`/library/saved/${queueId}`);
  }, [navigate]);

  const handleSortChange = useCallback((event) => {
    setSortBy(event.target.value);
  }, []);

  return (
    <div className="playlists-panel">
      <div className="playlists-header">
        <h3>Your Library</h3>
        <p>Saved queues are stored locally so you can replay them anytime.</p>
      </div>

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

      {sortedQueues.length === 0 && (
        <div className="empty-state">
          <p>No saved queues yet. Save your current queue from the queue panel.</p>
        </div>
      )}

      {success && <div className="playlist-message success">{success}</div>}

      {sortedQueues.length > 0 && (
        <div className="playlist-grid">
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

      <div ref={artistsSectionRef} id="artists">
        <ArtistsPage embedded />
      </div>
    </div>
  );
}

export default Playlists;
