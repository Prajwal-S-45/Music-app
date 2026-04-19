import React, { useEffect, useState } from 'react';
import { Edit3, Play, PlayCircle, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { deleteSavedQueue, getSavedQueueById, renameSavedQueue } from '../utils/savedQueues';
import '../styles/components/Playlists.css';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

function SavedQueueDetail({ onPlaySong, onPlayAll }) {
  const { queueId } = useParams();
  const navigate = useNavigate();
  const [queue, setQueue] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const syncQueue = () => {
      const nextQueue = getSavedQueueById(queueId);
      setQueue(nextQueue);
    };

    syncQueue();
    window.addEventListener('savedQueuesUpdated', syncQueue);

    return () => window.removeEventListener('savedQueuesUpdated', syncQueue);
  }, [queueId]);

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 2200);
  };

  const handleRename = () => {
    if (!queue) {
      return;
    }

    const nextName = window.prompt('Rename saved queue', queue.name || 'Saved Queue');
    if (nextName === null) {
      return;
    }

    try {
      renameSavedQueue(queue.id, nextName);
      const updatedQueue = getSavedQueueById(queue.id);
      setQueue(updatedQueue);
      showMessage('Saved queue renamed');
    } catch (error) {
      showMessage(error.message || 'Could not rename queue');
    }
  };

  const handleDelete = () => {
    if (!queue) {
      return;
    }

    deleteSavedQueue(queue.id);
    navigate('/library');
  };

  if (!queue) {
    return (
      <div className="playlists-panel">
        <div className="playlists-header">
          <h3>Saved Queue Not Found</h3>
          <p>This saved queue might have been deleted.</p>
        </div>
        <button type="button" className="playlist-back-btn" onClick={() => navigate('/library')}>
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <div className="playlists-panel">
      <div className="playlists-header">
        <h3>{queue.name || 'Saved Queue'}</h3>
        <p>{queue.songs?.length || 0} songs</p>
      </div>

      <div className="playlist-toolbar playlist-toolbar--detail">
        <button type="button" className="playlist-back-btn" onClick={() => navigate('/library')}>
          Back to Library
        </button>
        <div className="playlist-detail__toolbar-actions">
          <button type="button" onClick={() => onPlayAll?.(queue.songs)}>
            <PlayCircle size={16} /> Play All
          </button>
          <button type="button" onClick={handleRename}>
            <Edit3 size={15} /> Rename
          </button>
          <button type="button" className="danger" onClick={handleDelete}>
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </div>

      {message && <div className="playlist-message success">{message}</div>}

      <section className="playlist-detail">
        <div className="playlist-songs">
          {queue.songs?.map((song, index) => (
            <button
              key={`${queue.id}-${song.id}-${index}`}
              type="button"
              className="playlist-song-row"
              onClick={() => onPlaySong?.(song, queue.songs)}
            >
              <img src={song.cover || song.image || FALLBACK_IMAGE} alt={song.title} />
              <div>
                <strong>{song.title}</strong>
                <span>{song.artist || song.subtitle}</span>
              </div>
              <Play size={14} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default SavedQueueDetail;
