import { useEffect, useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Camera, 
  Globe, 
  Play, 
  Shuffle, 
  Download, 
  Edit3, 
  Share2, 
  Trash2, 
  Search, 
  ChevronDown, 
  List, 
  Clock, 
  MoreHorizontal 
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { deleteSavedQueue, getSavedQueueById, renameSavedQueue } from '../utils/savedQueues';
import '../styles/Playlists.css';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

const cleanSongTitle = (title) => {
  if (!title) return '';
  // Split by common delimiters first: - , | , ft. , feat.
  let clean = title.split(/\s*-\s*|\s*\|\s*|\s*ft\.\s*|\s*feat\.\s*/i)[0];
  
  // Remove parentheses or brackets that contain "From ..." or "Official ..."
  clean = clean.replace(/\s*\(\s*(From|from)[^)]+\)/i, '');
  clean = clean.replace(/\s*\[\s*(From|from)[^\]]+\]/i, '');
  clean = clean.replace(/\s*\(\s*(Official\s+Video|Official\s+Audio|Lyrics|Lyrical|Video|Music\s+Video|Audio)\s*\)/i, '');
  clean = clean.replace(/\s*\[\s*(Official\s+Video|Official\s+Audio|Lyrics|Lyrical|Video|Music\s+Video|Audio)\s*\]/i, '');
  
  return clean.trim();
};

