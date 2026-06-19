import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Player from './Player';
import Search from './Search';
import Playlists from './Playlists';
import SavedQueueDetail from './SavedQueueDetail';
import LikedSongs from './LikedSongs';
import HistoryPage from './HistoryPage';
import SyncedMusicPlayer from './SyncedMusicPlayer';
import ExternalStreamPlayer from './ExternalStreamPlayer';
import DashboardHome from './DashboardHome';
import Sidebar from './Sidebar';
import Header from './Header';
import Queue from './Queue';
import PlayerBar from './PlayerBar';
import ArtistDetailPage from './ArtistDetailPage';
import apiClient from '../api/client';
import { buildSongLikePayload } from '../utils/songPayload';
import '../styles/DashboardLayout.css';

const FALLBACK_TRACK_COVER =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

const RECENTLY_PLAYED_KEY = 'music_app_recently_played';

const getTrackIdentity = (track) => String(track?.videoId || track?.id || '').trim();

const normalizePlayableTrack = (song) => {
  if (!song) {
    return null;
  }

  const trackId = song.videoId || song.id;
  if (!trackId) {
    return null;
  }

  return {
    ...song,
    id: trackId,
    videoId: trackId,
    title: song.title || 'Untitled Track',
    artist: song.channelTitle || song.artist || 'Unknown Artist',
    cover: song.thumbnail || song.cover || song.image || FALLBACK_TRACK_COVER,
    duration: Number(song.duration) || 0,
    source: song.source || 'youtube',
  };
};
function AppShell({ user, token, onLogout }) {
  const [recentlyPlayedTracks, setRecentlyPlayedTracks] = useState([]);
  const [likedRefresh, setLikedRefresh] = useState(0);
  const [activeTrack, setActiveTrack] = useState(null);
  const [, setHomeTracks] = useState([]);
  const [queueTracks, setQueueTracks] = useState([]);
  const [queueWasCleared, setQueueWasCleared] = useState(false);
  const [queueNotice, setQueueNotice] = useState('');
  const [language, setLanguage] = useState('EN');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const lastRouteHistoryRef = useRef('');
  const queueTracksRef = useRef([]);
  const queueNoticeTimerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENTLY_PLAYED_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentlyPlayedTracks(parsed);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  const updateRecentlyPlayed = useCallback((track) => {
    if (!track) return;
    setRecentlyPlayedTracks((current) => {
      const next = [
        { ...track, playedAt: Date.now() },
        ...current.filter((item) => (item.videoId || item.id) !== (track.videoId || track.id)),
      ].slice(0, 30);
      localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

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
    queueTracksRef.current = queueTracks;
  }, [queueTracks]);

  useEffect(() => {
    return () => {
      if (queueNoticeTimerRef.current) {
        window.clearTimeout(queueNoticeTimerRef.current);
      }
    };
  }, []);

  const showQueueNotice = useCallback((message) => {
    setQueueNotice(message);

    if (queueNoticeTimerRef.current) {
      window.clearTimeout(queueNoticeTimerRef.current);
    }

    queueNoticeTimerRef.current = window.setTimeout(() => {
      setQueueNotice('');
      queueNoticeTimerRef.current = null;
    }, 2400);
  }, []);

  useEffect(() => {
    const content = document.querySelector('.dashboard-scroll');
    if (content) {
      content.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [location.pathname]);

  const handleLikeUpdate = useCallback(() => {
    setLikedRefresh((value) => value + 1);
  }, []);

  const recordHistoryItem = useCallback(async (item) => {
    if (!token || !item?.type || !item?.title) {
      return;
    }

    try {
      await apiClient.post(
        '/api/history',
        item,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Could not record history item:', error);
    }
  }, [token]);

  useEffect(() => {
    const routeKey = `${location.pathname}${location.search}`;
    if (lastRouteHistoryRef.current === routeKey) {
      return;
    }

    lastRouteHistoryRef.current = routeKey;

    if (location.pathname.startsWith('/artist/')) {
      try {
        const artistName = decodeURIComponent(location.pathname.replace('/artist/', '')).trim();
        if (artistName) {
          recordHistoryItem({
            type: 'artist',
            title: artistName,
            subtitle: 'Artist profile',
            target: location.pathname,
          });
        }
      } catch (error) {
        if (!(error instanceof URIError)) {
          throw error;
        }
      }
      return;
    }

    if (location.pathname.startsWith('/library/saved/')) {
      recordHistoryItem({
        type: 'playlist',
        title: 'Saved Queue',
        subtitle: 'Opened playlist',
        target: location.pathname,
      });
      return;
    }

    if (location.pathname === '/library') {
      const params = new URLSearchParams(location.search);
      const section = params.get('section');
      if (section === 'artists') {
        recordHistoryItem({
          type: 'artist',
          title: 'Top Artists',
          subtitle: 'Viewed artists library',
          target: '/library?section=artists',
        });
      }
    }
  }, [location.pathname, location.search, recordHistoryItem]);

  const handleLikeTrack = useCallback(async (song) => {
    if (!song || !token) {
      return;
    }

    try {
      await apiClient.post(
        '/api/music/like',
        buildSongLikePayload(song),
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      if (error.response?.status !== 400) {
        console.error('Could not like track:', error);
        return;
      }
    }

    handleLikeUpdate();
  }, [handleLikeUpdate, token]);

  const handleTracksLoaded = useCallback((tracks) => {
    setHomeTracks(tracks);
    setQueueTracks((currentQueue) => {
      if (currentQueue.length === 0 && !queueWasCleared) {
        return tracks.slice(0, 8);
      }

      return currentQueue;
    });
  }, [queueWasCleared]);

  const playTrackNow = useCallback((song) => {
    const playableTrack = normalizePlayableTrack(song);
    if (!playableTrack) {
      return;
    }

    setActiveTrack({ ...playableTrack, requestId: Date.now(), shouldAutoPlay: true });
    updateRecentlyPlayed(playableTrack);
    recordHistoryItem({
      type: 'song',
      title: playableTrack.title,
      subtitle: playableTrack.artist,
      image: playableTrack.cover || playableTrack.thumbnail,
      target: playableTrack.videoId || playableTrack.id,
      metadata: playableTrack,
    });
  }, [recordHistoryItem, updateRecentlyPlayed]);

  const handlePlayTrack = useCallback((song) => {
    playTrackNow(song);
    navigate('/songs');
  }, [navigate, playTrackNow]);

  const handleHomeTrackSelect = useCallback((song) => {
    playTrackNow(song);
  }, [playTrackNow]);

  const handleQueuePlayTrack = (song) => {
    playTrackNow(song);
  };

  const handleAddToQueue = useCallback((song) => {
    const queuedTrack = normalizePlayableTrack(song);
    if (!queuedTrack) {
      return;
    }

    const queuedTrackId = getTrackIdentity(queuedTrack);
    const isAlreadyQueued = queueTracksRef.current.some((item) => getTrackIdentity(item) === queuedTrackId);

    if (isAlreadyQueued) {
      showQueueNotice('Song already exists in queue');
      return;
    }

    const queueItemId = `${queuedTrack.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextQueue = [...queueTracksRef.current, { ...queuedTrack, queueItemId }];

    queueTracksRef.current = nextQueue;
    setQueueTracks(nextQueue);
    setQueueWasCleared(false);
    if (!isCompactLayout) {
      setIsQueueOpen(true);
    }
  }, [isCompactLayout, showQueueNotice]);

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
    setQueueTracks((currentQueue) => currentQueue.filter((item) => (item.queueItemId || item.id) !== queueItemId));
  };

  const handleRemoveQueueItems = (queueItemIds) => {
    const removalSet = new Set(queueItemIds);
    setQueueTracks((currentQueue) => currentQueue.filter((item) => !removalSet.has(item.queueItemId || item.id)));
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
    <div className={`dashboard-shell ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
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

      {/* Header moved here to span grid columns 2 and 3 (Dashboard + Queue) */}
      <Header
        userName={user?.name || 'Listener'}
        onSearchSubmit={handleSearchSubmit}
        language={language}
        onLanguageChange={setLanguage}
        onLogout={onLogout}
        onToggleSidebar={() => setIsSidebarOpen((value) => !value)}
        onPlayTrack={handleHomeTrackSelect}
        onLikeTrack={handleLikeTrack}
        onQueueTrack={handleAddToQueue}
      />

      <div className="dashboard-main-shell">
        <main className="dashboard-content">
          <div className="dashboard-scroll">
            <Routes>
              <Route
                path="/"
                element={
                  <DashboardHome
                    user={user}
                    recentlyPlayed={recentlyPlayedTracks}
                    onTrackSelect={handleHomeTrackSelect}
                    onAddToQueue={handleAddToQueue}
                    onLikeTrack={handleLikeTrack}
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
                    onQueueTrack={handleAddToQueue}
                    onLikeUpdate={handleLikeUpdate}
                    onHistoryRecord={recordHistoryItem}
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
              <Route
                path="/liked-songs"
                element={
                  <LikedSongs
                    token={token}
                    refreshSignal={likedRefresh}
                    userName={user?.name || 'Listener'}
                    onPlayTrack={handleHomeTrackSelect}
                    onQueueTrack={handleAddToQueue}
                  />
                }
              />
              <Route
                path="/history"
                element={
                  <HistoryPage
                    token={token}
                    onPlayTrack={handleHomeTrackSelect}
                    onSearchSubmit={handleSearchSubmit}
                  />
                }
              />
              <Route
                path="/profile"
                element={
                  <LikedSongs
                    token={token}
                    refreshSignal={likedRefresh}
                    userName={user?.name || 'Listener'}
                    onPlayTrack={handleHomeTrackSelect}
                    onQueueTrack={handleAddToQueue}
                  />
                }
              />
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
        token={token}
        onSelectTrack={handleHomeTrackSelect}
        onToggleQueue={() => setIsQueueOpen((value) => !value)}
        onLikeUpdate={handleLikeUpdate}
      />

      {queueNotice && (
        <div className="dashboard-shell__queue-notice" role="status" aria-live="polite">
          {queueNotice}
        </div>
      )}
    </div>
  );
}

export default AppShell;
