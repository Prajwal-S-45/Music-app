export const buildSongLikePayload = (song = {}) => {
  const songId = song.videoId || song.id;

  return {
    songId,
    videoId: songId,
    title: song.title || 'Untitled Track',
    artist: song.artist || song.channelTitle || 'Unknown Artist',
    album: song.album || song.movie || '',
    thumbnail: song.thumbnail || song.cover || song.image || '',
    duration: Number(song.duration) || 0,
    source: song.source || 'youtube',
  };
};

export const normalizeDisplaySong = (song = {}) => {
  const id = song.videoId || song.id;

  return {
    ...song,
    id,
    videoId: id,
    title: song.title || 'Untitled Track',
    artist: song.artist || song.channelTitle || 'Unknown Artist',
    album: song.album || song.movie || 'Single',
    thumbnail: song.thumbnail || song.cover || song.image || '',
    cover: song.cover || song.thumbnail || song.image || '',
    duration: Number(song.duration) || 0,
    source: song.source || 'youtube',
    playable: song.playable !== false,
  };
};
