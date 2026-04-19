const STORAGE_KEY = 'music_app_saved_queues_v1';

const normalizeSong = (song) => ({
  id: String(song?.videoId || song?.id || ''),
  videoId: String(song?.videoId || song?.id || ''),
  title: song?.title || 'Untitled Track',
  artist: song?.artist || song?.channelTitle || song?.subtitle || 'Unknown Artist',
  cover: song?.cover || song?.thumbnail || song?.image || '',
  image: song?.image || song?.cover || '',
  streamUrl: song?.streamUrl || '',
  duration: Number(song?.duration) || 0,
  source: song?.source || 'youtube',
  subtitle: song?.subtitle || song?.artist || '',
});

const readSavedQueues = () => {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

const writeSavedQueues = (queues) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queues));
  window.dispatchEvent(new CustomEvent('savedQueuesUpdated'));
};

export const getSavedQueues = () => {
  const queues = readSavedQueues();
  return queues.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
};

export const getSavedQueueById = (queueId) => {
  const queues = readSavedQueues();
  return queues.find((queue) => queue.id === queueId) || null;
};

export const saveQueueToLibrary = ({ name = 'Saved Queue', songs = [] }) => {
  const uniqueSongs = songs
    .filter((song) => song?.id)
    .map(normalizeSong)
    .filter((song, index, list) => list.findIndex((item) => item.id === song.id) === index);

  if (uniqueSongs.length === 0) {
    throw new Error('Queue is empty');
  }

  const now = Date.now();
  const queueId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `saved-queue-${now}-${Math.random().toString(36).slice(2, 8)}`;

  const nextQueue = {
    id: queueId,
    name: name.trim() || 'Saved Queue',
    songs: uniqueSongs,
    songCount: uniqueSongs.length,
    cover: uniqueSongs[0]?.cover || uniqueSongs[0]?.image || '',
    createdAt: now,
  };

  const currentQueues = readSavedQueues();
  writeSavedQueues([nextQueue, ...currentQueues]);

  return nextQueue;
};

export const deleteSavedQueue = (queueId) => {
  const currentQueues = readSavedQueues();
  const filteredQueues = currentQueues.filter((queue) => queue.id !== queueId);
  writeSavedQueues(filteredQueues);
};

export const renameSavedQueue = (queueId, nextName) => {
  const name = String(nextName || '').trim();
  if (!name) {
    throw new Error('Queue name is required');
  }

  const currentQueues = readSavedQueues();
  const renamedQueues = currentQueues.map((queue) =>
    queue.id === queueId ? { ...queue, name, updatedAt: Date.now() } : queue
  );
  writeSavedQueues(renamedQueues);
};
