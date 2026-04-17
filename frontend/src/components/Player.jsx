import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../styles/components/Player.css';

function Player({ token, activeTrack, queuedTrack, onLikeUpdate }) {
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [likedSongIds, setLikedSongIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [queue, setQueue] = useState([]);
  const audioRef = useRef(null);

  useEffect(() => {
    fetchSongs();
    fetchLikedSongs();
  }, [token]);

  useEffect(() => {
    if (activeTrack) {
      playSong(activeTrack);
    }
  }, [activeTrack?.requestId]);

  useEffect(() => {
    if (queuedTrack) {
      enqueueSong(queuedTrack);
    }
  }, [queuedTrack?.queueId]);

  const fetchSongs = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/music/songs');
      setSongs(response.data);
    } catch (error) {
      console.error('Error fetching songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLikedSongs = async () => {
    if (!token) return;

    try {
      const response = await axios.get('http://localhost:5000/api/music/liked', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLikedSongIds(response.data.map((song) => song.id));
    } catch (error) {
      console.error('Error fetching liked songs:', error);
    }
  };

  const playSong = (song) => {
    if (!song.file_url) {
      setMessage(`No audio file configured for ${song.title}`);
      return;
    }

    const normalizedUrl = song.file_url.startsWith('http')
      ? song.file_url
      : `http://localhost:5000${song.file_url}`;

    setCurrentSong(song);
    setIsPlaying(true);
    setMessage('');
    
    if (audioRef.current) {
      audioRef.current.src = normalizedUrl;
      audioRef.current
        .play()
        .catch(() => setMessage(`Unable to play ${song.title}. Check the audio file URL.`));
    }
  };

  const enqueueSong = (song, event) => {
    if (event) {
      event.stopPropagation();
    }

    setQueue((current) => [...current, song]);
    setMessage(`${song.title} added to queue`);
  };

  const playNextFromQueue = () => {
    if (queue.length === 0) {
      setIsPlaying(false);
      return;
    }

    const [nextSong, ...remainingQueue] = queue;
    setQueue(remainingQueue);
    playSong(nextSong);
  };

  const removeFromQueue = (indexToRemove) => {
    setQueue((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const likeSong = async (song, event) => {
    event.stopPropagation();

    if (!token) {
      setMessage('Login required to like songs.');
      return;
    }

    try {
      await axios.post(
        'http://localhost:5000/api/music/like',
        { songId: song.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLikedSongIds((current) => [...new Set([...current, song.id])]);
      setMessage(`Liked ${song.title}`);
      if (onLikeUpdate) {
        onLikeUpdate();
      }
    } catch (error) {
      if (error.response?.status === 400) {
        setMessage('Song already liked.');
        return;
      }

      setMessage('Could not like this song right now.');
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (audioRef.current) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="player-container">
      <div className="player-header">
        <h2>🎵 Now Playing</h2>
      </div>

      {currentSong && (
        <div className="now-playing">
          <div className="song-info">
            <h3>{currentSong.title}</h3>
            <p>{currentSong.artist}</p>
            <p className="album">{currentSong.album}</p>
          </div>
          <div className="player-controls">
            <button onClick={togglePlay}>
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <span className="duration">
              {currentSong.duration ? formatDuration(currentSong.duration) : '0:00'}
            </span>
          </div>
        </div>
      )}

      {message && <div className="player-note">{message}</div>}

      <audio ref={audioRef} onEnded={playNextFromQueue} />

      <div className="playlist">
        <h3>Songs</h3>
        {loading ? (
          <div className="song-empty">Loading songs...</div>
        ) : songs.length === 0 ? (
          <div className="song-empty">
            No songs found yet. Add sample tracks in the database to start listening.
          </div>
        ) : (
          <div className="song-list">
            {songs.map((song) => {
              const isLiked = likedSongIds.includes(song.id);

              return (
                <div
                  key={song.id}
                  className={`song-item ${currentSong?.id === song.id ? 'active' : ''}`}
                  onClick={() => playSong(song)}
                >
                  <div className="song-details">
                    <p className="title">{song.title}</p>
                    <p className="artist">{song.artist}</p>
                  </div>
                  <div className="song-actions">
                    <span className="duration">
                      {song.duration ? formatDuration(song.duration) : '0:00'}
                    </span>
                    <button type="button" className="song-action play" onClick={() => playSong(song)}>
                      Play
                    </button>
                    <button type="button" className="song-action queue" onClick={(event) => enqueueSong(song, event)}>
                      Queue
                    </button>
                    <button
                      type="button"
                      className={`song-action like ${isLiked ? 'liked' : ''}`}
                      onClick={(event) => likeSong(song, event)}
                    >
                      {isLiked ? '♥' : '♡'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {queue.length > 0 && (
        <div className="queue-panel">
          <h4>Up Next ({queue.length})</h4>
          <div className="queue-list">
            {queue.map((song, index) => (
              <div key={`${song.id}-${index}`} className="queue-item">
                <div>
                  <p>{song.title}</p>
                  <span>{song.artist}</span>
                </div>
                <button type="button" onClick={() => removeFromQueue(index)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentSong && (
        <div className="mini-player-bar">
          <div className="mini-song-meta">
            <strong>{currentSong.title}</strong>
            <span>{currentSong.artist}</span>
          </div>
          <div className="mini-player-actions">
            <button type="button" onClick={togglePlay}>
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button type="button" onClick={playNextFromQueue}>
              Next
            </button>
            <span>Queue {queue.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Player;
