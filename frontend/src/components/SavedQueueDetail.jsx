import { useEffect, useState, useMemo } from 'react';
import {
  ChevronLeft,
  Play,
  Shuffle,
  Heart,
  Share2,
  Download,
  MoreHorizontal,
  Search,
  LayoutGrid,
  List,
  Clock
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { deleteSavedQueue, getSavedQueueById, renameSavedQueue } from '../utils/savedQueues';
import heroImg from '../assets/playlists_hero_bg.png';
import '../styles/Playlists.css';
import '../styles/SavedQueueDetail.css';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

const PLAYLIST_DESCRIPTIONS = {
  'Road Trip': 'Scenic drives and open roads. Songs for adventure and freedom.',
  'Party Vibes': 'High energy tracks to keep you hyped. The ultimate party mix for any mood and every moment.',
  'Chill Vibes': 'Mellow beats and soothing melodies to unwind and relax.',
  'Workout Mix': 'Pump up your workout with high-intensity tracks.',
  'Romantic Hits': 'Love songs and heartfelt ballads for every romantic moment.',
  'Long Drive': 'Cruising through the highways with the perfect soundtrack.',
  'Rainy Day': 'Soft melodies perfect for rainy afternoons and cozy evenings.',
  'Acoustic Vibes': 'Stripped-down, raw acoustic performances that touch the soul.',
  'Late Night': 'Midnight melodies for those quiet late-night hours.',
};

const PLAYLIST_EMOJIS = {
  'Road Trip': '🚗',
  'Party Vibes': '🎉',
  'Chill Vibes': '🌊',
  'Workout Mix': '💪',
  'Romantic Hits': '❤️',
  'Long Drive': '🛣️',
  'Rainy Day': '🌧️',
  'Acoustic Vibes': '🎸',
  'Late Night': '🌙',
};

const cleanSongTitle = (title) => {
  if (!title) return '';
  let clean = title.split(/\s*-\s*|\s*\|\s*|\s*ft\.\s*|\s*feat\.\s*/i)[0];
  clean = clean.replace(/\s*\(\s*(From|from)[^)]+\)/i, '');
  clean = clean.replace(/\s*\[\s*(From|from)[^\]]+\]/i, '');
  clean = clean.replace(/\s*\(\s*(Official\s+Video|Official\s+Audio|Lyrics|Lyrical|Video|Music\s+Video|Audio)\s*\)/i, '');
  clean = clean.replace(/\s*\[\s*(Official\s+Video|Official\s+Audio|Lyrics|Lyrical|Video|Music\s+Video|Audio)\s*\]/i, '');
  return clean.trim();
};

