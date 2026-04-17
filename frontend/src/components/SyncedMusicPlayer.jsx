import React, { useEffect, useMemo, useRef, useState } from 'react';
import useSocketRoom from '../hooks/useSocketRoom';
import apiClient from '../api/client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const DEFAULT_TRACK = {
  id: 'default-track',
  title: 'Now Playing',
  artist: 'Unknown Artist',
  file_url: '',
};

function normalizeTrackUrl(trackUrl) {
  if (!trackUrl) {
    return '';
  }

  if (trackUrl.startsWith('http')) {
    return trackUrl;
  }

  return `${API_URL}${trackUrl}`;
}

function formatTime(seconds) {
  const safe = Number.isFinite(Number(seconds)) ? Math.max(0, Number(seconds)) : 0;
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function SyncedMusicPlayer({
  roomId,
  userName = 'Listener',
  track,
}) {
  const audioRef = useRef(null);
  const ignoreNextSeekEmitRef = useRef(false);

  const { socket, isConnected, joinRoom, emitEvent } = useSocketRoom();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [joinedRoomId, setJoinedRoomId] = useState('');
  const [status, setStatus] = useState('Connecting...');
  const [currentTrack, setCurrentTrack] = useState(track || DEFAULT_TRACK);

  const resolvedTrackUrl = useMemo(() => normalizeTrackUrl(currentTrack?.file_url), [currentTrack?.file_url]);

  useEffect(() => {
    setCurrentTrack(track || DEFAULT_TRACK);
  }, [track?.id, track?.title, track?.artist, track?.file_url]);

  useEffect(() => {
    const loadFallbackTrack = async () => {
      if (currentTrack?.file_url) {
        return;
      }

      try {
        const response = await apiClient.get('/api/music/songs?limit=1');
        const songs = Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
            ? response.data
            : [];
        const firstSong = songs[0] || null;
        if (firstSong?.id) {
          setCurrentTrack(firstSong);
          setStatus('Loaded song from catalog for sync.');
        }
      } catch (error) {
        setStatus('Could not load a playable song from catalog.');
      }
    };

    loadFallbackTrack();
  }, [currentTrack?.file_url]);

  useEffect(() => {
    if (!socket || !roomId) {
      return;
    }

    joinRoom(roomId, userName);
    emitEvent('request_room_state', { roomId });
  }, [socket, roomId, userName, joinRoom, emitEvent]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const syncRemotePlayback = async ({ shouldPlay, nextTime = 0 }) => {
      const audio = audioRef.current;
      if (!audio) {
        return;
      }

      const safeTime = Number.isFinite(Number(nextTime)) ? Math.max(0, Number(nextTime)) : 0;
      ignoreNextSeekEmitRef.current = true;

      try {
        audio.currentTime = safeTime;
      } catch (error) {
        // Ignore if metadata is not loaded yet.
      }

      setCurrentTime(safeTime);
      setIsPlaying(Boolean(shouldPlay));

      if (shouldPlay) {
        try {
          await audio.play();
        } catch (error) {
          setStatus('Playback was blocked by browser policy. Click Play.');
        }
      } else {
        audio.pause();
      }
    };

    const handleJoinedRoom = ({ roomId: nextRoomId }) => {
      setJoinedRoomId(nextRoomId || '');
      setStatus(`Joined room: ${nextRoomId}`);
    };

    const handleRoomState = ({ roomId: stateRoomId, currentSong, isPlaying: roomPlaying, currentTime: roomTime }) => {
      if (stateRoomId !== roomId) {
        return;
      }

      if (currentSong?.id) {
        setCurrentTrack(currentSong);
      }

      syncRemotePlayback({
        shouldPlay: Boolean(roomPlaying),
        nextTime: roomTime,
      });
    };

    const handlePlay = ({ currentSong, currentTime: roomTime }) => {
      if (currentSong?.id) {
        setCurrentTrack(currentSong);
      }
      syncRemotePlayback({ shouldPlay: true, nextTime: roomTime });
    };

    const handlePause = ({ currentSong, currentTime: roomTime }) => {
      if (currentSong?.id) {
        setCurrentTrack(currentSong);
      }
      syncRemotePlayback({ shouldPlay: false, nextTime: roomTime });
    };

    const handleSeekEvent = ({ currentSong, currentTime: roomTime, isPlaying: roomPlaying }) => {
      if (currentSong?.id) {
        setCurrentTrack(currentSong);
      }
      syncRemotePlayback({
        shouldPlay: typeof roomPlaying === 'boolean' ? roomPlaying : isPlaying,
        nextTime: roomTime,
      });
    };

    const handleChangeSong = ({ currentSong, currentTime: roomTime, isPlaying: roomPlaying }) => {
      if (currentSong?.id) {
        setCurrentTrack(currentSong);
      }

      syncRemotePlayback({
        shouldPlay: typeof roomPlaying === 'boolean' ? roomPlaying : true,
        nextTime: roomTime,
      });
      setStatus('Synced to room song change.');
    };

    const handleRoomSync = ({ roomId: syncRoomId, currentTime: roomTime, isPlaying: roomPlaying }) => {
      if (syncRoomId !== roomId) {
        return;
      }

      const audio = audioRef.current;
      if (!audio) {
        return;
      }

      const safeTime = Number.isFinite(Number(roomTime)) ? Math.max(0, Number(roomTime)) : 0;
      const drift = Math.abs(audio.currentTime - safeTime);

      if (drift > 0.35) {
        ignoreNextSeekEmitRef.current = true;
        try {
          audio.currentTime = safeTime;
        } catch (error) {
          // Ignore seek errors until metadata exists.
        }
      }

      if (typeof roomPlaying === 'boolean') {
        setIsPlaying(roomPlaying);
      }
      setCurrentTime(safeTime);
    };

    const handleRoomError = ({ message }) => {
      setStatus(message || 'Room error');
    };

    socket.on('joined_room', handleJoinedRoom);
    socket.on('room_state', handleRoomState);
    socket.on('play', handlePlay);
    socket.on('pause', handlePause);
    socket.on('seek', handleSeekEvent);
    socket.on('change_song', handleChangeSong);
    socket.on('room_sync', handleRoomSync);
    socket.on('room_error', handleRoomError);

    return () => {
      socket.off('joined_room', handleJoinedRoom);
      socket.off('room_state', handleRoomState);
      socket.off('play', handlePlay);
      socket.off('pause', handlePause);
      socket.off('seek', handleSeekEvent);
      socket.off('change_song', handleChangeSong);
      socket.off('room_sync', handleRoomSync);
      socket.off('room_error', handleRoomError);
    };
  }, [socket, roomId, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const tick = setInterval(() => {
      setCurrentTime(audio.currentTime || 0);
      setDuration(audio.duration || 0);
    }, 250);

    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!socket || !joinedRoomId || !isPlaying || !audioRef.current) {
      return;
    }

    const heartbeat = setInterval(() => {
      const audio = audioRef.current;
      if (!audio) {
        return;
      }

      emitEvent('seek', {
        roomId: joinedRoomId,
        currentTime: audio.currentTime,
        isPlaying: true,
      });
    }, 2500);

    return () => clearInterval(heartbeat);
  }, [socket, joinedRoomId, isPlaying, emitEvent]);

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || !joinedRoomId) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      emitEvent('pause', {
        roomId: joinedRoomId,
        currentSong: currentTrack,
        currentTime: audio.currentTime,
      });
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
      emitEvent('play', {
        roomId: joinedRoomId,
        currentSong: currentTrack,
        currentTime: audio.currentTime,
        isPlaying: true,
      });
    } catch (error) {
      setStatus('Click interaction required to start audio.');
    }
  };

  const handleSeek = (event) => {
    const audio = audioRef.current;
    if (!audio || !joinedRoomId) {
      return;
    }

    const nextTime = Number(event.target.value);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);

    if (ignoreNextSeekEmitRef.current) {
      ignoreNextSeekEmitRef.current = false;
      return;
    }

    emitEvent('seek', {
      roomId: joinedRoomId,
      currentSong: currentTrack,
      currentTime: nextTime,
      isPlaying,
    });
  };

  return (
    <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 10, maxWidth: 520 }}>
      <h3 style={{ marginTop: 0 }}>Synced Music Player</h3>

      <p style={{ margin: '8px 0' }}>
        Connection: <strong>{isConnected ? 'Connected' : 'Connecting'}</strong>
      </p>
      <p style={{ margin: '8px 0' }}>
        Room: <strong>{joinedRoomId || roomId || 'Not set'}</strong>
      </p>
      <p style={{ margin: '8px 0' }}>
        Track: <strong>{currentTrack?.title}</strong> {currentTrack?.artist ? `- ${currentTrack.artist}` : ''}
      </p>
      <p style={{ margin: '8px 0', color: '#555' }}>{status}</p>

      <audio
        ref={audioRef}
        src={resolvedTrackUrl}
        preload="metadata"
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      <button type="button" onClick={handlePlayPause} style={{ marginRight: 12 }}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>

      <span>{formatTime(currentTime)} / {formatTime(duration)}</span>

      <div style={{ marginTop: 12 }}>
        <input
          type="range"
          min={0}
          max={Math.max(duration, 0)}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          onChange={handleSeek}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}

export default SyncedMusicPlayer;
