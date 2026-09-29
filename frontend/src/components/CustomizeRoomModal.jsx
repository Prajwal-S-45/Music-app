import { useState } from 'react';
import {
  X,
  Palette,
  Sliders,
  CloudRain,
  Check,
  Sparkles,
  Volume2,
  ShieldCheck,
  MessageSquare,
  RotateCcw,
  Zap
} from 'lucide-react';
import '../styles/CustomizeRoomModal.css';

const THEME_PRESETS = [
  { id: 'city_rooftop', name: 'City Rooftop', img: '/room_backgrounds/city_rooftop.jpg' },
  { id: 'night_forest', name: 'Night Forest', img: '/room_backgrounds/night_forest.jpg' },
  { id: 'cozy_lounge', name: 'Cozy Lounge', img: '/room_backgrounds/cozy_lounge.jpg' },
  { id: 'sunset_beach', name: 'Sunset Beach', img: '/room_backgrounds/sunset_beach.jpg' },
  { id: 'modern_studio', name: 'Modern Studio', img: '/room_backgrounds/modern_studio.jpg' },
  { id: 'starry_night_balcony', name: 'Starry Balcony', img: '/room_backgrounds/starry_night_balcony.jpg' },
];

const ACCENT_COLORS = [
  { id: 'cyan', name: 'Electric Cyan', hex: '#00f2fe', glow: 'rgba(0, 242, 254, 0.4)' },
  { id: 'purple', name: 'Neon Purple', hex: '#c084fc', glow: 'rgba(192, 132, 252, 0.4)' },
  { id: 'emerald', name: 'Emerald', hex: '#34d399', glow: 'rgba(52, 211, 153, 0.4)' },
  { id: 'amber', name: 'Sunset Gold', hex: '#fbbf24', glow: 'rgba(251, 191, 36, 0.4)' },
  { id: 'rose', name: 'Rose Pink', hex: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)' },
];

const AMBIENT_SOUNDS = [
  { id: 'none', label: 'None', desc: 'Pure music audio only' },
  { id: 'rain', label: '🌧️ Soft Rain', desc: 'Gentle raindrops & distant thunder' },
  { id: 'cafe', label: '☕ Cozy Cafe', desc: 'Warm coffee shop background ambiance' },
  { id: 'vinyl', label: '📻 Vintage Vinyl', desc: 'Analog vinyl crackle & warm hiss' },
  { id: 'fire', label: '🔥 Campfire', desc: 'Cracking wood & night crickets' },
];