const getAlbumName = (song) => {
  if (song.album) return song.album;
  const match = String(song.title || '').match(/\((?:From|from)\s+["']?([^"')]+)["']?\)/i);
  if (match && match[1]) return match[1].replace(/["']/g, '').trim();
  const squareMatch = String(song.title || '').match(/\[(?:From|from)\s+["']?([^"']+)["']?\]/i);
  if (squareMatch && squareMatch[1]) return squareMatch[1].replace(/["']/g, '').trim();
  return 'Single';
};

const getArtistName = (song) => {
  return song.artist || song.subtitle || 'Unknown Artist';
};

function SavedQueueDetail({ onPlaySong, onPlayAll, activeTrackId }) {
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  })();
  const { queueId } = useParams();
  const navigate = useNavigate();
  const [queue, setQueue] = useState(null);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

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
    const nextName = window.prompt('Rename playlist', queue.name || 'Saved Queue');
    if (nextName === null) return;
    try {
      renameSavedQueue(queue.id, nextName);
      setQueue(getSavedQueueById(queue.id));
      showMessage('Playlist renamed!');
    } catch (error) {
      showMessage(error.message || 'Could not rename');
    }
  };

  const handleDelete = () => {
    if (!queue) return;
    if (!window.confirm(`Delete "${queue.name}"?`)) return;
    deleteSavedQueue(queue.id);
    navigate('/library');
  };

  const handleUpdateCover = () => {
    if (!queue) return;
    const url = window.prompt('Enter cover image URL:');
    if (!url) return;
    const STORAGE_KEY = 'music_app_saved_queues_v1';
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (rawValue) {
      try {
        const queues = JSON.parse(rawValue);
        const updated = queues.map((q) => q.id === queue.id ? { ...q, cover: url } : q);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('savedQueuesUpdated'));
        setQueue(prev => ({ ...prev, cover: url }));
        showMessage('Cover updated!');
      } catch { showMessage('Error updating cover'); }
    }
  };

  const handleEditDescription = () => {
    if (!queue) return;
    const desc = window.prompt('Edit description:', queue.description || PLAYLIST_DESCRIPTIONS[queue.name] || '');
    if (desc === null) return;
    const STORAGE_KEY = 'music_app_saved_queues_v1';
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (rawValue) {
      try {
        const queues = JSON.parse(rawValue);
        const updated = queues.map((q) => q.id === queue.id ? { ...q, description: desc } : q);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('savedQueuesUpdated'));
        setQueue(prev => ({ ...prev, description: desc }));
        showMessage('Description updated!');
      } catch { showMessage('Error updating description'); }
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
        const queues = JSON.parse(rawValue);
        const updated = queues.map((q) =>
          q.id === queue.id ? { ...q, songs: updatedSongs, songCount: updatedSongs.length } : q
        );
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('savedQueuesUpdated'));
        setQueue(prev => ({ ...prev, songs: updatedSongs, songCount: updatedSongs.length }));
        showMessage('Song removed');
      } catch { showMessage('Error removing song'); }
    }
  };

  const handlePlayPlaylist = () => {
    if (!queue?.songs?.length) { showMessage('This playlist is empty'); return; }
    onPlayAll?.(queue.songs);
  };

  const calculateDurationText = (songs = []) => {
    const totalSeconds = songs.reduce((acc, song) => acc + (song.duration || 0), 0);
    if (totalSeconds === 0) return '0 min';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes} min`;
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

  const coverImage = queue?.cover || FALLBACK_IMAGE;
  const description = queue?.description || PLAYLIST_DESCRIPTIONS[queue?.name] || 'My favorite tracks all in one place.';
  const emoji = PLAYLIST_EMOJIS[queue?.name] || '';
  const userName = user?.name || 'Listener';

  if (!queue) {
    return (
      <div className="playlists-panel playlist-detail-panel">
        <div className="playlist-detail__not-found">
          <h3>Playlist Not Found</h3>
          <p>This playlist might have been deleted.</p>
          <button type="button" onClick={() => navigate('/library')}>Back to Library</button>
        </div>
      </div>
    );
  }

  return (
    <div className="playlists-panel playlist-detail-panel">
      {/* Back button */}
      <button type="button" className="playlist-detail__back-btn" onClick={() => navigate(-1)}>
        <ChevronLeft size={18} />
      </button>

      {/* Hero section with blurred cover background */}
      <div className="playlist-detail-hero">
        <div className="playlist-detail-hero__bg">
          <img src={coverImage} alt="" aria-hidden="true" />
        </div>
        <div className="playlist-detail-hero__accent">
          <img src={heroImg} alt="" aria-hidden="true" />
        </div>

        {/* Cover artwork */}
        <div
          className="playlist-detail-hero__artwork"
          onClick={handleUpdateCover}
          title="Click to change cover"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleUpdateCover();
            }
          }}
        >
          <img src={coverImage} alt={queue.name} />
          <button type="button" className="playlist-detail-hero__artwork-heart" onClick={(e) => e.stopPropagation()}>
            <Heart size={14} fill="#a78bfa" />
          </button>
        </div>

        {/* Info */}
        <div className="playlist-detail-hero__info">
          <span className="playlist-detail-hero__tag">PLAYLIST</span>
          <h1 className="playlist-detail-hero__title">{queue.name || 'Saved Queue'} {emoji}</h1>
          <p
            className="playlist-detail-hero__desc"
            onClick={handleEditDescription}
            title="Click to edit"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleEditDescription();
              }
            }}
          >
            {description}
          </p>
          <div className="playlist-detail-hero__meta">
            <div className="playlist-detail-hero__meta-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>
            <strong>{userName}</strong>
            <span>• {queue.songs?.length || 0} songs • {calculateDurationText(queue.songs)}</span>
          </div>
          <span className="playlist-detail-hero__updated">Updated today</span>
        </div>
      </div>

      {message && <div className="playlist-message success" style={{ margin: '0 36px' }}>{message}</div>}

      {/* Action bar */}
      <div className="playlist-detail__actions">
        <div className="playlist-detail__actions-left">
          <button type="button" className="playlist-detail__play-btn" onClick={handlePlayPlaylist}>
            <Play size={16} fill="currentColor" /> Play
          </button>
          <button type="button" className="playlist-detail__shuffle-btn" onClick={handlePlayPlaylist}>
            <Shuffle size={16} /> Shuffle
          </button>
          <button type="button" className="playlist-detail__icon-btn" title="Like">
            <Heart size={18} />
          </button>
          <button type="button" className="playlist-detail__icon-btn" title="Share" onClick={() => { navigator.clipboard.writeText(window.location.href); showMessage('Copied link!'); }}>
            <Share2 size={18} />
          </button>
          <button type="button" className="playlist-detail__icon-btn" title="Download">
            <Download size={18} />
          </button>
          <button type="button" className="playlist-detail__icon-btn" title="More" onClick={handleRename}>
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* Search & Sort toolbar */}
      <div className="playlist-detail__toolbar">
        <div className="playlist-detail__search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search in playlist"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="playlist-detail__toolbar-right">
          <div className="playlist-detail__sort">
            <span className="sort-label">Sort by:</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="newest">Recently Added</option>
              <option value="az">A-Z</option>
              <option value="duration">Duration</option>
            </select>
          </div>
          <div className="playlists-view-toggles">
            <button type="button" className="view-toggle-btn active" aria-label="Grid view">
              <LayoutGrid size={16} />
            </button>
            <button type="button" className="view-toggle-btn" aria-label="List view">
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Track table */}
      <div className="playlist-detail__tracks">
        <div className="playlist-detail__track-header">
          <span className="col-index">#</span>
          <span>TITLE</span>
          <span>ALBUM</span>
          <span>ARTIST</span>
          <span className="col-duration"><Clock size={14} /></span>
          <span></span>
          <span></span>
        </div>

        {filteredSongs.length === 0 ? (
          <div className="playlist-detail__empty">
            <p>{searchTerm ? 'No songs match your search.' : 'This playlist is empty. Add songs from Search or Player Queue!'}</p>
          </div>
        ) : (
          filteredSongs.map((song, index) => (
            <div
              key={`${queue.id}-${song.id}-${index}`}
              className={`playlist-detail__track-row${song.id && song.id === activeTrackId ? ' is-playing' : ''}`}
              onClick={() => onPlaySong?.(song, queue.songs)}
            >
              <span className="col-index">{index + 1}</span>
              <div className="col-title">
                <img src={song.cover || song.image || FALLBACK_IMAGE} alt={song.title} />
                <div className="col-title-text">
                  <strong>{cleanSongTitle(song.title)}</strong>
                  <span>{getArtistName(song)}</span>
                </div>
              </div>
              <div className="col-album">{getAlbumName(song)}</div>
              <div className="col-artist">{getArtistName(song)}</div>
              <div className="col-duration">{formatDuration(song.duration)}</div>
              <div className="col-heart">
                <button type="button" onClick={(e) => e.stopPropagation()} title="Like" style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '50%' }}>
                  <Heart size={15} />
                </button>
              </div>
              <div className="col-options">
                <button type="button" onClick={(e) => handleRemoveSong(e, song.id)} title="Remove">
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SavedQueueDetail;
