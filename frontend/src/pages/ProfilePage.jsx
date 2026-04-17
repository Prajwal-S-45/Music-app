import React from 'react';
import LikedSongs from '../components/LikedSongs';

function ProfilePage({ token, refreshSignal }) {
  return <LikedSongs token={token} refreshSignal={refreshSignal} />;
}

export default ProfilePage;
