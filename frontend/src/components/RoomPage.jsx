import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Users,
  Radio,
  Copy,
  Check,
  PlusCircle,
  LogOut,
  ArrowLeft,
  Globe,
  Lock,
  UserCheck,
  Link as LinkIcon,
  Music,
  Settings,
  Info,
  Sparkles,
  Headphones,
  Heart
} from 'lucide-react';
import useSocketRoom from '../hooks/useSocketRoom';
import SyncedMusicPlayer from './SyncedMusicPlayer';
import apiClient from '../api/client';
import '../styles/RoomPage.css';

// High-quality background artworks extracted from user mockups
const BACKGROUND_IMAGES = {
  hero: '/room_backgrounds/city_rooftop.jpg',
  createRoom: '/room_backgrounds/night_forest.jpg',
  joinRoom: '/room_backgrounds/cozy_lounge.jpg',
  sunsetBeach: '/room_backgrounds/sunset_beach.jpg',
  modernStudio: '/room_backgrounds/modern_studio.jpg',
  starryBalcony: '/room_backgrounds/starry_night_balcony.jpg',
};

const RECENTLY_JOINED = [
  { id: 'CHILL1', name: 'Chill Vibes', time: 'Joined 2h ago', count: 3, avatars: ['🎧', '🎵', '🎹'] },
  { id: 'LOFI02', name: 'Lo-Fi Lounge', time: 'Joined yesterday', count: 2, avatars: ['🎷', '🎸'] },
  { id: 'RETRO3', name: 'Retro Beats', time: 'Joined 3d ago', count: 5, avatars: ['🥁', '🎻', '🎺', '🎤', '🎶'] },
];

