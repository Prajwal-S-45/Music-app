import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Player from './components/Player';
import Search from './components/Search';
import Playlists from './components/Playlists';
import LikedSongs from './components/LikedSongs';
import AdminUpload from './components/AdminUpload';
import './styles/App.css';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [likedRefresh, setLikedRefresh] = useState(0);
  const [activeTrack, setActiveTrack] = useState(null);
  const [queuedTrack, setQueuedTrack] = useState(null);
  const [activeNav, setActiveNav] = useState('home');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const handleLikeUpdate = () => {
    setLikedRefresh((value) => value + 1);
  };

  const handlePlayTrack = (song) => {
    setActiveNav('songs');
    setActiveTrack({ ...song, requestId: Date.now() });
  };

  const handleQueueTrack = (song) => {
    setQueuedTrack({ ...song, queueId: Date.now() });
  };

  const handleNavClick = (section) => {
    setActiveNav(section);
  };

  const navItems = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'songs', label: 'Songs', icon: 'music' },
    { key: 'search', label: 'Search', icon: 'search' },
    { key: 'library', label: 'Library', icon: 'library' },
    { key: 'setting', label: 'Setting', icon: 'setting' },
    { key: 'account', label: 'Profile', icon: 'account' },
  ];

  const iconUrlMap = {
    home: 'https://img.icons8.com/ios/48/home--v1.png',
    music: 'https://img.icons8.com/ios/48/musical-notes.png',
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

  const renderActiveView = () => {
    if (activeNav === 'home') {
      return (
        <>
          <section className="home-panel">
            <div className="home-copy">
              <p className="eyebrow">Home</p>
              <h2>Welcome to your personalized music dashboard.</h2>
              <p>
                Use the sidebar to move between songs, search, playlists, settings,
                and your account area. Queue tracks and keep listening without interruption.
              </p>
            </div>
            <div className="home-points">
              <div>
                <strong>Smart Search</strong>
                <span>Find songs, artists, and albums instantly.</span>
              </div>
              <div>
                <strong>Library Control</strong>
                <span>Create playlists and save favorites in one place.</span>
              </div>
              <div>
                <strong>Continuous Play</strong>
                <span>Use queue + mini player for smooth playback.</span>
              </div>
            </div>
          </section>

          <section className="hero-panel">
            <div>
              <p className="eyebrow">Your music space</p>
              <h1>Explore, queue, and organize your library.</h1>
              <p className="hero-copy">
                Search songs, play from the catalog, and create playlists right after login.
              </p>
            </div>
            <div className="hero-stats">
              <div>
                <span>06</span>
                <p>Sidebar views</p>
              </div>
              <div>
                <span>01</span>
                <p>Focused panel at a time</p>
              </div>
            </div>
          </section>
        </>
      );
    }

    if (activeNav === 'search') {
      return (
        <Search
          token={token}
          onPlayTrack={handlePlayTrack}
          onQueueTrack={handleQueueTrack}
          onLikeUpdate={handleLikeUpdate}
        />
      );
    }

    if (activeNav === 'songs') {
      return (
        <Player
          token={token}
          activeTrack={activeTrack}
          queuedTrack={queuedTrack}
          onLikeUpdate={handleLikeUpdate}
        />
      );
    }

    if (activeNav === 'library') {
      return <Playlists token={token} />;
    }

    if (activeNav === 'account') {
      return <LikedSongs token={token} refreshSignal={likedRefresh} />;
    }

    if (activeNav === 'setting') {
      return <AdminUpload token={token} />;
    }

    return null;
  };

   const handleLogin = (user, token) => {
     setUser(user);
     setToken(token);
   };

   if (!user || !token) {
     return <Auth onLogin={handleLogin} />;
   }

  return (
    <div className="app-container">
      <div className="app-shell">
        <aside className="sidebar">
          <div className="nav-links">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-label={item.label}
                className={`nav-link ${activeNav === item.key ? 'active' : ''}`}
                onClick={() => handleNavClick(item.key)}
              >
                <span className="nav-icon">{renderNavIcon(item.icon)}</span>
                {activeNav === item.key && <span className="nav-tooltip">{item.label}</span>}
              </button>
            ))}
          </div>
        </aside>

        <div className="sidebar-user">
          <span>Welcome, {user.name}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>

        <main className="main-content">
          <div className="content-wrapper">{renderActiveView()}</div>
        </main>
      </div>
    </div>
  );
}

export default App;
