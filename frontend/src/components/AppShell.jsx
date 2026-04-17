import React, { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Player from './Player';
import Search from './Search';
import Playlists from './Playlists';
import LikedSongs from './LikedSongs';
import AdminUpload from './AdminUpload';
import HomeSongs from './HomeSongs';
import SyncedMusicPlayer from './SyncedMusicPlayer';
import ExternalStreamPlayer from './ExternalStreamPlayer';
import '../styles/App.css';

function AppShell({ user, token, onLogout }) {
  const [likedRefresh, setLikedRefresh] = useState(0);
  const [activeTrack, setActiveTrack] = useState(null);
  const [queuedTrack, setQueuedTrack] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    navigate('/', { replace: true });
  }, [user?.id]);

  useEffect(() => {
    const content = document.querySelector('.main-content');
    if (content) {
      content.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [location.pathname]);

  const handleLikeUpdate = () => {
    setLikedRefresh((value) => value + 1);
  };

  const handlePlayTrack = (song) => {
    navigate('/songs');
    setActiveTrack({ ...song, requestId: Date.now() });
  };

  const handleQueueTrack = (song) => {
    setQueuedTrack({ ...song, queueId: Date.now() });
  };

  const navItems = [
    { key: 'home', label: 'Home', icon: 'home', path: '/' },
    { key: 'songs', label: 'Songs', icon: 'music', path: '/songs' },
    { key: 'stream', label: 'Stream', icon: 'stream', path: '/stream' },
    { key: 'sync', label: 'Sync', icon: 'sync', path: '/sync' },
    { key: 'search', label: 'Search', icon: 'search', path: '/search' },
    { key: 'library', label: 'Library', icon: 'library', path: '/library' },
    { key: 'setting', label: 'Setting', icon: 'setting', path: '/settings' },
    { key: 'account', label: 'Profile', icon: 'account', path: '/profile' },
  ];

  const iconUrlMap = {
    home: 'https://img.icons8.com/ios/48/home--v1.png',
    music: 'https://img.icons8.com/ios/48/musical-notes.png',
    stream: 'https://img.icons8.com/ios/48/radio-tower.png',
    sync: 'https://img.icons8.com/ios/48/synchronize.png',
    search: 'https://img.icons8.com/ios/48/search--v1.png',
    library: 'https://img.icons8.com/?size=48&id=3161&format=png',
    setting: 'https://img.icons8.com/ios/48/settings--v1.png',
    account: 'https://img.icons8.com/ios/48/user--v1.png',
  };

  const renderNavIcon = (icon) => {
    if (iconUrlMap[icon]) {
      return (
        <img
          src={iconUrlMap[icon]}
          alt=""
          className="nav-icon-image"
          loading="lazy"
          decoding="async"
        />
      );
    }

    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 4v9.2a2.8 2.8 0 1 1-1.8-2.6V6.2l7-1.7v7.7a2.8 2.8 0 1 1-1.8-2.6V3.2L14 4z" />
      </svg>
    );
  };

  return (
    <div className="app-container">
      <div className="app-shell">
        <aside className="sidebar">
          <div className="nav-links">
            {navItems.map((item) => {
              const normalizedPath = String(item.path || '/').trim();

              return (
              <NavLink
                key={item.key}
                to={normalizedPath}
                aria-label={item.label}
                end={normalizedPath === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {({ isActive }) => (
                  <>
                    <span className="nav-icon">{renderNavIcon(item.icon)}</span>
                    {isActive && <span className="nav-tooltip">{item.label}</span>}
                  </>
                )}
              </NavLink>
              );
            })}
          </div>
        </aside>

        <div className="sidebar-user">
          <span>Welcome, {user.name}</span>
          <button type="button" onClick={onLogout}>Logout</button>
        </div>

        <main className="main-content">
          <div className="content-wrapper">
            <Routes>
              <Route path="/" element={<HomeSongs user={user} />} />
              <Route
                path="/songs"
                element={
                  <Player
                    token={token}
                    user={user}
                    activeTrack={activeTrack}
                    queuedTrack={queuedTrack}
                    onLikeUpdate={handleLikeUpdate}
                  />
                }
              />
              <Route
                path="/sync"
                element={
                  <SyncedMusicPlayer
                    roomId="chill-zone"
                    userName={user?.name || 'Listener'}
                  />
                }
              />
              <Route
                path="/stream"
                element={
                  <ExternalStreamPlayer
                    apiEndpoint="/api/music/trending?limit=10"
                  />
                }
              />
              <Route
                path="/search"
                element={
                  <Search
                    token={token}
                    onPlayTrack={handlePlayTrack}
                    onQueueTrack={handleQueueTrack}
                    onLikeUpdate={handleLikeUpdate}
                  />
                }
              />
              <Route path="/library" element={<Playlists token={token} />} />
              <Route path="/profile" element={<LikedSongs token={token} refreshSignal={likedRefresh} />} />
              <Route path="/settings" element={<AdminUpload token={token} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
