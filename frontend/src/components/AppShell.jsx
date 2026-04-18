import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Player from './Player';
import Search from './Search';
import Playlists from './Playlists';
import LikedSongs from './LikedSongs';
import AdminUpload from './AdminUpload';
import SyncedMusicPlayer from './SyncedMusicPlayer';
import ExternalStreamPlayer from './ExternalStreamPlayer';
import DashboardHome from './DashboardHome';
import Sidebar from './Sidebar';
import Header from './Header';
import Queue from './Queue';
import PlayerBar from './PlayerBar';
import '../styles/components/DashboardLayout.css';

function AppShell({ user, token, onLogout }) {
  const [likedRefresh, setLikedRefresh] = useState(0);
  const [activeTrack, setActiveTrack] = useState(null);
  const [homeTracks, setHomeTracks] = useState([]);
  const [language, setLanguage] = useState('EN');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const syncLayoutFlags = () => {
      const compact = window.innerWidth <= 1100;
      setIsCompactLayout(compact);
      setIsSidebarOpen(!compact);
      if (compact) {
        setIsQueueOpen(false);
      } else {
        setIsQueueOpen(true);
      }
    };

    syncLayoutFlags();
    window.addEventListener('resize', syncLayoutFlags);
    return () => window.removeEventListener('resize', syncLayoutFlags);
  }, []);

  useEffect(() => {
    navigate('/', { replace: true });
  }, [user?.id]);

  useEffect(() => {
    const content = document.querySelector('.dashboard-scroll');
    if (content) {
      content.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [location.pathname]);

  const handleLikeUpdate = () => {
    setLikedRefresh((value) => value + 1);
  };

  const handlePlayTrack = (song) => {
    setActiveTrack({ ...song, requestId: Date.now() });
    navigate('/songs');
  };

  const handleHomeTrackSelect = (song) => {
    setActiveTrack({ ...song, requestId: Date.now() });
  };

  const handleSearchSubmit = (searchValue) => {
    if (!searchValue) {
      navigate('/search');
      return;
    }

    navigate(`/search?q=${encodeURIComponent(searchValue)}`);
  };

  const queueItems = useMemo(() => homeTracks.slice(0, 8), [homeTracks]);

  return (
    <div className={`dashboard-shell ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'} ${isQueueOpen ? 'queue-open' : ''}`}>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onCreatePlaylist={() => navigate('/library')}
      />

      {isCompactLayout && isSidebarOpen && (
        <button
          type="button"
          className="dashboard-overlay"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="dashboard-main-shell">
        <Header
          userName={user?.name || 'Listener'}
          onSearchSubmit={handleSearchSubmit}
          language={language}
          onLanguageChange={setLanguage}
          onLogout={onLogout}
          onToggleSidebar={() => setIsSidebarOpen((value) => !value)}
        />

        <main className="dashboard-content">
          <div className="dashboard-scroll">
            <Routes>
              <Route
                path="/"
                element={
                  <DashboardHome
                    user={user}
                    onTrackSelect={handleHomeTrackSelect}
                    onTracksLoaded={setHomeTracks}
                  />
                }
              />
              <Route
                path="/songs"
                element={
                  <Player
                    token={token}
                    user={user}
                    activeTrack={activeTrack}
                    queuedTrack={queueItems[0] || null}
                    onLikeUpdate={handleLikeUpdate}
                  />
                }
              />
              <Route
                path="/sync"
                element={
                  <SyncedMusicPlayer roomId="chill-zone" userName={user?.name || 'Listener'} />
                }
              />
              <Route path="/stream" element={<ExternalStreamPlayer apiEndpoint="/api/music/trending?limit=10" />} />
              <Route
                path="/search"
                element={
                  <Search
                    token={token}
                    onPlayTrack={handlePlayTrack}
                    onQueueTrack={handleHomeTrackSelect}
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

      <Queue
        isOpen={isQueueOpen}
        isCompactLayout={isCompactLayout}
        onToggleQueue={() => setIsQueueOpen((value) => !value)}
        items={queueItems}
        activeTrackId={activeTrack?.id}
        onSelectTrack={handleHomeTrackSelect}
      />

      <PlayerBar
        track={activeTrack || queueItems[0] || null}
        queue={queueItems}
        onSelectTrack={handleHomeTrackSelect}
        onToggleQueue={() => setIsQueueOpen((value) => !value)}
      />
    </div>
  );
}

export default AppShell;
