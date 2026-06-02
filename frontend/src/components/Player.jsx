import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import useSocketRoom from '../hooks/useSocketRoom';
import '../styles/Player.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
let ytApiPromise = null;

const loadYouTubeApi = () => {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (ytApiPromise) {
    return ytApiPromise;
  }

  ytApiPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.body.appendChild(script);

    const previousHandler = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousHandler === 'function') {
        previousHandler();
      }
      resolve(window.YT);
    };
  });

  return ytApiPromise;
};

const normalizeSongList = (payload) => {
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return [];
};

const getVideoIdFromUrl = (value) => {
  const rawUrl = String(value || '').trim();
  if (!rawUrl) {
    return '';
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '').trim();
    }

    if (parsed.hostname.includes('youtube.com')) {
      return (parsed.searchParams.get('v') || '').trim();
    }
  } catch (error) {
    return '';
  }

  return '';
};

const resolveVideoId = (song) => {
  const explicitId = String(song?.videoId || '').trim();
  if (explicitId) {
    return explicitId;
  }

  const idAsVideo = song?.source === 'youtube' ? String(song?.id || '').trim() : '';
  if (idAsVideo) {
    return idAsVideo;
  }

  return getVideoIdFromUrl(song?.file_url);
};

const isYouTubeSong = (song) => Boolean(resolveVideoId(song));

