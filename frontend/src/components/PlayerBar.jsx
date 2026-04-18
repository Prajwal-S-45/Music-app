import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Expand,
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

const formatTime = (seconds) => {
  const value = Number(seconds) || 0;
  const mins = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function PlayerBar({ track, queue = [], onSelectTrack, onToggleQueue }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  const currentIndex = useMemo(() => queue.findIndex((item) => item.id === track?.id), [queue, track?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track?.streamUrl) {
      return;
    }

    audio.src = track.streamUrl;
    audio.load();
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, [track?.streamUrl, track?.id]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleTogglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !track?.streamUrl) {
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
    } catch {
      setIsPlaying(false);
    }
  };

  const goToTrack = (nextIndex) => {
    if (!queue.length || nextIndex < 0 || nextIndex >= queue.length) {
      return;
    }

    onSelectTrack?.(queue[nextIndex]);
  };

  const handlePrevious = () => {
    if (!queue.length) return;
    const nextIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    goToTrack(nextIndex);
  };

  const handleNext = () => {
    if (!queue.length) return;

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      goToTrack(randomIndex);
      return;
    }

    const nextIndex = currentIndex >= 0 && currentIndex < queue.length - 1 ? currentIndex + 1 : 0;
    goToTrack(nextIndex);
  };

  const handleSeek = (event) => {
    const nextTime = Number(event.target.value);
    setCurrentTime(nextTime);
    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
    }
  };

  const handleEnded = () => {
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }

    handleNext();
  };

  return (
    <>
      <audio
        ref={audioRef}
        preload="auto"
        crossOrigin="anonymous"
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onDurationChange={() => setDuration(audioRef.current?.duration || 0)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onEnded={handleEnded}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      <footer className="player-bar">
        <div className="player-bar__track">
          <img
            src={track?.cover || track?.image || FALLBACK_IMAGE}
            alt={track?.title || 'Now playing'}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = FALLBACK_IMAGE;
            }}
          />
          <div>
            <strong>{track?.title || 'Select a track'}</strong>
            <span>{track?.artist || 'Now Playing'}</span>
          </div>
          <button
            type="button"
            className={`player-bar__like ${isLiked ? 'active' : ''}`}
            onClick={() => setIsLiked((value) => !value)}
            aria-label={isLiked ? 'Unlike song' : 'Like song'}
          >
            <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="player-bar__center">
          <div className="player-bar__controls">
            <button type="button" onClick={() => setIsShuffle((value) => !value)} className={isShuffle ? 'active' : ''}>
              <Shuffle size={16} />
            </button>
            <button type="button" onClick={handlePrevious}>
              <SkipBack size={18} />
            </button>
            <button type="button" className="player-bar__play" onClick={handleTogglePlay}>
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button type="button" onClick={handleNext}>
              <SkipForward size={18} />
            </button>
            <button type="button" onClick={() => setIsRepeat((value) => !value)} className={isRepeat ? 'active' : ''}>
              <Repeat size={16} />
            </button>
          </div>

          <div className="player-bar__progress">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={Math.max(duration, 1)}
              step="1"
              value={Math.min(currentTime, Math.max(duration, 1))}
              onChange={handleSeek}
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="player-bar__right">
          <div className="player-bar__volume">
            <Volume2 size={16} />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
            />
          </div>
          <button type="button" aria-label="Toggle queue" onClick={onToggleQueue}>
            <ListMusic size={16} />
          </button>
          <button type="button" aria-label="Expand player">
            <Expand size={16} />
          </button>
        </div>
      </footer>
    </>
  );
}

export default PlayerBar;