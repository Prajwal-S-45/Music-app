import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Cast,
  X,
  Share2,
  PlusCircle,
  ArrowDown,
  Trash2,
  Bookmark,
  GripVertical,
  Music,
  MoreHorizontal,
  Check,
} from 'lucide-react';
import apiClient from '../api/client';
import { buildSongLikePayload } from '../utils/songPayload';
import NowPlayingScreen from './NowPlayingScreen';
import { saveQueueToLibrary } from '../utils/savedQueues';
import '../styles/MobilePlayerFullscreen.css';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

import { cleanSongTitle, getSongMetadata, extractMovieOrAlbum } from '../utils/songMetadata';

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

const getMockLyrics = (title) => {
  const cleanTitle = String(title || '').toLowerCase();
  if (cleanTitle.includes('humnava')) {
    return [
      'Humnava mere, humnava mere',
      'Tu hai toh meri saansein chale',
      'Bata de kaise main jeeyun tere bina',
      'Meri ab sab se hai anban'
    ];
  }
  if (cleanTitle.includes('dilbar')) {
    return [
      'Dilbar dilbar...',
      'Dilbar dilbar...',
      'Haan tera hi deewaana hoon',
      'Tere liye hi marta hoon'
    ];
  }
  if (cleanTitle.includes('khairiyat')) {
    return [
      'Khairiyat poocho, kabhi toh kaifiyat poocho',
      'Tumhare bin deewane ka kya haal hai',
      'Dil mera dekho, na meri haisiyat poocho',
      'Tere bin ek din jaise sau saal hai'
    ];
  }
  return [
    'Enjoying the rhythm and the flow...',
    'Instrumental section playing...',
    'Feel the music surround you...',
    'Lyrics not available for this track.'
  ];
};

