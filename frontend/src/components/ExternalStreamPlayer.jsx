import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import apiClient from '../api/client';
import '../styles/components/ExternalStreamPlayer.css';

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80';

const normalizeSong = (song) => {
  if (!song) {
    return null;
  }

  return {
    id: song.id || `${song.title || 'track'}-${song.artist || 'unknown'}`,
    title: song.title || song.name || 'Unknown Title',
    artist: song.artist || song.artist_name || 'Unknown Artist',
    cover: song.cover || song.image || song.album_image || FALLBACK_COVER,
    streamUrl: song.streamUrl || song.file_url || song.audio || '',
  };
};

const toSongList = (payload) => {
  if (Array.isArray(payload?.data)) {
    return payload.data.map(normalizeSong).filter(Boolean);
  }

  if (Array.isArray(payload)) {
    return payload.map(normalizeSong).filter(Boolean);
  }

  if (payload && typeof payload === 'object') {
    const single = normalizeSong(payload);
    return single ? [single] : [];
  }

  return [];
};

function ExternalStreamPlayer({
  apiEndpoint = '/api/music/trending?limit=10',
  autoPlay = false,
}) {
  const audioRef = useRef(null);
  const [songs, setSongs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentSong = useMemo(() => songs[currentIndex] || null, [songs, currentIndex]);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setLoading(true);
        setError('');

        const response = apiEndpoint.startsWith('http')
          ? await axios.get(apiEndpoint)
          : await apiClient.get(apiEndpoint);

        const parsedSongs = toSongList(response.data);

        if (parsedSongs.length === 0) {
          setError('No streamable songs available.');
          setSongs([]);
          return;
        }

        setSongs(parsedSongs);
      } catch (requestError) {
        setError('Could not load songs from API.');
        setSongs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSongs();
  }, [apiEndpoint]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong?.streamUrl) {
      return;
    }

    // Reloading the source explicitly helps avoid stale buffering states
    // when rapidly switching between external streaming URLs.
    audio.src = currentSong.streamUrl;
    audio.load();

    if (autoPlay || isPlaying) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setIsPlaying(false);
        });
    }
  }, [currentSong?.id, currentSong?.streamUrl, autoPlay]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || !currentSong?.streamUrl) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch (playError) {
      setError('Playback blocked by browser. Click play again.');
      setIsPlaying(false);
    }
  };

  const playNext = () => {
    if (songs.length === 0) {
      return;
    }

    setCurrentIndex((current) => (current + 1) % songs.length);
  };

  const playPrevious = () => {
    if (songs.length === 0) {
      return;
    }

    setCurrentIndex((current) => (current - 1 + songs.length) % songs.length);
  };

  return (
    <section className="external-stream-player">
      <h3>External Stream Player</h3>

      {loading ? <p className="state-msg">Loading songs...</p> : null}
      {error ? <p className="state-msg error">{error}</p> : null}

      {currentSong ? (
        <>
          <div className="song-card">
            <img src={currentSong.cover || FALLBACK_COVER} alt={currentSong.title} />
            <div className="song-meta">
              <h4>{currentSong.title}</h4>
              <p>{currentSong.artist}</p>
            </div>
          </div>

          <audio
            ref={audioRef}
            preload="auto"
            playsInline
            crossOrigin="anonymous"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onWaiting={() => setIsBuffering(true)}
            onCanPlay={() => setIsBuffering(false)}
            onCanPlayThrough={() => setIsBuffering(false)}
            onStalled={() => setIsBuffering(true)}
            onEnded={playNext}
          />

          <div className="controls">
            <button type="button" onClick={playPrevious}>Previous</button>
            <button type="button" onClick={togglePlayPause}>
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button type="button" onClick={playNext}>Next</button>
          </div>

          {isBuffering ? <p className="state-msg">Buffering stream...</p> : null}
        </>
      ) : null}
    </section>
  );
}

export default ExternalStreamPlayer;
