import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Search, User, ChevronRight, Check,
  CirclePlay, Sliders, Volume2, Download,
  Wifi, Smartphone, HardDrive, Bell, Globe, Palette,
  Shield, EyeOff, Clock, Trash2, Info, LogOut,
  Pen, Mail, Phone, Lock, X
} from 'lucide-react';
import '../styles/SettingsPage.css';

const Toggle = ({ active, onChange }) => (
  <div className={`toggle-switch ${active ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); onChange(); }}>
    <div className="toggle-thumb" />
  </div>
);

const SettingItem = ({ icon: Icon, title, value, onClick, rightElement, destructive, subtitle }) => (
  <div className={`settings-item ${destructive ? 'destructive' : ''}`} onClick={onClick}>
    <div className="settings-item-left">
      {Icon && <Icon size={24} className="settings-item-icon" />}
      <div className="settings-item-info">
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
        {value && <span>{value}</span>}
      </div>
    </div>
    <div className="settings-item-right">
      {rightElement !== undefined ? rightElement : <ChevronRight size={20} className="chevron-icon" />}
    </div>
  </div>
);

function SettingsPage({ user }) {
  const navigate = useNavigate();

  // State
  const [activeView, setActiveView] = useState('main'); // main, equalizer
  const [sheet, setSheet] = useState(null); // null, 'audioQuality', 'language', 'theme'
  
  // Toggles state
  const [toggles, setToggles] = useState({
    crossfade: false,
    gapless: true,
    autoPlay: true,
    normalizeVolume: true,
    wifiOnly: false,
    smartDownloads: true,
    newReleases: true,
    artistUpdates: true,
    playlistRecs: false,
    podcasts: true,
    offers: false,
    privateSession: false,
    hideRecentlyPlayed: false
  });

  // Selections state
  const [prefs, setPrefs] = useState({
    audioQuality: 'High',
    language: 'English',
    theme: 'Dark'
  });

  const handleToggle = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePrefChange = (key, val) => {
    setPrefs(prev => ({ ...prev, [key]: val }));
    setSheet(null);
  };

  const openSheet = (sheetName) => setSheet(sheetName);
  const closeSheet = () => setSheet(null);

  const renderEqualizer = () => (
    <div className="settings-container equalizer-view">
      <div className="settings-header">
        <div className="settings-header-left">
          <button type="button" className="icon-btn" onClick={() => setActiveView('main')}>
            <ArrowLeft size={24} />
          </button>
          <h2>Equalizer</h2>
        </div>
      </div>
      
      <div className="settings-card">
        <SettingItem 
          title="Current Preset"
          value="Bass Boost"
          onClick={() => {}}
        />
      </div>

      <div className="eq-sliders-container">
        {[60, 230, 910, 3600, 14000].map(freq => (
          <div key={freq} className="eq-slider-col">
            <input type="range" min="-12" max="12" defaultValue={freq === 60 ? 6 : 0} orient="vertical" />
            <span>{freq > 1000 ? `${freq/1000}k` : freq}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (activeView === 'equalizer') return renderEqualizer();

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="settings-header">
        <div className="settings-header-left">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
          </button>
          <h2>Settings</h2>
        </div>
        <div className="settings-header-right">
          <button type="button" className="icon-btn">
            <Search size={24} />
          </button>
          <div className="profile-avatar">
            <User size={20} />
          </div>
        </div>
      </div>

      {/* 2. Premium */}
      <div className="premium-card">
        <div className="premium-card-info">
          <strong>Premium Plan</strong>
          <span>✓ Active</span>
        </div>
        <button className="premium-card-btn">
          Manage <ChevronRight size={16} />
        </button>
      </div>

      {/* 1. Account */}
      <h3 className="settings-section-title">Account</h3>
      <div className="settings-card">
        <SettingItem icon={User} title="Profile" value={user?.name || "Prajwal S A"} />
        <SettingItem icon={Pen} title="Edit Profile" />
        <SettingItem icon={Mail} title="Email" value={user?.email || "prajwal@example.com"} />
        <SettingItem icon={Phone} title="Phone Number" value="+91 9876543210" />
        <SettingItem icon={Lock} title="Change Password" />
      </div>

      {/* 3. Playback */}
      <h3 className="settings-section-title">Playback</h3>
      <div className="settings-card">
        <SettingItem 
          icon={Sliders} 
          title="Crossfade" 
          rightElement={<Toggle active={toggles.crossfade} onChange={() => handleToggle('crossfade')} />} 
        />
        <SettingItem 
          icon={CirclePlay} 
          title="Gapless Playback" 
          rightElement={<Toggle active={toggles.gapless} onChange={() => handleToggle('gapless')} />} 
        />
        <SettingItem 
          icon={CirclePlay} 
          title="Auto Play" 
          rightElement={<Toggle active={toggles.autoPlay} onChange={() => handleToggle('autoPlay')} />} 
        />
        <SettingItem 
          icon={Volume2} 
          title="Normalize Volume" 
          rightElement={<Toggle active={toggles.normalizeVolume} onChange={() => handleToggle('normalizeVolume')} />} 
        />
        <SettingItem 
          icon={Volume2} 
          title="Audio Quality" 
          value={`Current Value: ${prefs.audioQuality}`}
          onClick={() => openSheet('audioQuality')}
        />
      </div>

      {/* 4. Downloads */}
      <h3 className="settings-section-title">Downloads</h3>
      <div className="settings-card">
        <SettingItem icon={Download} title="Download Quality" value="High" />
        <SettingItem 
          icon={Wifi} 
          title="Wi-Fi Only Downloads" 
          rightElement={<Toggle active={toggles.wifiOnly} onChange={() => handleToggle('wifiOnly')} />} 
        />
        <SettingItem 
          icon={Smartphone} 
          title="Smart Downloads" 
          rightElement={<Toggle active={toggles.smartDownloads} onChange={() => handleToggle('smartDownloads')} />} 
        />
        <div className="settings-item" style={{ display: 'block', paddingBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <HardDrive size={24} className="settings-item-icon" />
              <strong style={{ fontSize: '16px', fontWeight: '500' }}>Storage Used</strong>
            </div>
            <span style={{ fontSize: '14px', color: '#b3b3b3' }}>4.3 GB / 10 GB</span>
          </div>
          <div className="storage-bar-container">
            <div className="storage-bar-fill" style={{ width: '43%' }} />
          </div>
        </div>
      </div>

      {/* 5. Notifications */}
      <h3 className="settings-section-title">Notifications</h3>
      <div className="settings-card">
        <SettingItem icon={Bell} title="New Releases" rightElement={<Toggle active={toggles.newReleases} onChange={() => handleToggle('newReleases')} />} />
        <SettingItem icon={Bell} title="Artist Updates" rightElement={<Toggle active={toggles.artistUpdates} onChange={() => handleToggle('artistUpdates')} />} />
        <SettingItem icon={Bell} title="Playlist Recommendations" rightElement={<Toggle active={toggles.playlistRecs} onChange={() => handleToggle('playlistRecs')} />} />
        <SettingItem icon={Bell} title="Podcasts" rightElement={<Toggle active={toggles.podcasts} onChange={() => handleToggle('podcasts')} />} />
        <SettingItem icon={Bell} title="Offers" rightElement={<Toggle active={toggles.offers} onChange={() => handleToggle('offers')} />} />
      </div>

      {/* 6. Language & Region */}
      <h3 className="settings-section-title">Language & Region</h3>
      <div className="settings-card">
        <SettingItem icon={Globe} title="App Language" value={prefs.language} onClick={() => openSheet('language')} />
        <SettingItem icon={Globe} title="Music Language Preferences" value="English, Hindi" />
        <SettingItem icon={Globe} title="Country" value="India" />
      </div>

      {/* 7. Appearance */}
      <h3 className="settings-section-title">Appearance</h3>
      <div className="settings-card">
        <SettingItem icon={Palette} title="Theme" value={prefs.theme} onClick={() => openSheet('theme')} />
        <SettingItem icon={Palette} title="Accent Color" value="Green" />
      </div>

      {/* 8. Privacy */}
      <h3 className="settings-section-title">Privacy</h3>
      <div className="settings-card">
        <SettingItem icon={Shield} title="Private Session" rightElement={<Toggle active={toggles.privateSession} onChange={() => handleToggle('privateSession')} />} />
        <SettingItem icon={EyeOff} title="Listening Activity" rightElement={<Toggle active={toggles.hideRecentlyPlayed} onChange={() => handleToggle('hideRecentlyPlayed')} />} />
        <SettingItem icon={Clock} title="Hide Recently Played" rightElement={<Toggle active={toggles.hideRecentlyPlayed} onChange={() => handleToggle('hideRecentlyPlayed')} />} />
        <SettingItem icon={Trash2} title="Clear Search History" destructive />
        <SettingItem icon={Trash2} title="Clear Listening History" destructive />
      </div>

      {/* 9. Equalizer */}
      <h3 className="settings-section-title">Equalizer</h3>
      <div className="settings-card">
        <SettingItem 
          icon={Sliders} 
          title="Equalizer" 
          value="Current Preset: Bass Boost" 
          onClick={() => setActiveView('equalizer')} 
        />
      </div>

      {/* 10. About */}
      <h3 className="settings-section-title">About</h3>
      <div className="settings-card">
        <SettingItem icon={Info} title="App Version" value="v2.4.1" rightElement={<span />} />
        <SettingItem icon={Info} title="Privacy Policy" />
        <SettingItem icon={Info} title="Terms & Conditions" />
        <SettingItem icon={Info} title="Help Center" />
        <SettingItem icon={Info} title="Contact Support" />
      </div>

      {/* Logout */}
      <button className="logout-btn">
        <LogOut size={20} />
        Logout
      </button>

      {/* Bottom Sheets */}
      {sheet && (
        <div className="bottom-sheet-overlay" onClick={closeSheet}>
          <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h3 className="bottom-sheet-title">
                {sheet === 'audioQuality' && 'Audio Quality'}
                {sheet === 'language' && 'App Language'}
                {sheet === 'theme' && 'Theme'}
              </h3>
              <button className="icon-btn" onClick={closeSheet}><X size={24} /></button>
            </div>
            
            {sheet === 'audioQuality' && ['Low', 'Normal', 'High', 'Very High'].map(q => (
              <div key={q} className="sheet-item" onClick={() => handlePrefChange('audioQuality', q)}>
                <span>{q}</span>
                {prefs.audioQuality === q && <Check size={20} color="#1DB954" />}
              </div>
            ))}

            {sheet === 'language' && ['English', 'Hindi', 'Spanish', 'French'].map(l => (
              <div key={l} className="sheet-item" onClick={() => handlePrefChange('language', l)}>
                <span>{l}</span>
                {prefs.language === l && <Check size={20} color="#1DB954" />}
              </div>
            ))}

            {sheet === 'theme' && ['Dark', 'Light', 'System'].map(t => (
              <div key={t} className="sheet-item" onClick={() => handlePrefChange('theme', t)}>
                <span>{t}</span>
                {prefs.theme === t && <Check size={20} color="#1DB954" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