const getAlbumName = (song) => {
  if (song.album) return song.album;
  
  // Parse movie/album name from parenthesis like (From "Movie") or [From "Movie"]
  const match = String(song.title || '').match(/\((?:From|from)\s+["']?([^"'\)]+)["']?\)/i);
  if (match && match[1]) {
    return match[1].replace(/["']/g, '').trim();
  }
  
  const squareMatch = String(song.title || '').match(/\[(?:From|from)\s+["']?([^"']+)["']?\]/i);
  if (squareMatch && squareMatch[1]) {
    return squareMatch[1].replace(/["']/g, '').trim();
  }

  return "Single";
};

function SavedQueueDetail({ onPlaySong, onPlayAll, user }) {
  const { queueId } = useParams();
  const navigate = useNavigate();
  const [queue, setQueue] = useState(null);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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
    if (!queue) return;

    const nextName = window.prompt('Rename saved queue', queue.name || 'Saved Queue');
    if (nextName === null) return;

    try {
      renameSavedQueue(queue.id, nextName);
      const updatedQueue = getSavedQueueById(queue.id);
      setQueue(updatedQueue);
      showMessage('Playlist renamed successfully!');
    } catch (error) {
      showMessage(error.message || 'Could not rename playlist');
    }
  };

  const handleDelete = () => {
    if (!queue) return;
    if (!window.confirm(`Are you sure you want to delete "${queue.name}"?`)) return;

    deleteSavedQueue(queue.id);
    navigate('/library');
  };

  const handleUpdateCover = () => {
    if (!queue) return;
    const url = window.prompt("Enter cover image URL:");
    if (!url) return;

    const STORAGE_KEY = 'music_app_saved_queues_v1';
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (rawValue) {
      try {
        const currentQueues = JSON.parse(rawValue);
        const renamedQueues = currentQueues.map((q) =>
          q.id === queue.id ? { ...q, cover: url } : q
        );
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(renamedQueues));
        window.dispatchEvent(new CustomEvent('savedQueuesUpdated'));
        setQueue(prev => ({ ...prev, cover: url }));
        showMessage('Cover image updated successfully!');
      } catch (e) {
        showMessage('Error updating cover');
      }
    }
  };

  const handleEditDescription = () => {
    if (!queue) return;
    const desc = window.prompt("Enter playlist description:", queue.description || "My favorite tracks all in one place.");
    if (desc === null) return;

    const STORAGE_KEY = 'music_app_saved_queues_v1';
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (rawValue) {
      try {
        const currentQueues = JSON.parse(rawValue);
        const renamedQueues = currentQueues.map((q) =>
          q.id === queue.id ? { ...q, description: desc } : q
        );
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(renamedQueues));
        window.dispatchEvent(new CustomEvent('savedQueuesUpdated'));
        setQueue(prev => ({ ...prev, description: desc }));
        showMessage('Playlist description updated!');
      } catch (e) {
        showMessage('Error updating description');
      }
    }
  };

  const handleRemoveSong = (event, songId) => {
    event.stopPropagation();
    if (!queue) return;

    const updatedSongs = queue.songs.filter(s => s.id !== songId);
    const STORAGE_KEY = 'music_app_saved_queues_v1';
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (rawValue) {
      try {
        const currentQueues = JSON.parse(rawValue);
        const renamedQueues = currentQueues.map((q) =>
          q.id === queue.id ? { ...q, songs: updatedSongs, songCount: updatedSongs.length } : q
        );
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(renamedQueues));
        window.dispatchEvent(new CustomEvent('savedQueuesUpdated'));
        setQueue(prev => ({ ...prev, songs: updatedSongs, songCount: updatedSongs.length }));
        showMessage('Song removed from playlist');
      } catch (e) {
        showMessage('Error removing song');
      }
    }
  };

  const handlePlayPlaylist = () => {
    if (!queue?.songs?.length) {
      showMessage('This playlist is empty');
      return;
    }
    onPlayAll?.(queue.songs);
  };

  const calculateDurationText = (songs = []) => {
    const totalSeconds = songs.reduce((acc, song) => acc + (song.duration || 0), 0);
    if (totalSeconds === 0) return '0 min';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  const formatDateAdded = (timestamp) => {
    if (!timestamp) return 'Just now';
    const diff = Date.now() - Number(timestamp);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const filteredSongs = useMemo(() => {
    if (!queue?.songs) return [];
    const query = searchTerm.trim().toLowerCase();
    if (!query) return queue.songs;

    return queue.songs.filter(song => 
      String(song.title || '').toLowerCase().includes(query) ||
      String(song.artist || '').toLowerCase().includes(query)
    );
  }, [queue?.songs, searchTerm]);

  if (!queue) {
    return (
      <div className="playlists-panel playlist-detail-panel">
        <div className="playlists-header">
          <h3>Playlist Not Found</h3>
          <p>This playlist might have been deleted.</p>
        </div>
        <button type="button" className="playlist-back-btn" onClick={() => navigate('/library')}>
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <div className="playlists-panel playlist-detail-panel">
      {/* 1. HERO HEADER SECTION */}
      <div className="playlist-detail-hero">
        <div className="playlist-detail-hero__navigation">
          <button type="button" className="nav-arrow-btn" onClick={() => navigate(-1)} title="Go back">
            <ChevronLeft size={20} />
          </button>
          <button type="button" className="nav-arrow-btn" onClick={() => navigate(1)} title="Go forward">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="playlist-detail-hero__main">
          <div className="playlist-detail-hero__artwork-container">
            <img src={queue.cover || FALLBACK_IMAGE} alt={queue.name} />
            <button 
              type="button" 
              className="playlist-detail-hero__camera-overlay"
              onClick={handleUpdateCover}
              title="Change cover image"
            >
              <Camera size={16} />
            </button>
          </div>

          <div className="playlist-detail-hero__details">
            <span className="tag">PLAYLIST</span>
            <h1>{queue.name || 'Saved Queue'}</h1>
            <p 
              className="desc" 
              onClick={handleEditDescription} 
              title="Click to edit description"
            >
              {queue.description || "My favorite tracks all in one place. (Click to edit)"}
            </p>

            <div className="playlist-detail-hero__meta">
              <img 
                className="meta-avatar" 
                src={user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80"} 
                alt={user?.name || "Prajwal Angadi"} 
              />
              <strong>{user?.name || "Prajwal Angadi"}</strong>
              <span>• {queue.songs?.length || 0} songs, {calculateDurationText(queue.songs)}</span>
              <span>• <Globe size={12} style={{ display: 'inline', verticalAlign: 'middle', marginTop: '-2px' }} /> Public</span>
            </div>
          </div>
        </div>
      </div>

      {successMessageToShow => { /* spacer */ }}
      {message && <div className="playlist-message success" style={{ margin: '0 32px' }}>{message}</div>}

      {/* 2. ACTION BAR */}
      <div className="playlist-detail__action-bar">
        <div className="action-bar-left">
          <button type="button" className="detail-play-btn" onClick={handlePlayPlaylist}>
            <Play size={16} fill="currentColor" /> Play
          </button>
          <button type="button" className="circle-action-btn" title="Shuffle" onClick={handlePlayPlaylist}>
            <Shuffle size={18} />
          </button>
          <button type="button" className="circle-action-btn" title="Download">
            <Download size={18} />
          </button>
          <button type="button" className="circle-action-btn" title="Rename" onClick={handleRename}>
            <Edit3 size={18} />
          </button>
          <button type="button" className="circle-action-btn" title="Share" onClick={() => { navigator.clipboard.writeText(window.location.href); showMessage('Copied link to clipboard!'); }}>
            <Share2 size={18} />
          </button>
          <button type="button" className="circle-action-btn danger" title="Delete" onClick={handleDelete}>
            <Trash2 size={18} />
          </button>
        </div>

        <div className="action-bar-right">
          <div className="playlist-search-box">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search in playlist" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className="playlist-sort-dropdown">
            <span>Custom order</span>
            <ChevronDown size={14} />
          </div>
          <button type="button" className="view-list-btn" title="List View">
            <List size={16} />
          </button>
        </div>
      </div>

      {/* 3. TRACKS TABLE */}
      <div className="playlist-track-table">
        <div className="playlist-track-header">
          <span className="col-index">#</span>
          <span>Title</span>
          <span>Album</span>
          <span>Date Added</span>
          <span style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', paddingRight: '12px' }}><Clock size={16} /></span>
          <span></span>
        </div>

        {filteredSongs.length === 0 ? (
          <div className="empty-songs-placeholder">
            <p>{searchTerm ? "No songs match your search query." : "This playlist is empty. Add songs from Search or Player Queue!"}</p>
          </div>
        ) : (
          <div className="playlist-track-body">
            {filteredSongs.map((song, index) => (
              <div
                key={`${queue.id}-${song.id}-${index}`}
                className="playlist-track-row"
                onClick={() => onPlaySong?.(song, queue.songs)}
              >
                <span className="col-index">{index + 1}</span>
                <div className="col-title">
                  <img src={song.cover || song.image || FALLBACK_IMAGE} alt={song.title} />
                  <div>
                    <strong>{cleanSongTitle(song.title)}</strong>
                    <span>{song.artist || song.subtitle}</span>
                  </div>
                </div>
                <div className="col-album">
                  {getAlbumName(song)}
                </div>
                <div className="col-date">
                  {formatDateAdded(song.addedAt || queue.createdAt)}
                </div>
                <div className="col-duration">
                  {formatDuration(song.duration)}
                </div>
                <div className="col-options">
                  <button 
                    type="button" 
                    className="action-btn danger" 
                    onClick={(e) => handleRemoveSong(e, song.id)}
                    title="Remove from playlist"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SavedQueueDetail;
