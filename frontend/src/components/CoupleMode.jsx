import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Heart,
  Copy,
  Check,
  ArrowLeft,
  Music,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Plus,
  Trash2,
  Share2,
  LogOut,
  Search,
  Volume2,
  VolumeX,
  ListMusic,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react';
import useSocketRoom from '../hooks/useSocketRoom';
import apiClient from '../api/client';
import '../styles/CoupleMode.css';

const COUPLE_BG = '/room_backgrounds/starry_night_balcony.jpg';

function CoupleMode({ user, onPlayTrack, onQueueTrack }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [screen, setScreen] = useState('landing'); // 'landing' | 'active'
  const [copied, setCopied] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [userName] = useState(user?.name || 'Partner');
  const [errorMsg, setErrorMsg] = useState('');

  // Room state
  const [roomDetails, setRoomDetails] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [sharedPlaylist, setSharedPlaylist] = useState([]);

  // Search for adding songs
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const audioRef = useRef(null);
  const seekIgnoreRef = useRef(false);
  const searchTimeoutRef = useRef(null);

  const { socket, isConnected, socketId, joinRoom, emitEvent, subscribe } = useSocketRoom();

  // Auto-join from URL param
  useEffect(() => {
    const urlRoomId = searchParams.get('id');
    if (urlRoomId && isConnected && screen === 'landing') {
      setJoinCode(urlRoomId);
      handleJoin(urlRoomId);
    }
  }, [searchParams, isConnected]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const unsubs = [
      subscribe('room_created', (data) => {
        setRoomId(data.roomId);
        setRoomDetails(data);
        setScreen('active');
        setSearchParams({ id: data.roomId });
      }),
      subscribe('joined_room', (data) => {
        setRoomId(data.roomId);
        setScreen('active');
        setSearchParams({ id: data.roomId });
      }),
      subscribe('room_state', (data) => {
        setRoomDetails(data);
        if (data.currentSong) setCurrentSong(data.currentSong);
        if (typeof data.isPlaying === 'boolean') setIsPlaying(data.isPlaying);
        if (data.sharedPlaylist) setSharedPlaylist(data.sharedPlaylist);
      }),
      subscribe('play', (data) => {
        if (data.currentSong) setCurrentSong(data.currentSong);
        setIsPlaying(true);
        if (typeof data.currentTime === 'number') {
          setCurrentTime(data.currentTime);
          seekAudioTo(data.currentTime);
        }
      }),
      subscribe('pause', (data) => {
        setIsPlaying(false);
        if (typeof data.currentTime === 'number') {
          setCurrentTime(data.currentTime);
          seekAudioTo(data.currentTime);
        }
      }),
      subscribe('change_song', (data) => {
        if (data.currentSong) setCurrentSong(data.currentSong);
        setIsPlaying(data.isPlaying !== false);
        setCurrentTime(data.currentTime || 0);
        seekAudioTo(data.currentTime || 0);
      }),
      subscribe('seek', (data) => {
        if (typeof data.currentTime === 'number') {
          setCurrentTime(data.currentTime);
          seekAudioTo(data.currentTime);
        }
      }),
      subscribe('room_sync', (data) => {
        if (!data || data.roomId !== roomId) return;
        const audio = audioRef.current;
        if (!audio) return;
        const drift = Math.abs(audio.currentTime - (data.currentTime || 0));
        if (drift > 0.4) {
          seekIgnoreRef.current = true;
          try { audio.currentTime = data.currentTime || 0; } catch {}
        }
        if (typeof data.isPlaying === 'boolean') setIsPlaying(data.isPlaying);
      }),
      subscribe('couple_playlist_update', (data) => {
        if (data.sharedPlaylist) setSharedPlaylist(data.sharedPlaylist);
      }),
      subscribe('room_error', (data) => {
        setErrorMsg(data.message || 'Something went wrong');
      }),
    ];

    return () => unsubs.forEach((fn) => fn && fn());
  }, [socket, subscribe, roomId]);

  // Audio element control
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (!seekIgnoreRef.current) setCurrentTime(audio.currentTime || 0);
      seekIgnoreRef.current = false;
    };
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      // Auto-play next from shared playlist
      const idx = sharedPlaylist.findIndex((s) => String(s.id) === String(currentSong?.id));
      if (idx >= 0 && idx < sharedPlaylist.length - 1) {
        const next = sharedPlaylist[idx + 1];
        emitEvent('change_song', { roomId, currentSong: next, currentTime: 0, isPlaying: true });
      } else {
        setIsPlaying(false);
        emitEvent('pause', { roomId, currentTime: 0 });
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, [currentSong, sharedPlaylist, roomId, emitEvent]);

  // Play/pause audio control
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong?.downloadUrl) return;

    const src = Array.isArray(currentSong.downloadUrl)
      ? currentSong.downloadUrl.find((u) => u.quality === '320kbps')?.url ||
        currentSong.downloadUrl[currentSong.downloadUrl.length - 1]?.url
      : currentSong.downloadUrl;

    if (audio.src !== src && src) {
      audio.src = src;
      audio.load();
    }

    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [currentSong, isPlaying]);

  // Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Heartbeat sync
  useEffect(() => {
    if (!socket || !roomId || !isPlaying) return;
    const interval = setInterval(() => {
      const audio = audioRef.current;
      if (audio) {
        emitEvent('seek', { roomId, currentTime: audio.currentTime, isPlaying: true });
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [socket, roomId, isPlaying, emitEvent]);

  const seekAudioTo = (time) => {
    const audio = audioRef.current;
    if (!audio) return;
    seekIgnoreRef.current = true;
    try { audio.currentTime = Math.max(0, time); } catch {}
  };

  const handleCreate = () => {
    setErrorMsg('');
    emitEvent('create_couple_room', { userName });
  };

  const handleJoin = (code) => {
    setErrorMsg('');
    const clean = String(code || joinCode).trim().toUpperCase();
    if (!clean) {
      setErrorMsg('Please enter a room code');
      return;
    }
    joinRoom(clean, userName);
  };

  const handleCopy = () => {
    const url = `${window.location.origin}/couple?id=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    if (roomId && socket) emitEvent('leave_room', { roomId });
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.src = ''; }
    setRoomId('');
    setRoomDetails(null);
    setCurrentSong(null);
    setSharedPlaylist([]);
    setIsPlaying(false);
    setScreen('landing');
    setSearchParams({});
  };

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    if (isPlaying) {
      emitEvent('pause', { roomId, currentTime: audio.currentTime });
    } else {
      emitEvent('play', { roomId, currentSong, currentTime: audio.currentTime });
    }
  };

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    seekAudioTo(val);
    emitEvent('seek', { roomId, currentTime: val });
  };

  const handleNext = () => {
    const idx = sharedPlaylist.findIndex((s) => String(s.id) === String(currentSong?.id));
    if (idx >= 0 && idx < sharedPlaylist.length - 1) {
      const next = sharedPlaylist[idx + 1];
      emitEvent('change_song', { roomId, currentSong: next, currentTime: 0, isPlaying: true });
    }
  };

  const handlePrev = () => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      seekAudioTo(0);
      emitEvent('seek', { roomId, currentTime: 0 });
      return;
    }
    const idx = sharedPlaylist.findIndex((s) => String(s.id) === String(currentSong?.id));
    if (idx > 0) {
      const prev = sharedPlaylist[idx - 1];
      emitEvent('change_song', { roomId, currentSong: prev, currentTime: 0, isPlaying: true });
    }
  };

  const handlePlayFromPlaylist = (song) => {
    emitEvent('change_song', { roomId, currentSong: song, currentTime: 0, isPlaying: true });
  };

  const handleAddToPlaylist = (song) => {
    emitEvent('couple_playlist', { roomId, action: 'add', track: song });
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveFromPlaylist = (song) => {
    emitEvent('couple_playlist', { roomId, action: 'remove', track: song });
  };

  // Search songs API
  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await apiClient.get(`/api/music/search?q=${encodeURIComponent(q)}&limit=8`);
      const items = res.data?.results || res.data?.songs?.results || res.data || [];
      setSearchResults(Array.isArray(items) ? items.slice(0, 8) : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(searchTimeoutRef.current);
    if (searchQuery.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => doSearch(searchQuery), 350);
    } else {
      setSearchResults([]);
    }
    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchQuery, doSearch]);

  const formatTime = (t) => {
    if (!t || !Number.isFinite(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const members = roomDetails?.members || [];
  const partner1 = members[0] || null;
  const partner2 = members[1] || null;

  const songCover = currentSong?.image
    ? (Array.isArray(currentSong.image)
        ? (currentSong.image.find((i) => i.quality === '500x500')?.url || currentSong.image[currentSong.image.length - 1]?.url)
        : currentSong.image)
    : currentSong?.cover || currentSong?.thumbnail || null;

  /* ─────────────────── LANDING SCREEN ─────────────────── */
  if (screen === 'landing') {
    return (
      <div className="couple-landing" style={{ backgroundImage: `url(${COUPLE_BG})` }}>
        <div className="couple-landing__overlay" />
        <audio ref={audioRef} preload="auto" />

        <div className="couple-landing__content">
          <div className="couple-landing__icon">
            <Heart size={42} fill="currentColor" />
          </div>
          <h1 className="couple-landing__title">Couple Mode</h1>
          <p className="couple-landing__subtitle">
            A private listening room for just the two of you.<br />
            Share a playlist, sync music, and listen together in real time.
          </p>

          {errorMsg && <div className="couple-landing__error">{errorMsg}</div>}

          <div className="couple-landing__actions">
            <button className="couple-btn couple-btn--primary" onClick={handleCreate}>
              <Sparkles size={18} />
              <span>Create Private Room</span>
            </button>

            <div className="couple-landing__divider">
              <span>or join your partner</span>
            </div>

            <div className="couple-landing__join-row">
              <input
                className="couple-input"
                type="text"
                placeholder="Enter room code..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                maxLength={8}
              />
              <button className="couple-btn couple-btn--secondary" onClick={() => handleJoin()}>
                <UserPlus size={16} />
                <span>Join</span>
              </button>
            </div>
          </div>

          <button className="couple-landing__back" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
            <span>Back to Rooms</span>
          </button>
        </div>
      </div>
    );
  }

  /* ─────────────────── ACTIVE ROOM SCREEN ─────────────────── */
  return (
    <div className="couple-active" style={{ backgroundImage: songCover ? `url(${songCover})` : `url(${COUPLE_BG})` }}>
      <div className="couple-active__overlay" />
      <audio ref={audioRef} preload="auto" />

      {/* ── Top Bar ── */}
      <div className="couple-topbar">
        <button className="couple-topbar__back" onClick={handleLeave}>
          <LogOut size={16} />
          <span>Leave</span>
        </button>
        <div className="couple-topbar__center">
          <Heart size={14} fill="currentColor" className="couple-topbar__heart" />
          <span className="couple-topbar__code">{roomId}</span>
          <span className="couple-topbar__badge">Couple Mode</span>
        </div>
        <button className="couple-topbar__share" onClick={handleCopy}>
          {copied ? <Check size={14} color="#e2e8f0" /> : <Share2 size={14} />}
          <span>{copied ? 'Copied!' : 'Invite'}</span>
        </button>
      </div>

      {/* ── Partners Display ── */}
      <div className="couple-partners">
        <div className={`couple-partner ${partner1 ? 'couple-partner--connected' : ''}`}>
          <div className="couple-partner__avatar">
            {partner1 ? partner1.name.charAt(0).toUpperCase() : '?'}
          </div>
          <span className="couple-partner__name">{partner1?.name || 'Waiting...'}</span>
          {partner1 && <span className="couple-partner__status">● Connected</span>}
        </div>

        <div className="couple-partners__heart-link">
          <Heart size={28} fill={partner2 ? '#e11d48' : '#4b5563'} color={partner2 ? '#e11d48' : '#4b5563'} />
          <div className={`couple-partners__pulse-ring ${partner2 ? 'couple-partners__pulse-ring--active' : ''}`} />
        </div>

        <div className={`couple-partner ${partner2 ? 'couple-partner--connected' : ''}`}>
          <div className="couple-partner__avatar couple-partner__avatar--alt">
            {partner2 ? partner2.name.charAt(0).toUpperCase() : '?'}
          </div>
          <span className="couple-partner__name">{partner2?.name || 'Waiting...'}</span>
          {partner2 && <span className="couple-partner__status">● Connected</span>}
          {!partner2 && (
            <button className="couple-partner__invite" onClick={handleCopy}>
              <UserPlus size={12} />
              <span>Invite</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Now Playing ── */}
      <div className="couple-now-playing">
        {currentSong ? (
          <>
            <div className="couple-now-playing__cover-wrap">
              {songCover && <img src={songCover} alt="" className="couple-now-playing__cover" />}
              {!songCover && (
                <div className="couple-now-playing__cover-placeholder"><Music size={48} /></div>
              )}
              {isPlaying && <div className="couple-now-playing__visualizer">
                <span /><span /><span /><span /><span />
              </div>}
            </div>
            <div className="couple-now-playing__info">
              <h2 className="couple-now-playing__title">{currentSong.title || currentSong.name || 'Unknown'}</h2>
              <p className="couple-now-playing__artist">{currentSong.artist || currentSong.primaryArtists || '—'}</p>
            </div>
          </>
        ) : (
          <div className="couple-now-playing__empty">
            <Music size={36} />
            <p>No song playing yet</p>
            <span>Add songs to your shared playlist to start listening together</span>
          </div>
        )}
      </div>

      {/* ── Player Controls ── */}
      <div className="couple-controls">
        <div className="couple-controls__seek-row">
          <span className="couple-controls__time">{formatTime(currentTime)}</span>
          <input
            type="range"
            className="couple-controls__seek"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
          />
          <span className="couple-controls__time">{formatTime(duration)}</span>
        </div>

        <div className="couple-controls__buttons">
          <button className="couple-ctrl-btn" onClick={handlePrev} title="Previous">
            <SkipBack size={22} fill="currentColor" />
          </button>
          <button className="couple-ctrl-btn couple-ctrl-btn--play" onClick={handlePlayPause} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
          </button>
          <button className="couple-ctrl-btn" onClick={handleNext} title="Next">
            <SkipForward size={22} fill="currentColor" />
          </button>
        </div>

        <div className="couple-controls__volume-row">
          <button className="couple-vol-btn" onClick={() => setIsMuted((m) => !m)}>
            {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            className="couple-controls__volume"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
          />
        </div>
      </div>

      {/* ── Shared Playlist ── */}
      <div className="couple-playlist-section">
        <div className="couple-playlist__header">
          <ListMusic size={18} />
          <h3>Shared Playlist</h3>
          <span className="couple-playlist__count">{sharedPlaylist.length} songs</span>
          <button className="couple-playlist__add-btn" onClick={() => setShowSearch(true)}>
            <Plus size={14} />
            <span>Add Song</span>
          </button>
        </div>

        {sharedPlaylist.length === 0 && (
          <div className="couple-playlist__empty">
            <Music size={28} />
            <p>Your shared playlist is empty</p>
            <button onClick={() => setShowSearch(true)}>
              <Plus size={14} /> Add your first song
            </button>
          </div>
        )}

        <div className="couple-playlist__list">
          {sharedPlaylist.map((song, i) => {
            const cover = song.image
              ? (Array.isArray(song.image)
                  ? (song.image.find((img) => img.quality === '150x150')?.url || song.image[0]?.url)
                  : song.image)
              : song.cover || song.thumbnail || null;
            const isActive = currentSong && String(currentSong.id) === String(song.id);
            return (
              <div
                key={song.id || i}
                className={`couple-playlist__item ${isActive ? 'couple-playlist__item--active' : ''}`}
                onClick={() => handlePlayFromPlaylist(song)}
              >
                <span className="couple-playlist__item-num">{i + 1}</span>
                <div className="couple-playlist__item-cover">
                  {cover ? <img src={cover} alt="" /> : <Music size={16} />}
                </div>
                <div className="couple-playlist__item-info">
                  <span className="couple-playlist__item-title">{song.title || song.name}</span>
                  <span className="couple-playlist__item-artist">{song.artist || song.primaryArtists || '—'}</span>
                </div>
                {isActive && isPlaying && (
                  <div className="couple-playlist__item-bars"><span /><span /><span /></div>
                )}
                <button
                  className="couple-playlist__item-remove"
                  onClick={(e) => { e.stopPropagation(); handleRemoveFromPlaylist(song); }}
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Search Overlay ── */}
      {showSearch && (
        <div className="couple-search-overlay">
          <div className="couple-search-modal">
            <div className="couple-search__header">
              <Search size={18} />
              <input
                className="couple-search__input"
                type="text"
                placeholder="Search for a song..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button className="couple-search__close" onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}>
                <X size={18} />
              </button>
            </div>

            <div className="couple-search__results">
              {searchLoading && <div className="couple-search__loading">Searching...</div>}
              {!searchLoading && searchResults.length === 0 && searchQuery.length >= 2 && (
                <div className="couple-search__empty">No results found</div>
              )}
              {searchResults.map((song, i) => {
                const cover = song.image
                  ? (Array.isArray(song.image)
                      ? (song.image.find((img) => img.quality === '150x150')?.url || song.image[0]?.url)
                      : song.image)
                  : song.cover || song.thumbnail || null;
                const alreadyAdded = sharedPlaylist.some((s) => String(s.id) === String(song.id));
                return (
                  <div key={song.id || i} className="couple-search__result-item">
                    <div className="couple-search__result-cover">
                      {cover ? <img src={cover} alt="" /> : <Music size={16} />}
                    </div>
                    <div className="couple-search__result-info">
                      <span className="couple-search__result-title">{song.title || song.name}</span>
                      <span className="couple-search__result-artist">{song.artist || song.primaryArtists || '—'}</span>
                    </div>
                    <button
                      className={`couple-search__result-add ${alreadyAdded ? 'couple-search__result-add--added' : ''}`}
                      onClick={() => !alreadyAdded && handleAddToPlaylist(song)}
                      disabled={alreadyAdded}
                    >
                      {alreadyAdded ? <Check size={14} /> : <Plus size={14} />}
                      <span>{alreadyAdded ? 'Added' : 'Add'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CoupleMode;