function PlayerBar({
  track,
  queue = [],
  isQueueOpen = false,
  isCompactLayout = false,
  token,
  onSelectTrack,
  onToggleQueue,
  onLikeUpdate,
  onRemoveQueueItem,
  onClearQueue,
}) {
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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showMobileQueue, setShowMobileQueue] = useState(false);
  const [mobileQueueTab, setMobileQueueTab] = useState('UP NEXT'); // 'UP NEXT' or 'LYRICS'

  const activeTrackId = track?.videoId || track?.id;
  const isYouTubeTrack = Boolean(track?.videoId || (!track?.streamUrl && track?.source === 'youtube'));

  const resolvedAlbumName = useMemo(() => {
    if (!track) return 'Single';
    const artistName = track.artist || track.channelTitle || 'Unknown Artist';
    const meta = getSongMetadata(track.title, artistName, track.description);
    return extractMovieOrAlbum(track.title, artistName, track.album, track.movie, meta?.album);
  }, [track]);


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

  useEffect(() => {
    let active = true;
    setIsLiked(false);
    if (!activeTrackId || !token) return;

    apiClient
      .get('/api/music/liked', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!active) return;
        const likedList = res.data?.data || [];
        const found = likedList.some(
          (song) => String(song.song_id).trim() === String(activeTrackId).trim()
        );
        setIsLiked(found);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [activeTrackId, token]);
  const handleLikeCurrentTrack = useCallback(async () => {
    if (!track || !activeTrackId || !token) {
      return;
    }

    if (isLiked) {
      setIsLiked(false);
      try {
        await apiClient.delete(
          `/api/music/like/${encodeURIComponent(activeTrackId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        onLikeUpdate?.();
      } catch (error) {
        setIsLiked(true);
      }
    } else {
      setIsLiked(true);
      try {
        await apiClient.post(
          '/api/music/like',
          buildSongLikePayload(track),
          { headers: { Authorization: `Bearer ${token}` } }
        );
        onLikeUpdate?.();
      } catch (error) {
        if (error.response?.status !== 400) {
          setIsLiked(false);
        }
      }
    }
  }, [activeTrackId, isLiked, onLikeUpdate, token, track]);

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
  }, [isYouTubeTrack, track?.streamUrl, track?.id, track?.requestId, track?.shouldAutoPlay]);

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

          const playerNode = document.createElement('div');
          ytContainerRef.current.innerHTML = '';
          ytContainerRef.current.appendChild(playerNode);

          ytPlayerRef.current = new YT.Player(playerNode, {
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
                } else if (state === YT.PlayerState.PAUSED) {
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
  }, [isYouTubeTrack, track?.videoId, track?.requestId, track?.shouldAutoPlay, volume, startProgressTimer, stopProgressTimer]);

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

  const handleSeekTime = useCallback((nextTime) => {
    const timeVal = Number(nextTime) || 0;
    setCurrentTime(timeVal);

    if (isYouTubeTrack && ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(timeVal, true);
      return;
    }

    if (audioRef.current) {
      audioRef.current.currentTime = timeVal;
    }
  }, [isYouTubeTrack]);

  const handleSeek = (event) => {
    handleSeekTime(Number(event.target.value));
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
      <div id="yt-player-container" ref={ytContainerRef} style={{ display: 'none' }}></div>

      {track?.streamUrl && !isYouTubeTrack && (
        <audio
          ref={audioRef}
          src={track.streamUrl}
          autoPlay
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
          onDurationChange={() => setDuration(audioRef.current?.duration || 0)}
          onEnded={handleNext}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      )}

      {/* Full Screen Player Overlay */}
      {isFullScreen && track && (
        !isCompactLayout && window.innerWidth > 768 ? (
          <NowPlayingScreen
            track={track}
            queue={queue}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            isLiked={isLiked}
            isShuffle={isShuffle}
            isRepeat={isRepeat}
            lyrics={getMockLyrics(track?.title)}
            onClose={() => setIsFullScreen(false)}
            onTogglePlay={handleTogglePlay}
            onSeek={handleSeekTime}
            onSetVolume={setVolume}
            onLikeToggle={handleLikeCurrentTrack}
            onSelectTrack={onSelectTrack}
            onRemoveQueueItem={onRemoveQueueItem}
            onClearQueue={onClearQueue}
            onShuffleToggle={() => setIsShuffle(!isShuffle)}
            onRepeatToggle={() => setIsRepeat(!isRepeat)}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        ) : (
          <motion.div
            className="player-fullscreen-mobile"
            onPanEnd={(event, info) => {
              // Swipe down (up to down) -> close fullscreen player
              if (info.offset.y > 80 && Math.abs(info.velocity.y) > 150) {
                setIsFullScreen(false);
              }
              // Swipe up (down to up) -> show queue drawer
              else if (info.offset.y < -80 && Math.abs(info.velocity.y) > 150) {
                setMobileQueueTab('UP NEXT');
                setShowMobileQueue(true);
              }
            }}
          >
            {/* Ambient backgrounds */}
            <div
              className="player-fullscreen-ambient-bg"
              style={{
                backgroundImage: `url(${track?.cover || track?.image || track?.thumbnail || FALLBACK_IMAGE})`
              }}
            />
            <div className="player-fullscreen-ambient-overlay" />

            {/* Header */}
            <div className="player-fullscreen-header">
              <button className="player-fullscreen-btn" onClick={() => setIsFullScreen(false)}>
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="player-fullscreen-playlist">
                <span>PLAYING FROM ALBUM</span>
                <h3>{resolvedAlbumName}</h3>
              </div>
              <button className="player-fullscreen-btn">
                <MoreHorizontal size={24} />
              </button>
            </div>

            {/* Artwork */}
            <div className="player-fullscreen-art">
              <img src={track.thumbnail || track.cover || track.image || FALLBACK_IMAGE} alt="Album Art" />
            </div>

            {/* Track Info */}
            <div className="player-fullscreen-info-wrapper">
              <div className="player-fullscreen-info">
                <div className="player-fullscreen-title">
                  <h2>{cleanSongTitle(track.title)}</h2>
                  <p>{track.artist || track.channelTitle || 'Unknown Artist'}</p>
                </div>
                <div className="player-fullscreen-actions-right">
                  <button className={`player-fullscreen-like ${isLiked ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); handleLikeCurrentTrack(); }}>
                    <Heart size={24} fill={isLiked ? 'currentColor' : 'none'} stroke={isLiked ? 'none' : 'currentColor'} />
                  </button>
                  <button className="player-fullscreen-share">
                    <Share2 size={22} />
                  </button>
                </div>
              </div>
            </div>

            {/* Progress Slider */}
            <div className="player-fullscreen-progress">
              <input
                type="range"
                min="0"
                max={Math.max(duration, 1)}
                step="1"
                value={Math.min(currentTime, Math.max(duration, 1))}
                onChange={handleSeek}
                style={progressStyle}
              />
              <div className="player-fullscreen-time">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="player-fullscreen-controls">
              <button className={`player-control-icon ${isShuffle ? 'active' : ''}`} onClick={() => setIsShuffle(!isShuffle)}>
                <Shuffle size={20} />
              </button>
              <button className="player-control-icon" onClick={handlePrevious}>
                <SkipBack size={32} fill="currentColor" />
              </button>
              <button className="player-control-play" onClick={handleTogglePlay}>
                {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="play-icon-offset" />}
              </button>
              <button className="player-control-icon" onClick={handleNext}>
                <SkipForward size={32} fill="currentColor" />
              </button>
              <button className={`player-control-icon ${isRepeat ? 'active' : ''}`} onClick={() => setIsRepeat(!isRepeat)}>
                <Repeat size={20} />
              </button>
            </div>

            {/* Secondary Action buttons */}
            <div className="player-fullscreen-secondary">
              <button className="player-secondary-btn" onClick={() => { setMobileQueueTab('LYRICS'); setShowMobileQueue(true); }}>
                <Music size={20} />
                <span>Lyrics</span>
              </button>
              <button className="player-secondary-btn">
                <ArrowDown size={20} />
                <span>Download</span>
              </button>
              <button className="player-secondary-btn">
                <PlusCircle size={20} />
                <span>Add to Playlist</span>
              </button>
              <button className="player-secondary-btn">
                <MoreHorizontal size={20} />
                <span>More</span>
              </button>
            </div>

            {/* Bottom device and queue selectors */}
            <div className="player-fullscreen-bottom">
              <div className="player-fullscreen-device">
                <Cast size={18} />
                <span>JBL Tune 770NC</span>
              </div>
              <button className="player-fullscreen-btn" onClick={() => { setMobileQueueTab('UP NEXT'); setShowMobileQueue(true); }}>
                <ListMusic size={24} />
              </button>
            </div>

            {/* Slide-up Queue / Lyrics drawer */}
            <AnimatePresence>
              {showMobileQueue && (
                <motion.div
                  className="mobile-queue-drawer"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                  onPanEnd={(event, info) => {
                    // Swipe down (up to down) on queue drawer -> close it and reveal player
                    if (info.offset.y > 80 && Math.abs(info.velocity.y) > 150) {
                      setShowMobileQueue(false);
                    }
                  }}
                >
                  <div className="mobile-queue-drag-handle" />

                  <div className="mobile-queue-header">
                    <div className="mobile-queue-title-group">
                      <h3 className="mobile-queue-title">Queue</h3>
                      <span className="mobile-queue-meta">
                        {queue.length} {queue.length === 1 ? 'Song' : 'Songs'} &bull; {Math.round(queue.reduce((acc, song) => acc + (Number(song.duration) || 0), 0) / 60)} mins
                      </span>
                    </div>
                    <button className="mobile-queue-close" onClick={() => setShowMobileQueue(false)}>
                      <X size={24} />
                    </button>
                  </div>

                  <div className="mobile-queue-tabs">
                    <button
                      className={`mobile-queue-tab ${mobileQueueTab === 'UP NEXT' ? 'active' : ''}`}
                      onClick={() => setMobileQueueTab('UP NEXT')}
                    >
                      UP NEXT
                    </button>
                    <button
                      className={`mobile-queue-tab ${mobileQueueTab === 'LYRICS' ? 'active' : ''}`}
                      onClick={() => setMobileQueueTab('LYRICS')}
                    >
                      LYRICS
                    </button>
                  </div>

                  <div className="mobile-queue-content">
                    {mobileQueueTab === 'UP NEXT' ? (
                      queue.length === 0 ? (
                        <div className="mobile-queue-empty">
                          <Music size={40} />
                          <p>No songs in queue.</p>
                        </div>
                      ) : (
                        queue.map((item, index) => {
                          const isTrackActive = (item.videoId || item.id) === activeTrackId;
                          return (
                            <div
                              key={item.queueItemId || item.id || index}
                              className={`mobile-queue-item ${isTrackActive ? 'active' : ''}`}
                              onClick={() => onSelectTrack?.(item)}
                            >
                              {isTrackActive ? (
                                <div className="mobile-queue-playing-icon">
                                  {isPlaying ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                      <rect x="3" y="4" width="4" height="16" />
                                      <rect x="10" y="4" width="4" height="16" />
                                      <rect x="17" y="4" width="4" height="16" />
                                    </svg>
                                  ) : (
                                    <Play size={14} fill="currentColor" />
                                  )}
                                </div>
                              ) : (
                                <span className="mobile-queue-index">{index + 1}</span>
                              )}
                              <img
                                className="mobile-queue-cover"
                                src={item.cover || item.image || item.thumbnail || FALLBACK_IMAGE}
                                alt={item.title}
                                onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                              />
                              <div className="mobile-queue-details">
                                {isTrackActive && <span className="mobile-queue-nowplaying-badge">Now Playing</span>}
                                <p className="mobile-queue-song-title">{cleanSongTitle(item.title)}</p>
                                <p className="mobile-queue-song-artist">{item.artist || item.channelTitle || 'Unknown Artist'}</p>
                              </div>
                              {item.duration && (
                                <span className="mobile-queue-duration">{formatTime(item.duration)}</span>
                              )}
                              <div className="mobile-queue-reorder" onClick={(e) => e.stopPropagation()}>
                                <GripVertical size={16} />
                              </div>
                            </div>
                          );
                        })
                      )
                    ) : (
                      <div className="mobile-lyrics-container">
                        {getMockLyrics(track?.title).map((line, idx) => (
                          <p key={idx} className={`mobile-lyrics-line ${idx === 0 ? 'active' : ''}`}>
                            {line}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Actions for UP NEXT */}
                  {mobileQueueTab === 'UP NEXT' && (
                    <div className="mobile-queue-footer-actions">
                      <button
                        className="mobile-queue-action-btn clear"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Are you sure you want to clear the queue?")) {
                            onClearQueue?.();
                          }
                        }}
                      >
                        <Trash2 size={16} />
                        <span>Clear Queue</span>
                      </button>
                      <button
                        className="mobile-queue-action-btn save"
                        onClick={(e) => {
                          e.stopPropagation();
                          const suggestedName = 'Saved Queue';
                          const customName = window.prompt('Enter playlist name', suggestedName);
                          if (customName) {
                            try {
                              saveQueueToLibrary({ name: customName.trim(), songs: queue });
                              alert("Queue saved to Library!");
                            } catch (err) {
                              alert(err?.message || "Failed to save queue");
                            }
                          }
                        }}
                      >
                        <Bookmark size={16} />
                        <span>Save Queue</span>
                      </button>
                    </div>
                  )}

                  {/* Spotify style floating mini player at bottom of queue drawer */}
                  <div className="mobile-queue-miniplayer" onClick={() => setShowMobileQueue(false)}>
                    <div className="mobile-queue-miniplayer-left">
                      <img
                        className="mobile-queue-miniplayer-cover"
                        src={track?.cover || track?.image || track?.thumbnail || FALLBACK_IMAGE}
                        alt={track?.title}
                      />
                      <div className="mobile-queue-miniplayer-info">
                        <p className="mobile-queue-miniplayer-title">{cleanSongTitle(track?.title)}</p>
                        <p className="mobile-queue-miniplayer-artist">{track?.artist || track?.channelTitle || 'Unknown Artist'}</p>
                      </div>
                    </div>
                    <div className="mobile-queue-miniplayer-right">
                      <button
                        className="mobile-queue-miniplayer-btn"
                        onClick={(e) => { e.stopPropagation(); handleTogglePlay(); }}
                      >
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                      </button>
                      <button
                        className="mobile-queue-miniplayer-btn"
                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                      >
                        <SkipForward size={20} fill="currentColor" />
                      </button>
                    </div>
                    <div
                      className="mobile-queue-miniplayer-progress"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      )}



      <motion.footer
        className="player-bar-wrapper"
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 200 }}
      >
        <div className="player-bar">
          <div className="player-bar__body">
            {/* LEFT SECTION: Track Info */}
            <div className="player-bar__left" onClick={() => track && setIsFullScreen(true)}>
              <div className="player-bar__art-wrap">
                <motion.img
                  animate={isPlaying ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                  transition={{ duration: 2, repeat: Infinity }}
                  src={track?.cover || track?.image || track?.thumbnail || FALLBACK_IMAGE}
                  alt={track?.title}
                  onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                />
                {isPlaying && (
                  <div className="player-bar__playback-indicator">
                    <div className="bar" />
                    <div className="bar" />
                    <div className="bar" />
                  </div>
                )}
              </div>

              <div className="player-bar__info">
                <div className="player-bar__song-row">
                  <strong className="song-name" title={track?.title}>
                    {cleanSongTitle(track?.title) || 'Not Playing'}
                  </strong>
                  <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    className={`player-bar__heart ${isLiked ? 'active' : ''}`}
                    onClick={handleLikeCurrentTrack}
                    disabled={!track || !token}
                    aria-label={isLiked ? 'Track liked' : 'Like current track'}
                  >
                    <Heart size={16} fill={isLiked ? 'var(--accent)' : 'none'} />
                  </motion.button>
                </div>
                <span className="album-name" title={resolvedAlbumName}>
                  {resolvedAlbumName}
                </span>
                <span className="artist-name" title={track?.artist}>
                  {track?.artist || track?.channelTitle || 'Unknown Artist'}
                </span>
              </div>
            </div>

            {/* CENTER SECTION: Controls & Progress */}
            <div className="player-bar__center">
              <div className="player-bar__controls">
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  className={`player-bar__btn-ghost ${isShuffle ? 'active' : ''}`}
                  onClick={() => setIsShuffle(!isShuffle)}
                >
                  <Shuffle size={16} />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.15 }}
                  className="player-bar__btn-ghost"
                  onClick={handlePrevious}
                >
                  <SkipBack size={20} />
                </motion.button>

                <button className="mobile-only-icon" aria-label="Cast to device" type="button" style={{ color: '#a7a7a7' }}>
                  <Cast size={20} />
                </button>

                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  className="player-bar__btn-play"
                  onClick={handleTogglePlay}
                >
                  {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="play-icon-offset" />}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.15 }}
                  className="player-bar__btn-ghost"
                  onClick={handleNext}
                >
                  <SkipForward size={20} />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.15 }}
                  className={`player-bar__btn-ghost ${isRepeat ? 'active' : ''}`}
                  onClick={() => setIsRepeat(!isRepeat)}
                >
                  <Repeat size={16} />
                </motion.button>
              </div>

              <div className="player-bar__progress-container">
                <span className="time-label">{formatTime(currentTime)}</span>
                <div className="player-bar__progress-rail">
                  <input
                    type="range"
                    min="0"
                    max={Math.max(duration, 1)}
                    step="1"
                    value={Math.min(currentTime, Math.max(duration, 1))}
                    onChange={handleSeek}
                    style={progressStyle}
                  />
                </div>
                <span className="time-label">{formatTime(duration)}</span>
              </div>
            </div>

            {/* RIGHT SECTION: Utils */}
            <div className="player-bar__right">
              <div className="player-bar__volume-group">
                <Volume2 size={18} className="vol-icon" />
                <div className="volume-slider-container">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.08)' }}
                className={`player-bar__btn-util ${isQueueOpen ? 'active' : ''}`}
                onClick={() => onToggleQueue?.()}
              >
                <ListMusic size={18} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.08)' }}
                className="player-bar__btn-util"
                onClick={() => track && setIsFullScreen(true)}
                title="Expand to Full Screen"
              >
                <Expand size={18} />
              </motion.button>
          </div>
          </div>
        </div>
      </motion.footer>
    </>
  );
}

export default PlayerBar;

