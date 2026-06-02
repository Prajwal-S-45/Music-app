import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
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

let ytApiPromise = null;

const loadYouTubeApi = () => {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (ytApiPromise) {
    return ytApiPromise;
  }

  ytApiPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.body.appendChild(script);

    const previousHandler = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousHandler === 'function') {
        previousHandler();
      }
      resolve(window.YT);
    };
  });

  return ytApiPromise;
};

const formatTime = (seconds) => {
  const value = Number(seconds) || 0;
  const mins = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function PlayerBar({ track, queue = [], isQueueOpen = false, isCompactLayout = false, onSelectTrack, onToggleQueue }) {
  const audioRef = useRef(null);
  const ytContainerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const nextTrackHandlerRef = useRef(null);
  const repeatRef = useRef(false);
  const progressTimerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  const activeTrackId = track?.videoId || track?.id;
  const isYouTubeTrack = Boolean(track?.videoId || (!track?.streamUrl && track?.source === 'youtube'));

  const currentIndex = useMemo(
    () => queue.findIndex((item) => (item.videoId || item.id) === activeTrackId),
    [queue, activeTrackId]
  );

  const progressPercent = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return Math.min(100, Math.max(0, (currentTime / duration) * 100));
  }, [currentTime, duration]);

  const progressStyle = useMemo(
    () => ({
      background: `linear-gradient(90deg, rgba(16,185,129,1) 0%, rgba(34,197,94,1) ${progressPercent}%, rgba(148,163,184,0.22) ${progressPercent}%, rgba(148,163,184,0.22) 100%)`,
    }),
    [progressPercent]
  );

  const stopProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const startProgressTimer = useCallback(() => {
    stopProgressTimer();

    progressTimerRef.current = window.setInterval(() => {
      if (isYouTubeTrack && ytPlayerRef.current) {
        setCurrentTime(ytPlayerRef.current.getCurrentTime?.() || 0);
        setDuration(ytPlayerRef.current.getDuration?.() || 0);
      }

      if (!isYouTubeTrack && audioRef.current) {
        setCurrentTime(audioRef.current.currentTime || 0);
        setDuration(audioRef.current.duration || 0);
      }
    }, 1000);
  }, [isYouTubeTrack, stopProgressTimer]);

  const goToTrack = useCallback(
    (nextIndex) => {
      if (!queue.length || nextIndex < 0 || nextIndex >= queue.length) {
        return;
      }

      onSelectTrack?.({ ...queue[nextIndex], shouldAutoPlay: true });
    },
    [onSelectTrack, queue]
  );

  const handleNext = useCallback(() => {
    if (!queue.length) return;

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      goToTrack(randomIndex);
      return;
    }

    const nextIndex = currentIndex >= 0 && currentIndex < queue.length - 1 ? currentIndex + 1 : 0;
    goToTrack(nextIndex);
  }, [currentIndex, goToTrack, isShuffle, queue]);

  const handlePrevious = useCallback(() => {
    if (!queue.length) return;
    const nextIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    goToTrack(nextIndex);
  }, [currentIndex, goToTrack, queue]);

  useEffect(() => {
    nextTrackHandlerRef.current = handleNext;
  }, [handleNext]);

  useEffect(() => {
    repeatRef.current = isRepeat;
  }, [isRepeat]);

  useEffect(() => {
    return () => {
      stopProgressTimer();
      if (ytPlayerRef.current?.destroy) {
        ytPlayerRef.current.destroy();
      }
    };
  }, [stopProgressTimer]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || isYouTubeTrack || !track?.streamUrl) {
      return;
    }

    audio.src = track.streamUrl;
    audio.load();
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    if (track?.shouldAutoPlay) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [isYouTubeTrack, track?.streamUrl, track?.id]);

  useEffect(() => {
    const videoId = track?.videoId || null;

    if (!isYouTubeTrack || !videoId || !ytContainerRef.current) {
      return;
    }

    let mounted = true;

    const setupPlayer = async () => {
      try {
        const YT = await loadYouTubeApi();
        if (!mounted || !ytContainerRef.current) {
          return;
        }

        if (!ytPlayerRef.current) {
          const appOrigin = window.location.origin;
          ytPlayerRef.current = new YT.Player(ytContainerRef.current, {
            host: 'https://www.youtube.com',
            width: '1',
            height: '1',
            videoId,
            playerVars: {
              autoplay: 0,
              controls: 0,
              rel: 0,
              modestbranding: 1,
              enablejsapi: 1,
              origin: appOrigin,
            },
            events: {
              onReady: () => {
                ytPlayerRef.current?.setVolume?.(Math.round(volume * 100));
                setDuration(ytPlayerRef.current?.getDuration?.() || 0);
              },
              onStateChange: (event) => {
                const state = event?.data;
                if (state === YT.PlayerState.PLAYING) {
                  setIsPlaying(true);
                  startProgressTimer();
                } else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.BUFFERING) {
                  setIsPlaying(false);
                } else if (state === YT.PlayerState.ENDED) {
                  setIsPlaying(false);
                  stopProgressTimer();
                  if (repeatRef.current && ytPlayerRef.current) {
                    ytPlayerRef.current.seekTo(0, true);
                    ytPlayerRef.current.playVideo();
                  } else {
                    nextTrackHandlerRef.current?.();
                  }
                }
              },
            },
          });
        } else if (track?.shouldAutoPlay) {
          ytPlayerRef.current.loadVideoById(videoId);
        } else {
          ytPlayerRef.current.cueVideoById(videoId);
        }

        if (track?.shouldAutoPlay) {
          ytPlayerRef.current.playVideo?.();
        }
      } catch {
        setIsPlaying(false);
      }
    };

    setCurrentTime(0);
    setDuration(0);
    setupPlayer();

    return () => {
      mounted = false;
    };
  }, [isYouTubeTrack, track?.videoId, track?.shouldAutoPlay, volume, startProgressTimer, stopProgressTimer]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }

    if (ytPlayerRef.current?.setVolume) {
      ytPlayerRef.current.setVolume(Math.round(volume * 100));
    }
  }, [volume]);

  const handleTogglePlay = async () => {
    if (isYouTubeTrack && ytPlayerRef.current) {
      const playerState = ytPlayerRef.current.getPlayerState?.();
      if (playerState === window.YT?.PlayerState?.PLAYING) {
        ytPlayerRef.current.pauseVideo?.();
        setIsPlaying(false);
      } else {
        ytPlayerRef.current.playVideo?.();
        setIsPlaying(true);
      }
      return;
    }

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

  const handleSeek = (event) => {
    const nextTime = Number(event.target.value);
    setCurrentTime(nextTime);

    if (isYouTubeTrack && ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(nextTime, true);
      return;
    }

    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
    }
  };

  const handleAudioEnded = () => {
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }

    handleNext();
  };

  return (
    <>
      <div ref={ytContainerRef} style={{ width: 1, height: 1, position: 'absolute', left: -9999, top: -9999 }} />

      <audio
        ref={audioRef}
        preload="auto"
        crossOrigin="anonymous"
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onDurationChange={() => setDuration(audioRef.current?.duration || 0)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onEnded={handleAudioEnded}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="player-bar"
      >
        <div className="player-bar__ambient player-bar__ambient--left" />
        <div className="player-bar__ambient player-bar__ambient--right" />

        <div className="player-bar__track">
          <div className="player-bar__art-shell">
            <img
              src={track?.cover || track?.image || track?.thumbnail || FALLBACK_IMAGE}
              alt={track?.title || 'Now playing'}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = FALLBACK_IMAGE;
              }}
            />
            <div className="player-bar__art-glow" />
          </div>

          <div className="player-bar__meta">
            <span className="player-bar__eyebrow">Now playing</span>
            <strong>{track?.title || 'Select a track'}</strong>
            <p>{track?.artist || track?.channelTitle || 'Premium audio experience'}</p>
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`player-bar__like ${isLiked ? 'active' : ''}`}
            onClick={() => setIsLiked((value) => !value)}
            aria-label={isLiked ? 'Unlike song' : 'Like song'}
          >
            <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
          </motion.button>
        </div>

        <div className="player-bar__center">
          <div className="player-bar__controls">
            <motion.button type="button" whileHover={{ y: -1, scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setIsShuffle((value) => !value)} className={isShuffle ? 'active' : ''}>
              <Shuffle size={16} />
            </motion.button>
            <motion.button type="button" whileHover={{ y: -1, scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handlePrevious}>
              <SkipBack size={18} />
            </motion.button>
            <motion.button type="button" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} className="player-bar__play" onClick={handleTogglePlay}>
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </motion.button>
            <motion.button type="button" whileHover={{ y: -1, scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleNext}>
              <SkipForward size={18} />
            </motion.button>
            <motion.button type="button" whileHover={{ y: -1, scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setIsRepeat((value) => !value)} className={isRepeat ? 'active' : ''}>
              <Repeat size={16} />
            </motion.button>
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
              style={progressStyle}
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
          <motion.button
            type="button"
            whileHover={{ y: -1, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            aria-label="Toggle queue"
            aria-controls="app-queue"
            aria-expanded={isQueueOpen}
            aria-pressed={isQueueOpen}
            onClick={onToggleQueue}
          >
            <ListMusic size={16} />
          </motion.button>
          <motion.button type="button" whileHover={{ y: -1, scale: 1.04 }} whileTap={{ scale: 0.96 }} aria-label="Expand player">
            <Expand size={16} />
          </motion.button>
        </div>
      </motion.footer>
    </>
  );
}

export default PlayerBar;
