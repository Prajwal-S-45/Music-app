import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import SongsPage from '../pages/SongsPage';
import SearchPage from '../pages/SearchPage';
import LibraryPage from '../pages/LibraryPage';
import ProfilePage from '../pages/ProfilePage';
import SettingsPage from '../pages/SettingsPage';

function AppRoutes(props) {
  const { activeNav, token, user, likedRefresh, activeTrack, queuedTrack, onLikeUpdate, onPlayTrack, onQueueTrack } = props;

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/songs" element={<SongsPage token={token} user={user} activeTrack={activeTrack} queuedTrack={queuedTrack} onLikeUpdate={onLikeUpdate} />} />
      <Route path="/search" element={<SearchPage token={token} onPlayTrack={onPlayTrack} onQueueTrack={onQueueTrack} onLikeUpdate={onLikeUpdate} />} />
      <Route path="/library" element={<LibraryPage token={token} />} />
      <Route path="/profile" element={<ProfilePage token={token} refreshSignal={likedRefresh} />} />
      <Route path="/settings" element={<SettingsPage token={token} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