function Player({ token, user, activeTrack, queuedTrack, onLikeUpdate }) {
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [likedSongIds, setLikedSongIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [queue, setQueue] = useState([]);
  const [roomInput, setRoomInput] = useState('');
  const [joinedRoomId, setJoinedRoomId] = useState('');
  const [roomMembers, setRoomMembers] = useState([]);
  const [hostSocketId, setHostSocketId] = useState('');
  const {
    socket,
    isConnected: socketReady,
    socketId,
    joinRoom: joinSocketRoom,
    emitEvent,
  } = useSocketRoom();

  const audioRef = useRef(null);
  const ytContainerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const joinedRoomIdRef = useRef('');
  const currentSongRef = useRef(null);
  const isPlayingRef = useRef(false);
  const hostSocketIdRef = useRef('');
  const currentTimeSyncRef = useRef(0);
  const pendingLoadedMetadataRef = useRef(null);

  useEffect(() => {
    joinedRoomIdRef.current = joinedRoomId;
  }, [joinedRoomId]);

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    hostSocketIdRef.current = hostSocketId;
  }, [hostSocketId]);

  useEffect(() => {
    currentTimeSyncRef.current = audioRef.current?.currentTime || 0;
  }, [currentSong, isPlaying]);

  useEffect(() => {
    return () => {
      if (ytPlayerRef.current?.destroy) {
        ytPlayerRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    fetchSongs();
    fetchLikedSongs();
  }, [token]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleDisconnect = () => {
      setHostSocketId('');
      setRoomMembers([]);
      setJoinedRoomId('');
    };

    const handleJoinedRoom = ({ roomId }) => {
      setJoinedRoomId(roomId);
      setRoomInput(roomId);
      setMessage(`Joined room ${roomId}`);
    };

    const handleRoomCreated = ({ roomId }) => {
      setJoinedRoomId(roomId);
      setRoomInput(roomId);
      setMessage(`Room created: ${roomId}`);
    };

    const handleRoomState = ({ roomId, members, hostSocketId: nextHostSocketId, currentTrack, currentSong, isPlaying: roomPlaying, currentTime, serverTime }) => {
      const syncedSong = currentSong || currentTrack;
      setRoomMembers(members || []);
      setHostSocketId(nextHostSocketId || '');

      if (syncedSong && roomId === joinedRoomIdRef.current) {
        syncRemotePlayback({
          type: roomPlaying ? 'play' : 'pause',
          currentSong: syncedSong,
          isPlaying: roomPlaying,
          currentTime,
          serverTime,
        });
      }
    };

    const handleRoomSync = ({ roomId, currentSong, isPlaying: roomPlaying, currentTime, serverTime }) => {
      if (roomId !== joinedRoomIdRef.current || !currentSong) {
        return;
      }

      syncRemotePlayback({
        type: roomPlaying ? 'play' : 'pause',
        currentSong,
        isPlaying: roomPlaying,
        currentTime,
        serverTime,
      });
    };

    const handlePlay = ({ currentSong, isPlaying: roomPlaying, currentTime, serverTime }) => {
      if (currentSong) {
        syncRemotePlayback({
          type: 'play',
          currentSong,
          isPlaying: typeof roomPlaying === 'boolean' ? roomPlaying : true,
          currentTime,
          serverTime,
        });
      }
    };

    const handlePause = ({ currentSong, currentTime, serverTime }) => {
      syncRemotePlayback({
        type: 'pause',
        currentSong: currentSong || currentSongRef.current,
        isPlaying: false,
        currentTime,
        serverTime,
      });
    };

    const handleChangeSong = ({ currentSong, isPlaying: roomPlaying, currentTime, serverTime }) => {
      if (currentSong) {
        syncRemotePlayback({
          type: 'change_song',
          currentSong,
          isPlaying: typeof roomPlaying === 'boolean' ? roomPlaying : true,
          currentTime,
          serverTime,
        });
      }
    };

    const handleSeek = ({ currentSong, isPlaying: roomPlaying, currentTime, serverTime }) => {
      syncRemotePlayback({
        type: 'seek',
        currentSong: currentSong || currentSongRef.current,
        isPlaying: typeof roomPlaying === 'boolean' ? roomPlaying : isPlayingRef.current,
        currentTime,
        serverTime,
      });
    };

    const handlePlaybackUpdate = ({ action, song, currentSong, currentTime, isPlaying: roomPlaying, serverTime }) => {
      const syncedSong = currentSong || song;

      if (!syncedSong) {
        return;
      }

      syncRemotePlayback({
        type: action || 'play',
        currentSong: syncedSong,
        isPlaying: typeof roomPlaying === 'boolean' ? roomPlaying : action !== 'pause',
        currentTime,
        serverTime,
      });
    };

    const handleRoomError = ({ message: roomErrorMessage }) => {
      setMessage(roomErrorMessage || 'Room error');
    };

    socket.on('disconnect', handleDisconnect);
    socket.on('joined_room', handleJoinedRoom);
    socket.on('room_created', handleRoomCreated);
    socket.on('room_state', handleRoomState);
    socket.on('room_sync', handleRoomSync);
    socket.on('play', handlePlay);
    socket.on('pause', handlePause);
    socket.on('change_song', handleChangeSong);
    socket.on('seek', handleSeek);
    socket.on('playback_update', handlePlaybackUpdate);
    socket.on('room_error', handleRoomError);

    return () => {
      socket.off('disconnect', handleDisconnect);
      socket.off('joined_room', handleJoinedRoom);
      socket.off('room_created', handleRoomCreated);
      socket.off('room_state', handleRoomState);
      socket.off('room_sync', handleRoomSync);
      socket.off('play', handlePlay);
      socket.off('pause', handlePause);
      socket.off('change_song', handleChangeSong);
      socket.off('seek', handleSeek);
      socket.off('playback_update', handlePlaybackUpdate);
      socket.off('room_error', handleRoomError);
    };
  }, [socket]);

  useEffect(() => {
    const shouldEmitHeartbeat = joinedRoomId && socket && isPlaying && currentSong && socketId && socketId === hostSocketId;

    if (!shouldEmitHeartbeat) {
      if (pendingLoadedMetadataRef.current) {
        clearInterval(pendingLoadedMetadataRef.current);
        pendingLoadedMetadataRef.current = null;
      }
      return;
    }

    pendingLoadedMetadataRef.current = setInterval(() => {
      if (!socket) {
        return;
      }

      socket.emit('seek', {
        roomId: joinedRoomId,
        currentTime: getCurrentPlaybackTime(),
      });
    }, 2500);

    return () => {
      if (pendingLoadedMetadataRef.current) {
        clearInterval(pendingLoadedMetadataRef.current);
        pendingLoadedMetadataRef.current = null;
      }
    };
  }, [joinedRoomId, isPlaying, currentSong, socketId, hostSocketId, socket]);

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
    const catalogEndpoints = ['/api/music/songs', '/api/music/trending'];

    try {
      setLoading(true);
      let nextSongs = [];

      for (const endpoint of catalogEndpoints) {
        try {
          const response = await axios.get(`${API_URL}${endpoint}`);
          nextSongs = normalizeSongList(response.data);
          if (nextSongs.length > 0) {
            break;
          }
        } catch (requestError) {
          // Try next endpoint.
        }
      }

      setSongs(nextSongs);
    } catch (error) {
      console.error('Error fetching songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLikedSongs = async () => {
    if (!token) return;

    try {
      const response = await axios.get(`${API_URL}/api/music/liked`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const likedSongs = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];
      setLikedSongIds(likedSongs.map((song) => song.id));
    } catch (error) {
      console.error('Error fetching liked songs:', error);
    }
  };

  const setAudioSourceAndTime = (song, startTime = 0) => {
    const audio = audioRef.current;
    if (!audio || !song?.file_url) {
      return;
    }

    const normalizedUrl = song.file_url.startsWith('http')
      ? song.file_url
      : `${API_URL}${song.file_url}`;

    const safeTime = Number.isFinite(Number(startTime)) && Number(startTime) >= 0 ? Number(startTime) : 0;

    audio.src = normalizedUrl;
    const applyTime = () => {
      try {
        audio.currentTime = safeTime;
      } catch (error) {
        // Ignore seek failures until metadata is ready.
      }
    };

    if (audio.readyState >= 1) {
      applyTime();
      return;
    }

    audio.onloadedmetadata = () => {
      applyTime();
      audio.onloadedmetadata = null;
    };
  };

  const getCurrentPlaybackTime = () => {
    if (isYouTubeSong(currentSongRef.current) && ytPlayerRef.current?.getCurrentTime) {
      return Number(ytPlayerRef.current.getCurrentTime() || 0);
    }

    return Number(audioRef.current?.currentTime || 0);
  };

  const setYouTubeSourceAndTime = async (song, startTime = 0, shouldPlay = true) => {
    const videoId = resolveVideoId(song);
    if (!videoId || !ytContainerRef.current) {
      return false;
    }

    const safeTime = Number.isFinite(Number(startTime)) && Number(startTime) >= 0 ? Number(startTime) : 0;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const YT = await loadYouTubeApi();

    if (!ytPlayerRef.current) {
      ytPlayerRef.current = new YT.Player(ytContainerRef.current, {
        host: 'https://www.youtube.com',
        width: '1',
        height: '1',
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onStateChange: (event) => {
            const state = event?.data;

            if (state === YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.BUFFERING) {
              setIsPlaying(false);
            } else if (state === YT.PlayerState.ENDED) {
              setIsPlaying(false);
              playNextFromQueue();
            }
          },
        },
      });
    }

    if (shouldPlay) {
      ytPlayerRef.current.loadVideoById({
        videoId,
        startSeconds: safeTime,
      });
      ytPlayerRef.current.playVideo?.();
      return true;
    }

    ytPlayerRef.current.cueVideoById({
      videoId,
      startSeconds: safeTime,
    });
    return true;
  };

  const setMediaSourceAndTime = async (song, startTime = 0, shouldPlay = true) => {
    if (isYouTubeSong(song)) {
      return setYouTubeSourceAndTime(song, startTime, shouldPlay);
    }

    if (ytPlayerRef.current?.stopVideo) {
      ytPlayerRef.current.stopVideo();
    }

    setAudioSourceAndTime(song, startTime);

    if (shouldPlay && audioRef.current) {
      await audioRef.current.play();
    }

    return true;
  };

  const syncRemotePlayback = ({ type, currentSong, isPlaying: nextPlaying, currentTime = 0, serverTime }) => {
    if (!currentSong) {
      return;
    }

    const isDifferentSong = currentSongRef.current?.id !== currentSong.id;
    const networkAdjustedTime = Number(currentTime) + (serverTime ? (Date.now() - serverTime) / 1000 : 0);
    const safeTime = Number.isFinite(networkAdjustedTime) && networkAdjustedTime >= 0 ? networkAdjustedTime : 0;

    if (isDifferentSong) {
      setCurrentSong(currentSong);
      setMediaSourceAndTime(currentSong, safeTime, Boolean(nextPlaying)).catch(() => {
        setMessage(`Unable to sync ${currentSong.title}.`);
      });
    } else {
      const drift = Math.abs(getCurrentPlaybackTime() - safeTime);
      if (drift > 0.35 || type === 'seek' || type === 'change_song') {
        if (isYouTubeSong(currentSongRef.current) && ytPlayerRef.current?.seekTo) {
          ytPlayerRef.current.seekTo(safeTime, true);
        } else if (audioRef.current) {
          try {
            audioRef.current.currentTime = safeTime;
          } catch (error) {
            // Wait for metadata if needed.
          }
        }
      }
    }

    setIsPlaying(Boolean(nextPlaying));

    if (isDifferentSong) {
      return;
    }

    if (nextPlaying) {
      if (isYouTubeSong(currentSongRef.current) && ytPlayerRef.current?.playVideo) {
        ytPlayerRef.current.playVideo();
      } else {
        audioRef.current?.play().catch(() => {
          setMessage(`Unable to sync ${currentSong.title}.`);
        });
      }
    } else {
      if (isYouTubeSong(currentSongRef.current) && ytPlayerRef.current?.pauseVideo) {
        ytPlayerRef.current.pauseVideo();
      } else {
        audioRef.current?.pause();
      }
    }
  };

  const playSong = (song, options = {}) => {
    const { broadcast = true, startTime = 0 } = options;

    if (!song.file_url && !isYouTubeSong(song)) {
      setMessage(`No playable source configured for ${song.title}`);
      return;
    }

    setCurrentSong(song);
    setIsPlaying(true);
    setMessage('');
    setMediaSourceAndTime(song, startTime, true).catch(() => {
      setMessage(`Unable to play ${song.title}.`);
    });

    if (broadcast && joinedRoomId && socket) {
      emitEvent('change_song', {
        roomId: joinedRoomId,
        currentSong: song,
        currentTime: startTime,
        isPlaying: true,
      });
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
      pausePlayback(true);
      return;
    }

    const [nextSong, ...remainingQueue] = queue;
    setQueue(remainingQueue);
    playSong(nextSong, { broadcast: true, startTime: 0 });
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
        `${API_URL}/api/music/like`,
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

  const pausePlayback = (broadcast = true) => {
    setIsPlaying(false);
    if (isYouTubeSong(currentSongRef.current) && ytPlayerRef.current?.pauseVideo) {
      ytPlayerRef.current.pauseVideo();
    } else if (audioRef.current) {
      audioRef.current.pause();
    }

    if (broadcast && joinedRoomId && socket) {
      emitEvent('pause', {
        roomId: joinedRoomId,
        currentSong,
        currentTime: getCurrentPlaybackTime(),
      });
    }
  };

  const resumePlayback = async () => {
    if (!currentSong) {
      return;
    }

    try {
      if (isYouTubeSong(currentSong)) {
        ytPlayerRef.current?.playVideo?.();
      } else {
        await audioRef.current?.play();
      }

      setIsPlaying(true);
      if (joinedRoomId && socket) {
        emitEvent('play', {
          roomId: joinedRoomId,
          currentSong,
          currentTime: getCurrentPlaybackTime(),
        });
      }
    } catch (error) {
      setMessage('Unable to resume playback.');
    }
  };

  const togglePlay = () => {
    if (!currentSong) {
      return;
    }

    if (isPlaying) {
      pausePlayback(true);
      return;
    }

    resumePlayback();
  };

  const joinRoom = () => {
    const roomId = roomInput.trim();

    if (!roomId) {
      setMessage('Enter a room id to join.');
      return;
    }

    if (!socket) {
      setMessage('Socket connection not ready yet.');
      return;
    }

    joinSocketRoom(roomId, user?.name || 'Listener');
    emitEvent('request_room_state', { roomId });
  };

  const createRoom = () => {
    if (!socket) {
      setMessage('Socket connection not ready yet.');
      return;
    }

    emitEvent('create_room', {
      userName: user?.name || 'Host',
    });
  };

  const handleAudioSeeked = () => {
    if (!joinedRoomId || !socket || !currentSong || !isPlaying || socketId !== hostSocketId) {
      return;
    }

    emitEvent('seek', {
      roomId: joinedRoomId,
      currentTime: getCurrentPlaybackTime(),
    });
  };

  const leaveRoom = () => {
    if (!joinedRoomId || !socket) {
      return;
    }

    emitEvent('leave_room', { roomId: joinedRoomId });
    setMessage(`Left room ${joinedRoomId}`);
    setJoinedRoomId('');
    setRoomInput('');
    setRoomMembers([]);
    setHostSocketId('');
  };

  const copyRoomId = async () => {
    if (!joinedRoomId) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(joinedRoomId);
      } else {
        const tempInput = document.createElement('input');
        tempInput.value = joinedRoomId;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }

      setMessage(`Room ID copied: ${joinedRoomId}`);
    } catch (error) {
      setMessage('Could not copy room ID. Please copy it manually.');
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

      <div className="room-panel">
        <div className="room-status-row">
          <span className={`socket-dot ${socketReady ? 'online' : 'offline'}`} />
          <p>{socketReady ? 'Realtime connected' : 'Realtime connecting...'}</p>
        </div>

        <div className="room-controls">
          <input
            type="text"
            placeholder="Room id (example: chill-zone)"
            value={roomInput}
            onChange={(event) => setRoomInput(event.target.value)}
            disabled={Boolean(joinedRoomId)}
          />
          {!joinedRoomId ? (
            <>
              <button type="button" onClick={joinRoom}>
                Join room
              </button>
              <button type="button" className="create-room" onClick={createRoom}>
                Create room
              </button>
            </>
          ) : (
            <button type="button" className="leave-room" onClick={leaveRoom}>
              Leave room
            </button>
          )}
        </div>

        {joinedRoomId && (
          <div className="room-meta">
            <p>
              Room: <strong>{joinedRoomId}</strong>
            </p>
            <button type="button" className="copy-room" onClick={copyRoomId}>
              Copy room ID
            </button>
            <p>
              You are {socketId && socketId === hostSocketId ? 'the host' : 'a listener'}
            </p>
            <p>Members: {roomMembers.length}</p>
          </div>
        )}
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

      <div ref={ytContainerRef} style={{ width: 1, height: 1, position: 'absolute', left: -9999, top: -9999 }} />

      <audio ref={audioRef} onEnded={playNextFromQueue} onSeeked={handleAudioSeeked} />

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
