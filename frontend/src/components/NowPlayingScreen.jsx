import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, Search, Compass, TrendingUp, Disc, Library, Heart,
  Settings, Bell, Moon, Sun, ChevronRight, ChevronLeft, Mic2,
  Activity, ListMusic, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Volume2, VolumeX, Maximize2, Minimize2,
  Trash2, Plus, Check, Music, X
} from "lucide-react";
import { cleanSongTitle, getSongMetadata, extractMovieOrAlbum } from "../utils/songMetadata";
import { saveQueueToLibrary } from "../utils/savedQueues";
import "../styles/NowPlayingScreen.css";

// Try local copied asset first, with scenic sunset fallback
let localSunsetBg = null;
try {
  localSunsetBg = new URL("../assets/fullscreen_sunset_lake.jpg", import.meta.url).href;
} catch (e) {
  localSunsetBg = null;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80";

// Scenic warm sunset background matching the design mockup
const SCENIC_SUNSET_BG =
  localSunsetBg ||
  "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=2000&q=80";

function formatTime(totalSeconds) {
  if (isNaN(totalSeconds) || totalSeconds === null || totalSeconds === undefined) return "0:00";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function NowPlayingScreen({
  track,
  queue = [],
  isPlaying,
  currentTime = 0,
  duration = 0,
  volume = 0.8,
  isLiked = false,
  isShuffle = false,
  isRepeat = false,
  lyrics = [],
  onClose,
  onTogglePlay,
  onSeek,
  onSetVolume,
  onLikeToggle,
  onSelectTrack,
  onRemoveQueueItem,
  onClearQueue,
  onShuffleToggle,
  onRepeatToggle,
  onNext,
  onPrevious,
  onReorderQueue,
}) {
  const navigate = useNavigate();

  // Navigation and view states
  const [activeTab, setActiveTab] = useState("lyrics"); // 'lyrics' | 'visualizer' | 'queue'
  const [drawerTab, setDrawerTab] = useState("queue"); // 'queue' | 'related'
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);
  const [useScenicBg, setUseScenicBg] = useState(true);

  const scrubberRef = useRef(null);
  const lyricsContainerRef = useRef(null);

  // Esc key closes full screen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Clean metadata
  const rawTitle = track?.title || "Not Playing";
  const trackTitle = cleanSongTitle(rawTitle);
  const artistName = track?.artist || track?.channelTitle || "Unknown Artist";
  const coverUrl = track?.cover || track?.image || track?.thumbnail || FALLBACK_IMAGE;

  const meta = getSongMetadata(track?.title, artistName, track?.description);
  const albumName = extractMovieOrAlbum(rawTitle, artistName, track?.album, track?.movie, meta?.album) || "Original Motion Picture Soundtrack • 2022";

  // Derive song tags / mood pills
  const songTags = useMemo(() => {
    const tags = [];
    const tLower = (trackTitle + " " + artistName).toLowerCase();
    if (tLower.includes("kesariya") || tLower.includes("love") || tLower.includes("tum hi") || tLower.includes("raabta")) {
      tags.push("Romantic", "Bollywood", artistName.split(",")[0].trim());
    } else if (tLower.includes("remix") || tLower.includes("party") || tLower.includes("dance")) {
      tags.push("Party", "Dance", "High Energy");
    } else {
      tags.push("Melody", "Trending", artistName.split(",")[0].trim() || "Popular");
    }
    return tags.slice(0, 3);
  }, [trackTitle, artistName]);

  // Synchronized Lyrics dataset
  const parsedLyrics = useMemo(() => {
    // If real lyrics prop passed
    if (Array.isArray(lyrics) && lyrics.length > 0) {
      const step = duration > 0 ? duration / lyrics.length : 4;
      return lyrics.map((line, idx) => ({
        time: idx * step,
        text: typeof line === "string" ? line : line?.text || "",
      }));
    }

    const tLower = trackTitle.toLowerCase();
    // Default Kesariya lyrics matching the design mockup!
    if (tLower.includes("kesariya")) {
      return [
        { time: 6, text: "Mujhko itna bataye koi" },
        { time: 14, text: "Kaise tujhse dil na lagaye koi" },
        { time: 23, text: "Rabba ne tujhko banane mein" },
        { time: 31, text: "Kar di hai husn ki khaali tjori" },
        { time: 40, text: "Kaajal ki siyaahi se" },
        { time: 47, text: "Likhi hain tune jaane" },
        { time: 54, text: "Kitno ki love story" },
        { time: 64, text: "Kesariya tera ishq hai piya" },
        { time: 73, text: "Rang jaaun jo main haath lagaun" },
        { time: 82, text: "Din beete saara teri fikr mein" },
        { time: 92, text: "Rain saari teri khair manaun" },
      ];
    }

    // Default rich romantic / acoustic lyrics
    if (tLower.includes("tum hi ho")) {
      return [
        { time: 4, text: "Hum tere bin ab reh nahi sakte" },
        { time: 12, text: "Tere bina kya wajood mera" },
        { time: 20, text: "Tujhse juda gar ho jaayenge" },
        { time: 28, text: "Toh khud se hi ho jaayenge judaa" },
        { time: 36, text: "Kyunki tum hi ho, ab tum hi ho" },
        { time: 44, text: "Zindagi ab tum hi ho" },
      ];
    }

    // Fallback dynamic lyrics based on track metadata
    const estimatedLines = [
      `Listening to ${trackTitle}`,
      `Performed by ${artistName}`,
      "Feel the rhythm and the melody",
      "Let the music carry your soul",
      "Lost in the sound of twilight",
      "Every beat tells an untold story",
      "Golden skies and harmonious echoes",
      "Music that speaks when words cannot",
    ];
    const step = duration > 0 ? Math.max(4, duration / estimatedLines.length) : 6;
    return estimatedLines.map((line, i) => ({
      time: i * step,
      text: line,
    }));
  }, [lyrics, trackTitle, artistName, duration]);

  // Determine current active lyric index
  const activeLyricIndex = useMemo(() => {
    if (!parsedLyrics.length) return 0;
    let currentIdx = 0;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (currentTime >= parsedLyrics[i].time) {
        currentIdx = i;
      } else {
        break;
      }
    }
    return currentIdx;
  }, [currentTime, parsedLyrics]);

  // Auto-scroll lyrics container
  useEffect(() => {
    if (lyricsContainerRef.current) {
      const activeEl = lyricsContainerRef.current.querySelector(".fullscreen-lyric-line.active");
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeLyricIndex]);

  // Scrub progress
  const handleScrub = (e) => {
    const bar = scrubberRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  // Toggle Mute
  const handleToggleMute = () => {
    if (isMuted) {
      onSetVolume(previousVolume || 0.8);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      onSetVolume(0);
      setIsMuted(true);
    }
  };

  // Navigation handlers
  const handleNavClick = (path) => {
    onClose();
    navigate(path);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    onClose();
    navigate(`/search/songs?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  // Recommended tracks for Queue/Related if queue is short
  const mockRelatedTracks = useMemo(() => [
    { id: "rel-1", title: "Tum Hi Ho", artist: "Arijit Singh", duration: 265, cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80" },
    { id: "rel-2", title: "Channa Mereya", artist: "Arijit Singh", duration: 289, cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=300&q=80" },
    { id: "rel-3", title: "Raabta", artist: "Arijit Singh", duration: 248, cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80" },
    { id: "rel-4", title: "Agar Tum Saath Ho", artist: "Alka Yagnik, Arijit Singh", duration: 318, cover: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=300&q=80" },
    { id: "rel-5", title: "Jaan Ban Gaye", artist: "Vishal Mishra", duration: 272, cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=300&q=80" },
    { id: "rel-6", title: "Dil Se", artist: "Various Artists", duration: 252, cover: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?auto=format&fit=crop&w=300&q=80" },
    { id: "rel-7", title: "Ilahi", artist: "Arijit Singh", duration: 254, cover: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=300&q=80" }
  ], []);

  // Display queue items: real queue + mock fill if empty
  const displayQueue = queue.length > 0 ? queue : [
    { ...track, isCurrent: true },
    ...mockRelatedTracks
  ];

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fullscreen-player-root">
      {/* 1. Atmospheric Background Layer */}
      <div
        className="fullscreen-ambient-backdrop"
        style={{
          backgroundImage: useScenicBg
            ? `url(${SCENIC_SUNSET_BG})`
            : `url(${coverUrl})`,
        }}
      />
      <div className="fullscreen-backdrop-gradient" />

      {/* Main Stage Content Area */}
      <div className="fullscreen-main-area">
        {/* Top Header Row */}
        <header className="fullscreen-header-row">
          <div className="fullscreen-header-actions">
            <button
              className="fullscreen-icon-btn"
              onClick={() => setUseScenicBg(!useScenicBg)}
              title={useScenicBg ? "Switch to Album Art Backdrop" : "Switch to Sunset Wallpaper"}
            >
              <Moon size={18} />
            </button>
            <button className="fullscreen-icon-btn" title="Notifications">
              <Bell size={18} />
            </button>
            <div
              className="fullscreen-header-avatar"
              onClick={() => handleNavClick("/profile")}
              title="Profile"
            >
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                alt="Profile"
              />
            </div>
            <button
              className="fullscreen-icon-btn close-screen-btn"
              onClick={onClose}
              title="Exit Fullscreen (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Central Content Layout */}
        <div className="fullscreen-content-grid">
          {/* Stage Left: Hero Now Playing Info + Interactive View Toggle + Lyrics */}
          <section className="fullscreen-hero-stage">
            {/* Top Hero: Artwork + Song Details */}
            <div className="fullscreen-nowplaying-hero">
              <div className="fullscreen-artwork-card">
                <img src={coverUrl} alt={trackTitle} />
              </div>

              <div className="fullscreen-metadata-block">
                <span className="fullscreen-nowplaying-badge">NOW PLAYING</span>
                <div className="fullscreen-title-row">
                  <h1 className="fullscreen-song-title" title={trackTitle}>
                    {trackTitle}
                  </h1>
                  <button
                    className={`fullscreen-heart-btn ${isLiked ? "liked" : ""}`}
                    onClick={onLikeToggle}
                    title={isLiked ? "Remove from Liked Songs" : "Add to Liked Songs"}
                  >
                    <Heart size={24} fill={isLiked ? "#ef4444" : "none"} color={isLiked ? "#ef4444" : "#ffffff"} />
                  </button>
                </div>
                <p className="fullscreen-artist-name">{artistName}</p>
                <p className="fullscreen-album-name">{albumName}</p>

                {/* Genre & Vibe Badges */}
                <div className="fullscreen-tags-row">
                  {songTags.map((tag, idx) => (
                    <span key={idx} className="fullscreen-tag-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Middle Section: Vertical Tab Switcher + Dynamic Content */}
            <div className="fullscreen-middle-container">
              {/* Vertical Mode Switcher Buttons */}
              <div className="fullscreen-vertical-tabs">
                <button
                  className={`fullscreen-mode-pill ${activeTab === "lyrics" ? "active" : ""}`}
                  onClick={() => setActiveTab("lyrics")}
                  title="View Lyrics"
                >
                  <Mic2 size={16} />
                  <span>Lyrics</span>
                </button>

                <button
                  className={`fullscreen-mode-pill ${isDrawerOpen ? "active" : ""}`}
                  onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                  title="Toggle Queue Drawer"
                >
                  <ListMusic size={16} />
                  <span>Queue</span>
                </button>
              </div>

              {/* Center Content Stage: Lyrics */}
              <div className="fullscreen-stage-view">
                <div className="fullscreen-lyrics-scroll-box" ref={lyricsContainerRef}>
                  {parsedLyrics.map((line, idx) => {
                    const isActive = idx === activeLyricIndex;
                    const isPast = idx < activeLyricIndex;
                    return (
                      <div
                        key={idx}
                        className={`fullscreen-lyric-line ${isActive ? "active" : isPast ? "past" : "upcoming"}`}
                        onClick={() => onSeek && onSeek(line.time)}
                        title="Click to jump to line"
                      >
                        {isActive && <div className="fullscreen-lyric-indicator" />}
                        <span className="fullscreen-lyric-text">{line.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Right Floating Glassmorphic Queue Drawer */}
          <aside className={`fullscreen-queue-drawer ${isDrawerOpen ? "open" : "collapsed"}`}>
            <div className="fullscreen-drawer-glass">
              {/* Top Handle & Collapse Button */}
              <div className="fullscreen-drawer-topbar">
                <div className="fullscreen-drawer-handle" />
                <button
                  className="fullscreen-drawer-collapse-btn"
                  onClick={() => setIsDrawerOpen(false)}
                  title="Collapse Queue"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Tabs: Queue & Related */}
              <div className="fullscreen-drawer-tabs">
                <button
                  className={`fullscreen-drawer-tab ${drawerTab === "queue" ? "active" : ""}`}
                  onClick={() => setDrawerTab("queue")}
                >
                  Queue
                  {drawerTab === "queue" && <div className="fullscreen-tab-glow-line" />}
                </button>
                <button
                  className={`fullscreen-drawer-tab ${drawerTab === "related" ? "active" : ""}`}
                  onClick={() => setDrawerTab("related")}
                >
                  Related
                  {drawerTab === "related" && <div className="fullscreen-tab-glow-line" />}
                </button>
              </div>

              {/* Scrollable Track List */}
              <div className="fullscreen-drawer-list">
                {(drawerTab === "queue" ? displayQueue : mockRelatedTracks).map((item, idx) => {
                  const isActiveTrack = (item.id === track?.id) || item.isCurrent;
                  const itemTitle = cleanSongTitle(item.title || "Track");
                  const itemArtist = item.artist || item.channelTitle || "Artist";
                  const itemCover = item.cover || item.image || item.thumbnail || FALLBACK_IMAGE;
                  const itemDuration = formatTime(item.duration);

                  return (
                    <div
                      key={item.queueItemId || item.id || idx}
                      className={`fullscreen-track-card ${isActiveTrack ? "active-playing" : ""}`}
                      onClick={() => onSelectTrack && onSelectTrack({ ...item, shouldAutoPlay: true })}
                    >
                      <div className="fullscreen-track-thumb">
                        <img src={itemCover} alt={itemTitle} />
                      </div>

                      <div className="fullscreen-track-meta">
                        <span className="fullscreen-track-title">{itemTitle}</span>
                        <span className="fullscreen-track-artist">{itemArtist}</span>
                      </div>

                      <div className="fullscreen-track-status">
                        {isActiveTrack ? (
                          <div className="fullscreen-eq-wave">
                            <span className="eq-bar bar-1" />
                            <span className="eq-bar bar-2" />
                            <span className="eq-bar bar-3" />
                          </div>
                        ) : (
                          <span className="fullscreen-track-time">{itemDuration}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Action Footer */}
              <div className="fullscreen-drawer-footer">
                <button
                  className="fullscreen-clear-queue-btn"
                  onClick={() => {
                    if (onClearQueue) onClearQueue();
                  }}
                >
                  <Trash2 size={14} />
                  <span>Clear Queue</span>
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* Unified Premium Bottom Playback Dock */}
        <footer className="fullscreen-player-bar-container">
          <div className="fullscreen-player-bar-glass">
            {/* Left: Currently Playing Track Info */}
            <div className="fullscreen-bar-track-info">
              <img src={coverUrl} alt={trackTitle} className="fullscreen-bar-thumb" />
              <div className="fullscreen-bar-meta">
                <span className="fullscreen-bar-title" title={trackTitle}>{trackTitle}</span>
                <span className="fullscreen-bar-artist" title={artistName}>{artistName}</span>
              </div>
              <button
                className={`fullscreen-bar-icon-btn heart ${isLiked ? "liked" : ""}`}
                onClick={onLikeToggle}
                title={isLiked ? "Remove from Liked" : "Like track"}
              >
                <Heart size={18} fill={isLiked ? "#ef4444" : "none"} color={isLiked ? "#ef4444" : "rgba(255,255,255,0.7)"} />
              </button>
            </div>

            {/* Center: Controls & Timeline Scrubber */}
            <div className="fullscreen-bar-center-console">
              {/* Transport Buttons */}
              <div className="fullscreen-bar-buttons-row">
                <button
                  className={`fullscreen-bar-ctrl-btn ${isShuffle ? "active" : ""}`}
                  onClick={onShuffleToggle}
                  title={isShuffle ? "Shuffle On" : "Shuffle Off"}
                >
                  <Shuffle size={17} />
                </button>

                <button
                  className="fullscreen-bar-ctrl-btn"
                  onClick={onPrevious}
                  title="Previous Track"
                >
                  <SkipBack size={20} fill="currentColor" />
                </button>

                <button
                  className="fullscreen-bar-play-circle"
                  onClick={onTogglePlay}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause size={22} fill="currentColor" />
                  ) : (
                    <Play size={22} fill="currentColor" style={{ marginLeft: "2px" }} />
                  )}
                </button>

                <button
                  className="fullscreen-bar-ctrl-btn"
                  onClick={onNext}
                  title="Next Track"
                >
                  <SkipForward size={20} fill="currentColor" />
                </button>

                <button
                  className={`fullscreen-bar-ctrl-btn ${isRepeat ? "active" : ""}`}
                  onClick={onRepeatToggle}
                  title={isRepeat ? "Repeat On" : "Repeat Off"}
                >
                  <Repeat size={17} />
                </button>
              </div>

              {/* Scrubber Timeline */}
              <div className="fullscreen-bar-scrubber-row">
                <span className="fullscreen-bar-time">{formatTime(currentTime)}</span>
                <div
                  className="fullscreen-bar-scrubber-track"
                  ref={scrubberRef}
                  onClick={handleScrub}
                >
                  <div
                    className="fullscreen-bar-scrubber-fill"
                    style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
                  />
                  <div
                    className="fullscreen-bar-scrubber-thumb"
                    style={{ left: `${Math.min(100, Math.max(0, progressPct))}%` }}
                  />
                </div>
                <span className="fullscreen-bar-time">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right: Volume & Utilities */}
            <div className="fullscreen-bar-right-utils">
              <div className="fullscreen-bar-vol-box">
                <button
                  className="fullscreen-bar-ctrl-btn small"
                  onClick={handleToggleMute}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    if (isMuted) setIsMuted(false);
                    onSetVolume(Number(e.target.value));
                  }}
                  className="fullscreen-bar-vol-range"
                  style={{
                    background: `linear-gradient(to right, #ec4899 ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.2) ${(isMuted ? 0 : volume) * 100}%)`,
                  }}
                  aria-label="Volume slider"
                />
              </div>

              <button
                className={`fullscreen-bar-ctrl-btn ${isDrawerOpen ? "active" : ""}`}
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                title="Toggle Queue"
              >
                <ListMusic size={19} />
              </button>

              <button
                className="fullscreen-bar-ctrl-btn"
                onClick={onClose}
                title="Exit Fullscreen (Esc)"
              >
                <Minimize2 size={19} />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
