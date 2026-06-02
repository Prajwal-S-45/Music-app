import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Player from './Player';
import Search from './Search';
import Playlists from './Playlists';
import SavedQueueDetail from './SavedQueueDetail';
import LikedSongs from './LikedSongs';
import SyncedMusicPlayer from './SyncedMusicPlayer';
import ExternalStreamPlayer from './ExternalStreamPlayer';
import DashboardHome from './DashboardHome';
import Sidebar from './Sidebar';
import Header from './Header';
import Queue from './Queue';
import PlayerBar from './PlayerBar';
import ArtistDetailPage from './ArtistDetailPage';
import '../styles/DashboardLayout.css';
import '../styles/MobileOptimization.css';

function AppShell({ user, token, onLogout }) {
  const [likedRefresh, setLikedRefresh] = useState(0);
  const [activeTrack, setActiveTrack] = useState(null);
  const [homeTracks, setHomeTracks] = useState([]);
  const [queueTracks, setQueueTracks] = useState([]);
  const [queueWasCleared, setQueueWasCleared] = useState(false);
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

  const handleLikeUpdate = useCallback(() => {
    setLikedRefresh((value) => value + 1);
  }, []);

  const handleTracksLoaded = useCallback((tracks) => {
    setHomeTracks(tracks);
    setQueueTracks((currentQueue) => {
      if (currentQueue.length === 0 && !queueWasCleared) {
        return tracks.slice(0, 8);
      }

      return currentQueue;
    });
  }, [queueWasCleared]);

  const handlePlayTrack = useCallback((song) => {
    setActiveTrack({ ...song, requestId: Date.now() });
    navigate('/songs');
  }, [navigate]);

  const handleHomeTrackSelect = useCallback((song) => {
    setActiveTrack({ ...song, requestId: Date.now() });
  }, []);

  const handleQueuePlayTrack = (song) => {
    setActiveTrack({ ...song, requestId: Date.now(), shouldAutoPlay: true });
  };

  const handleReorderQueue = (fromIndex, toIndex) => {
    setQueueTracks((currentQueue) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= currentQueue.length ||
        toIndex >= currentQueue.length
      ) {
        return currentQueue;
      }

      const nextQueue = currentQueue.slice();
      const [movedItem] = nextQueue.splice(fromIndex, 1);
      nextQueue.splice(toIndex, 0, movedItem);
      return nextQueue;
    });
  };

  const handleRemoveQueueItem = (queueItemId) => {
    setQueueTracks((currentQueue) => currentQueue.filter((item) => item.id !== queueItemId));
  };

  const handleRemoveQueueItems = (queueItemIds) => {
    const removalSet = new Set(queueItemIds);
    setQueueTracks((currentQueue) => currentQueue.filter((item) => !removalSet.has(item.id)));
  };

  const handleClearQueue = () => {
    setQueueTracks([]);
    setQueueWasCleared(true);
  };

  const handleRestoreQueue = (restoredQueue) => {
    setQueueTracks(restoredQueue);
    setQueueWasCleared(false);
  };

  const handleSearchSubmit = (searchValue) => {
    if (!searchValue) {
      navigate('/search');
      return;
    }

    navigate(`/search?q=${encodeURIComponent(searchValue)}`);
  };

  const handlePlaySavedQueueSong = (song, queueSongs) => {
    if (!song || !Array.isArray(queueSongs) || queueSongs.length === 0) {
      return;
    }

    setQueueTracks(queueSongs);
    setQueueWasCleared(false);
    setActiveTrack({ ...song, requestId: Date.now(), shouldAutoPlay: true });
  };

  const handlePlaySavedQueueAll = (queueSongs) => {
    if (!Array.isArray(queueSongs) || queueSongs.length === 0) {
      return;
    }

    setQueueTracks(queueSongs);
    setQueueWasCleared(false);
    setActiveTrack({ ...queueSongs[0], requestId: Date.now(), shouldAutoPlay: true });
  };

  return (
    <div className={`dashboard-shell ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'} ${isQueueOpen ? 'queue-open' : ''} ${isCompactLayout ? 'compact' : ''}`}>
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
                    onTracksLoaded={handleTracksLoaded}
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
                    queuedTrack={queueTracks[0] || null}
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
              <Route path="/artists" element={<Navigate to="/library?section=artists" replace />} />
              <Route path="/artist/:name" element={<ArtistDetailPage onPlayTrack={handleHomeTrackSelect} />} />
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
              <Route
                path="/library"
                element={
                  <Playlists
                    onPlayAll={handlePlaySavedQueueAll}
                  />
                }
              />
              <Route
                path="/library/saved/:queueId"
                element={
                  <SavedQueueDetail
                    onPlaySong={handlePlaySavedQueueSong}
                    onPlayAll={handlePlaySavedQueueAll}
                  />
                }
              />
              <Route path="/profile" element={<LikedSongs token={token} refreshSignal={likedRefresh} />} />
              <Route path="/settings" element={<div className="dashboard-settings-page"><h2>Settings</h2><p>Upload support has been removed from this app.</p></div>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      <Queue
        isOpen={isQueueOpen}
        isCompactLayout={isCompactLayout}
        onToggleQueue={() => setIsQueueOpen((value) => !value)}
        items={queueTracks}
        activeTrackId={activeTrack?.id}
        onSelectTrack={handleHomeTrackSelect}
        onPlayTrack={handleQueuePlayTrack}
        onClearQueue={handleClearQueue}
        onRestoreQueue={handleRestoreQueue}
        onReorderQueue={handleReorderQueue}
        onRemoveQueueItem={handleRemoveQueueItem}
        onRemoveQueueItems={handleRemoveQueueItems}
      />

      <PlayerBar
        track={activeTrack || queueTracks[0] || null}
        queue={queueTracks}
        isQueueOpen={isQueueOpen}
        isCompactLayout={isCompactLayout}
        onSelectTrack={handleHomeTrackSelect}
        onToggleQueue={() => setIsQueueOpen((value) => !value)}
      />
    </div>
  );
}

export default AppShell;