function RoomPage({ user }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [screen, setScreen] = useState('main'); // 'main' | 'create' | 'join' | 'active'

  // Room creation state
  const [roomName, setRoomName] = useState('Weekend Vibes');
  const [roomDesc, setRoomDesc] = useState('Good music, good people, great vibes! ✨');
  const [privacy, setPrivacy] = useState('public'); // 'public' | 'friends' | 'private'
  const [allowGuestAdd, setAllowGuestAdd] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState(BACKGROUND_IMAGES.createRoom);

  // Join Room state
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [inviteUrlInput, setInviteUrlInput] = useState('');

  // Active room state
  const [activeRoomId, setActiveRoomId] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [roomDetails, setRoomDetails] = useState(null);

  const pinRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];
  const { socket, joinRoom, emitEvent } = useSocketRoom();
  const userName = user?.name || 'Prajwal';

  // Listen to query params for direct links e.g. /room?id=ABC123 or /room?action=create
  useEffect(() => {
    const directId = searchParams.get('id');
    const action = searchParams.get('action');

    if (directId) {
      setActiveRoomId(directId.toUpperCase());
      setScreen('active');
    } else if (action === 'create') {
      setScreen('create');
    } else if (action === 'join') {
      setScreen('join');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!socket) return;

    const handleRoomState = (state) => {
      if (state) {
        setRoomDetails(state);
        setActiveRoomId(state.roomId);
        setScreen('active');
        setErrorMsg('');
      }
    };

    const handleJoinedRoom = ({ roomId }) => {
      setActiveRoomId(roomId);
      setScreen('active');
      setErrorMsg('');
      emitEvent('request_room_state', { roomId });
    };

    const handleRoomError = ({ message }) => {
      setErrorMsg(message || 'Failed to connect to room');
    };

    socket.on('room_state', handleRoomState);
    socket.on('joined_room', handleJoinedRoom);
    socket.on('room_error', handleRoomError);

    return () => {
      socket.off('room_state', handleRoomState);
      socket.off('joined_room', handleJoinedRoom);
      socket.off('room_error', handleRoomError);
    };
  }, [socket, emitEvent]);

  // Handler for creating room
  const handleExecuteCreateRoom = async () => {
    try {
      setErrorMsg('');
      const response = await apiClient.post('/api/rooms/create', {
        userName,
        roomName: roomName.trim() || 'Weekend Vibes',
        description: roomDesc.trim(),
        privacy,
        allowGuestAdd,
      });

      const newRoom = response.data?.room;
      if (newRoom?.roomId) {
        setActiveRoomId(newRoom.roomId);
        joinRoom(newRoom.roomId, userName);
        setScreen('active');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to create room');
    }
  };

  // OTP Pin box handlers for Join screen
  const handlePinChange = (index, value) => {
    const digit = value.slice(-1).toUpperCase();
    const nextPin = [...pinDigits];
    nextPin[index] = digit;
    setPinDigits(nextPin);

    // Auto-focus next box
    if (digit && index < 5) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const handlePinPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!pasteData) return;

    const chars = pasteData.slice(0, 6).split('');
    const nextPin = ['', '', '', '', '', ''];
    chars.forEach((ch, idx) => {
      nextPin[idx] = ch;
    });
    setPinDigits(nextPin);

    const focusIdx = Math.min(chars.length, 5);
    pinRefs[focusIdx].current?.focus();
  };

  const handleJoinByPin = () => {
    const code = pinDigits.join('');
    if (code.length < 6) {
      setErrorMsg('Please enter a full 6-digit room code');
      return;
    }

    setErrorMsg('');
    joinRoom(code, userName);
    setActiveRoomId(code);
    setScreen('active');
  };

  const handleJoinByUrl = () => {
    if (!inviteUrlInput.trim()) return;

    let code = inviteUrlInput.trim();
    if (code.includes('/room/')) {
      code = code.split('/room/').pop();
    } else if (code.includes('id=')) {
      code = code.split('id=').pop().split('&')[0];
    }

    const cleanCode = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Invalid room link');
      return;
    }

    setErrorMsg('');
    joinRoom(cleanCode, userName);
    setActiveRoomId(cleanCode);
    setScreen('active');
  };

  const handleJoinRecent = (roomId) => {
    setErrorMsg('');
    joinRoom(roomId, userName);
    setActiveRoomId(roomId);
    setScreen('active');
  };

  const handleCopyRoomId = () => {
    if (!activeRoomId) return;
    const url = `${window.location.origin}/room?id=${activeRoomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveRoom = () => {
    if (activeRoomId && socket) {
      emitEvent('leave_room', { roomId: activeRoomId });
    }
    setActiveRoomId('');
    setRoomDetails(null);
    setScreen('main');
    setSearchParams({});
  };

  return (
    <div className="melodio-room-container">
      {errorMsg && <div className="room-page__error-banner">{errorMsg}</div>}

      {/* ─── SCREEN 1: MAIN DASHBOARD ─── */}
      {screen === 'main' && (
        <div className="room-main-view">
          <header className="room-main-header">
            <div>
              <h1 className="room-main-title">Rooms</h1>
              <p className="room-main-subtitle">Listen together. From anywhere.</p>
            </div>
          </header>

          {/* Hero Banner Card */}
          <div className="room-hero-card" style={{ backgroundImage: `url(${BACKGROUND_IMAGES.hero})` }}>
            <div className="room-hero-card__overlay" />
            <div className="room-hero-card__content">
              <div className="room-hero-orb">
                <Music size={28} color="#00f2fe" />
              </div>
              <h2>Better music. Better together.</h2>
              <p>Create a room or join your friend's room and start listening in real time.</p>

              <div className="room-hero-actions">
                <button
                  type="button"
                  className="room-gradient-btn room-gradient-btn--emerald"
                  onClick={() => setScreen('create')}
                >
                  <PlusCircle size={18} />
                  <span>Create Room</span>
                </button>

                <button
                  type="button"
                  className="room-outline-btn"
                  onClick={() => setScreen('join')}
                >
                  <LogOut size={18} style={{ transform: 'rotate(180deg)' }} />
                  <span>Join Room</span>
                </button>
              </div>
            </div>
          </div>

          {/* How it works section */}
          <div className="room-how-it-works">
            <h3>How it works?</h3>
            <div className="room-steps-list">
              <div className="room-step-item">
                <div className="room-step-icon room-step-icon--cyan">
                  <Users size={20} />
                </div>
                <div className="room-step-text">
                  <strong>Create or Join</strong>
                  <span>Start a room or join with a code</span>
                </div>
              </div>

              <div className="room-step-item">
                <div className="room-step-icon room-step-icon--purple">
                  <LinkIcon size={20} />
                </div>
                <div className="room-step-text">
                  <strong>Invite Friends</strong>
                  <span>Share the code or link with your friends</span>
                </div>
              </div>

              <div className="room-step-item">
                <div className="room-step-icon room-step-icon--amber">
                  <Music size={20} />
                </div>
                <div className="room-step-text">
                  <strong>Listen Together</strong>
                  <span>Add songs to the queue and vibe in sync</span>
                </div>
              </div>
            </div>
          </div>

          {/* Couple Mode Promo Card */}
          <div className="room-couple-promo" style={{ backgroundImage: `url(${BACKGROUND_IMAGES.starryBalcony})` }}>
            <div className="room-couple-promo__overlay" />
            <div className="room-couple-promo__content">
              <div className="room-couple-promo__icon">
                <Heart size={24} fill="currentColor" />
              </div>
              <div className="room-couple-promo__text">
                <h3>Couple Mode</h3>
                <p>A private room for just the two of you. Share a playlist and listen together in sync.</p>
              </div>
              <button
                type="button"
                className="room-couple-promo__btn"
                onClick={() => navigate('/couple')}
              >
                <Heart size={14} fill="currentColor" />
                <span>Try Couple Mode</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SCREEN 2: CREATE ROOM ─── */}
      {screen === 'create' && (
        <div className="room-form-screen">
          <button type="button" className="room-back-btn" onClick={() => setScreen('main')}>
            <ArrowLeft size={20} />
          </button>

          <div className="room-form-header">
            <h2>Create Room</h2>
          </div>

          <div className="room-create-banner" style={{ backgroundImage: `url(${selectedTheme || BACKGROUND_IMAGES.createRoom})` }}>
            <div className="room-create-banner-overlay" />
            <div className="room-create-neon-orb">
              <Music size={36} color="#00f2fe" />
            </div>
          </div>

          <div className="room-theme-picker">
            <span className="room-theme-picker-label">Room Mood Theme</span>
            <div className="room-theme-thumbnails">
              {[
                { name: 'City Rooftop', img: BACKGROUND_IMAGES.hero },
                { name: 'Cozy Lounge', img: BACKGROUND_IMAGES.joinRoom },
                { name: 'Sunset Beach', img: BACKGROUND_IMAGES.sunsetBeach },
                { name: 'Night Forest', img: BACKGROUND_IMAGES.createRoom },
                { name: 'Modern Studio', img: BACKGROUND_IMAGES.modernStudio },
                { name: 'Starry Balcony', img: BACKGROUND_IMAGES.starryBalcony },
              ].map((theme) => (
                <button
                  key={theme.name}
                  type="button"
                  className={`room-theme-thumb ${(selectedTheme || BACKGROUND_IMAGES.createRoom) === theme.img ? 'active' : ''}`}
                  onClick={() => setSelectedTheme(theme.img)}
                  title={theme.name}
                >
                  <img src={theme.img} alt={theme.name} />
                </button>
              ))}
            </div>
          </div>

          <div className="room-form-group">
            <div className="room-label-row">
              <label>Room Name</label>
              <span className="room-char-counter">{roomName.length}/30</span>
            </div>
            <input
              type="text"
              className="room-styled-input"
              value={roomName}
              maxLength={30}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. Weekend Vibes"
            />
          </div>

          <div className="room-form-group">
            <div className="room-label-row">
              <label>Room Description (optional)</label>
              <span className="room-char-counter">{roomDesc.length}/100</span>
            </div>
            <textarea
              className="room-styled-textarea"
              value={roomDesc}
              maxLength={100}
              rows={3}
              onChange={(e) => setRoomDesc(e.target.value)}
              placeholder="Good music, good people, great vibes! ✨"
            />
          </div>

          <div className="room-form-group">
            <label className="room-section-label">Privacy</label>
            <div className="room-privacy-options">
              <div
                className={`room-privacy-card ${privacy === 'public' ? 'active' : ''}`}
                onClick={() => setPrivacy('public')}
              >
                <Globe size={18} />
                <div className="room-privacy-text">
                  <strong>Public</strong>
                  <span>Anyone can join</span>
                </div>
                <div className="room-radio-check">{privacy === 'public' && <Check size={14} />}</div>
              </div>

              <div
                className={`room-privacy-card ${privacy === 'friends' ? 'active' : ''}`}
                onClick={() => setPrivacy('friends')}
              >
                <UserCheck size={18} />
                <div className="room-privacy-text">
                  <strong>Friends Only</strong>
                  <span>Only invited friends can join</span>
                </div>
                <div className="room-radio-check">{privacy === 'friends' && <Check size={14} />}</div>
              </div>

              <div
                className={`room-privacy-card ${privacy === 'private' ? 'active' : ''}`}
                onClick={() => setPrivacy('private')}
              >
                <Lock size={18} />
                <div className="room-privacy-text">
                  <strong>Private</strong>
                  <span>Only with room code</span>
                </div>
                <div className="room-radio-check">{privacy === 'private' && <Check size={14} />}</div>
              </div>
            </div>
          </div>

          <div className="room-toggle-row">
            <div className="room-toggle-label">
              <strong>Allow Guests to Add Songs <Info size={14} className="room-info-icon" /></strong>
              <span>Room members can add songs to the queue</span>
            </div>
            <label className="room-switch">
              <input
                type="checkbox"
                checked={allowGuestAdd}
                onChange={(e) => setAllowGuestAdd(e.target.checked)}
              />
              <span className="room-slider" />
            </label>
          </div>

          <button
            type="button"
            className="room-gradient-btn room-gradient-btn--emerald room-btn-full"
            onClick={handleExecuteCreateRoom}
          >
            Create Room
          </button>

          <button
            type="button"
            className="room-secondary-outline-btn room-btn-full"
          >
            <Settings size={16} />
            <span>Customize Room</span>
          </button>
        </div>
      )}

      {/* ─── SCREEN 3: JOIN ROOM ─── */}
      {screen === 'join' && (
        <div className="room-form-screen">
          <button type="button" className="room-back-btn" onClick={() => setScreen('main')}>
            <ArrowLeft size={20} />
          </button>

          <div className="room-form-header">
            <h2>Join Room</h2>
          </div>

          <div className="room-join-banner" style={{ backgroundImage: `url(${BACKGROUND_IMAGES.joinRoom})` }}>
            <div className="room-join-banner-overlay" />
            <div className="room-join-neon-orb">
              <Music size={36} color="#d8b4fe" />
            </div>
          </div>

          {/* Code PIN section */}
          <div className="room-section-box">
            <h3>Join with Room Code</h3>
            <p className="room-box-sub">Enter the 6-digit room code</p>

            <div className="room-pin-inputs" onPaste={handlePinPaste}>
              {pinDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={pinRefs[idx]}
                  type="text"
                  maxLength={1}
                  value={digit}
                  className="room-pin-box"
                  onChange={(e) => handlePinChange(idx, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(idx, e)}
                />
              ))}
            </div>

            <button
              type="button"
              className="room-gradient-btn room-gradient-btn--purple room-btn-full"
              onClick={handleJoinByPin}
            >
              Join Room
            </button>
          </div>

          <div className="room-divider">
            <span>OR</span>
          </div>

          {/* Join with Link section */}
          <div className="room-section-box">
            <h3>Join with Link</h3>
            <p className="room-box-sub">Paste the invite link from your friend</p>

            <div className="room-input-with-icon">
              <input
                type="text"
                placeholder="https://melodio.app/room/abc123"
                value={inviteUrlInput}
                onChange={(e) => setInviteUrlInput(e.target.value)}
              />
              <button type="button" onClick={() => navigator.clipboard.readText().then(t => setInviteUrlInput(t))}>
                <Copy size={16} />
              </button>
            </div>

            <button
              type="button"
              className="room-purple-outline-btn room-btn-full"
              onClick={handleJoinByUrl}
            >
              <LinkIcon size={16} />
              <span>Join via Link</span>
            </button>
          </div>

          {/* Recently Joined List */}
          <div className="room-recently-joined">
            <h3>Recently Joined</h3>
            <div className="room-recent-list">
              {RECENTLY_JOINED.map((item) => (
                <div
                  key={item.id}
                  className="room-recent-card"
                  onClick={() => handleJoinRecent(item.id)}
                >
                  <div className="room-recent-icon">
                    <Headphones size={20} color="#c084fc" />
                  </div>
                  <div className="room-recent-info">
                    <strong>{item.name}</strong>
                    <span>{item.time}</span>
                  </div>
                  <div className="room-avatar-stack">
                    {item.avatars.map((av, i) => (
                      <span key={i} className="room-avatar-pill">{av}</span>
                    ))}
                    <span className="room-avatar-more">+{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── SCREEN 4: ACTIVE ROOM PLAYER ─── */}
      {screen === 'active' && activeRoomId && (
        <div className="room-active-screen">
          <div className="room-active-topbar">
            <div className="room-active-title-group">
              <button type="button" className="room-back-btn" onClick={() => setScreen('main')}>
                <ArrowLeft size={18} />
              </button>
              <div className="room-live-badge">
                <span className="room-pulse-dot" />
                <span>LIVE ROOM</span>
              </div>
              <span className="room-active-code-tag">{activeRoomId}</span>
            </div>

            <div className="room-topbar-actions">
              <button
                type="button"
                className="room-share-link-btn"
                onClick={handleCopyRoomId}
              >
                {copied ? <Check size={16} color="#e2e8f0" /> : <Copy size={16} />}
                <span>{copied ? 'Link Copied!' : 'Share Room'}</span>
              </button>

              <button
                type="button"
                className="room-btn-leave"
                onClick={handleLeaveRoom}
              >
                <LogOut size={16} />
                <span>Leave</span>
              </button>
            </div>
          </div>

          <div className="room-active-body">
            <SyncedMusicPlayer roomId={activeRoomId} userName={userName} />

            {roomDetails?.members && (
              <div className="room-members-panel">
                <h3>
                  <Users size={18} />
                  <span>Room Members ({roomDetails.members.length})</span>
                </h3>
                <div className="room-members-chips">
                  {roomDetails.members.map((m) => (
                    <div key={m.socketId} className="room-member-tag">
                      <span className="room-member-avatar-circle">{m.name.charAt(0).toUpperCase()}</span>
                      <span className="room-member-name-text">{m.name}</span>
                      {m.socketId === roomDetails.hostSocketId && (
                        <span className="room-host-tag">Host</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RoomPage;