function CustomizeRoomModal({ isOpen, onClose, initialSettings = {}, onSave }) {
  const [activeTab, setActiveTab] = useState('appearance'); // 'appearance' | 'audio' | 'ambiance'

  // Form State
  const [theme, setTheme] = useState(initialSettings.theme || '/room_backgrounds/night_forest.jpg');
  const [accentColor, setAccentColor] = useState(initialSettings.accentColor || 'cyan');
  const [audioQuality, setAudioQuality] = useState(initialSettings.audioQuality || 'high'); // 'high' | 'standard' | 'saver'
  const [maxQueueLimit, setMaxQueueLimit] = useState(initialSettings.maxQueueLimit || '10');
  const [allowGuestPlayPause, setAllowGuestPlayPause] = useState(initialSettings.allowGuestPlayPause ?? true);
  const [filterExplicit, setFilterExplicit] = useState(initialSettings.filterExplicit ?? false);
  const [ambientSound, setAmbientSound] = useState(initialSettings.ambientSound || 'none');
  const [welcomeMessage, setWelcomeMessage] = useState(initialSettings.welcomeMessage || 'Welcome to the room! Let us vibe together 🎉');
  const [toastMsg, setToastMsg] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    const updatedCustomization = {
      theme,
      accentColor,
      audioQuality,
      maxQueueLimit,
      allowGuestPlayPause,
      filterExplicit,
      ambientSound,
      welcomeMessage,
    };

    if (onSave) {
      onSave(updatedCustomization);
    }

    setToastMsg('Room customization saved!');
    setTimeout(() => {
      setToastMsg('');
      onClose();
    }, 1200);
  };

  const handleReset = () => {
    setTheme('/room_backgrounds/night_forest.jpg');
    setAccentColor('cyan');
    setAudioQuality('high');
    setMaxQueueLimit('10');
    setAllowGuestPlayPause(true);
    setFilterExplicit(false);
    setAmbientSound('none');
    setWelcomeMessage('Welcome to the room! Let us vibe together 🎉');
  };

  return (
    <div className="customize-room-overlay" onClick={onClose}>
      <div
        className="customize-room-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {toastMsg && <div className="customize-toast-banner">{toastMsg}</div>}

        {/* Modal Header */}
        <div className="customize-modal-header">
          <div className="customize-modal-title">
            <div className="customize-modal-orb">
              <Sparkles size={20} color="#00f2fe" />
            </div>
            <div>
              <h2>Customize Room</h2>
              <p>Personalize room appearance, audio quality, and member rules</p>
            </div>
          </div>
          <button type="button" className="customize-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="customize-modal-tabs">
          <button
            type="button"
            className={`customize-tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <Palette size={16} />
            <span>Appearance</span>
          </button>
          <button
            type="button"
            className={`customize-tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
            onClick={() => setActiveTab('audio')}
          >
            <Sliders size={16} />
            <span>Audio & Queue</span>
          </button>
          <button
            type="button"
            className={`customize-tab-btn ${activeTab === 'ambiance' ? 'active' : ''}`}
            onClick={() => setActiveTab('ambiance')}
          >
            <CloudRain size={16} />
            <span>Ambiance & Chat</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="customize-modal-body">
          {/* TAB 1: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="customize-tab-content">
              {/* Background Theme Selector */}
              <div className="customize-section">
                <label className="customize-section-title">Room Mood Background</label>
                <div className="customize-theme-grid">
                  {THEME_PRESETS.map((item) => (
                    <div
                      key={item.id}
                      className={`customize-theme-card ${theme === item.img ? 'selected' : ''}`}
                      onClick={() => setTheme(item.img)}
                    >
                      <img src={item.img} alt={item.name} />
                      <div className="customize-theme-overlay">
                        <span>{item.name}</span>
                        {theme === item.img && (
                          <div className="customize-check-badge">
                            <Check size={12} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accent Glow Color */}
              <div className="customize-section">
                <label className="customize-section-title">Neon Accent Glow</label>
                <div className="customize-accent-row">
                  {ACCENT_COLORS.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      className={`customize-color-pill ${accentColor === col.id ? 'active' : ''}`}
                      onClick={() => setAccentColor(col.id)}
                      style={{
                        backgroundColor: col.hex,
                        boxShadow: accentColor === col.id ? `0 0 16px ${col.glow}` : 'none'
                      }}
                      title={col.name}
                    >
                      {accentColor === col.id && <Check size={14} color="#000000" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIO & QUEUE */}
          {activeTab === 'audio' && (
            <div className="customize-tab-content">
              {/* Streaming Quality */}
              <div className="customize-section">
                <label className="customize-section-title">
                  <Volume2 size={16} />
                  <span>Audio Streaming Quality</span>
                </label>
                <div className="customize-radio-cards">
                  {[
                    { id: 'high', title: 'High-Fidelity 320kbps', desc: 'Best audio experience for headphones & speakers' },
                    { id: 'standard', title: 'Standard 160kbps', desc: 'Balanced audio quality and bandwidth usage' },
                    { id: 'saver', title: 'Data Saver 96kbps', desc: 'Optimized for slow mobile connections' },
                  ].map((q) => (
                    <div
                      key={q.id}
                      className={`customize-radio-card ${audioQuality === q.id ? 'active' : ''}`}
                      onClick={() => setAudioQuality(q.id)}
                    >
                      <div className="customize-radio-circle">
                        {audioQuality === q.id && <Check size={12} />}
                      </div>
                      <div className="customize-radio-info">
                        <strong>{q.title}</strong>
                        <span>{q.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Queue Limits & Permissions */}
              <div className="customize-section">
                <label className="customize-section-title">
                  <ShieldCheck size={16} />
                  <span>Queue Rules & DJ Controls</span>
                </label>
                
                <div className="customize-setting-row">
                  <div>
                    <strong>Max Songs Per Member in Queue</strong>
                    <span>Prevents single member from flooding the queue</span>
                  </div>
                  <select
                    className="customize-select-input"
                    value={maxQueueLimit}
                    onChange={(e) => setMaxQueueLimit(e.target.value)}
                  >
                    <option value="5">5 Songs</option>
                    <option value="10">10 Songs</option>
                    <option value="unlimited">Unlimited</option>
                  </select>
                </div>

                <div className="customize-setting-row">
                  <div>
                    <strong>Allow Guest Play / Pause Control</strong>
                    <span>Members can pause or skip tracks</span>
                  </div>
                  <label className="customize-switch">
                    <input
                      type="checkbox"
                      checked={allowGuestPlayPause}
                      onChange={(e) => setAllowGuestPlayPause(e.target.checked)}
                    />
                    <span className="customize-slider" />
                  </label>
                </div>

                <div className="customize-setting-row">
                  <div>
                    <strong>Filter Explicit Content</strong>
                    <span>Block songs tagged as explicit</span>
                  </div>
                  <label className="customize-switch">
                    <input
                      type="checkbox"
                      checked={filterExplicit}
                      onChange={(e) => setFilterExplicit(e.target.checked)}
                    />
                    <span className="customize-slider" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AMBIANCE & CHAT */}
          {activeTab === 'ambiance' && (
            <div className="customize-tab-content">
              {/* Background Ambient Sound Layer */}
              <div className="customize-section">
                <label className="customize-section-title">
                  <Zap size={16} />
                  <span>Background Ambient Layer</span>
                </label>
                <div className="customize-ambient-list">
                  {AMBIENT_SOUNDS.map((snd) => (
                    <div
                      key={snd.id}
                      className={`customize-ambient-item ${ambientSound === snd.id ? 'active' : ''}`}
                      onClick={() => setAmbientSound(snd.id)}
                    >
                      <div className="customize-ambient-check">
                        {ambientSound === snd.id && <Check size={12} />}
                      </div>
                      <div className="customize-ambient-text">
                        <strong>{snd.label}</strong>
                        <span>{snd.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Welcome Announcement */}
              <div className="customize-section">
                <label className="customize-section-title">
                  <MessageSquare size={16} />
                  <span>Room Welcome Announcement</span>
                </label>
                <textarea
                  className="customize-textarea"
                  value={welcomeMessage}
                  rows={3}
                  maxLength={120}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="Welcome message broadcasted when members join..."
                />
                <span className="customize-char-hint">{welcomeMessage.length}/120 characters</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="customize-modal-footer">
          <button
            type="button"
            className="customize-reset-btn"
            onClick={handleReset}
          >
            <RotateCcw size={15} />
            <span>Reset Defaults</span>
          </button>

          <div className="customize-footer-right">
            <button
              type="button"
              className="customize-cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="customize-save-btn"
              onClick={handleSave}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomizeRoomModal;
