export const buildSongLikePayload = (song = {}) => {
  const songId = song.id;
  const artwork = song.thumbnail || song.cover || song.image || song.albumArt || song.poster || '';

  return {
    songId,
    title: song.title || 'Untitled Track',
    artist: song.artist || song.channelTitle || 'Unknown Artist',
    album: song.album || song.movie || '',
    thumbnail: artwork,
    duration: Number(song.duration) || 0,
    source: song.source || 'jiosaavn',
  };
};

export const normalizeDisplaySong = (song = {}) => {
  const id = song.id;
  const artwork = song.cover || song.thumbnail || song.image || song.albumArt || song.poster || '';

  return {
    ...song,
    id,
    title: song.title || 'Untitled Track',
    artist: song.artist || song.channelTitle || 'Unknown Artist',
    album: song.album || song.movie || 'Single',
    thumbnail: artwork,
    cover: artwork,
    duration: Number(song.duration) || 0,
    source: song.source || 'jiosaavn',
    playable: song.playable !== false,
  };
};
