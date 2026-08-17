import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, Heart, Download, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Volume2, ListMusic, Mic2, Film, Trash2,
  GripVertical, Plus, Bookmark, MoreHorizontal, Maximize2
} from "lucide-react";
import { saveQueueToLibrary } from "../utils/savedQueues";
import { cleanSongTitle, getSongMetadata, extractMovieOrAlbum } from "../utils/songMetadata";
import "../styles/NowPlayingScreen.css";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80";

function formatTime(totalSeconds) {
  if (isNaN(totalSeconds) || totalSeconds === null) return "0:00";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function NowPlayingScreen({
  track,
  queue = [],
  isPlaying,
  currentTime,
  duration,
  volume,
  isLiked,
  isShuffle,
  isRepeat,
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
  const [sidebarTab, setSidebarTab] = useState("queue"); // "queue" or "lyrics"
  const [showFullLyrics, setShowFullLyrics] = useState(false);
  const [displayQueueList, setDisplayQueueList] = useState(queue);
  const scrubberRef = useRef(null);
  const dragItemIndex = useRef(null);

  // Sync prop queue to local state
  useEffect(() => {
    setDisplayQueueList(queue);
  }, [queue]);

  // Drag and Drop handlers for queue reordering
  const handleDragStart = (e, index) => {
    dragItemIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = dragItemIndex.current;
    if (dragIndex !== null && dragIndex !== undefined && dragIndex !== dropIndex) {
      const updatedList = [...displayQueueList];
      const [movedItem] = updatedList.splice(dragIndex, 1);
      updatedList.splice(dropIndex, 0, movedItem);
      setDisplayQueueList(updatedList);
      if (onReorderQueue) {
        onReorderQueue(updatedList);
      }
    }
    dragItemIndex.current = null;
  };

  // Close with Esc key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleScrub = (e) => {
    const bar = scrubberRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  const handleSaveQueueClick = (e) => {
    e.stopPropagation();
    const uniqueQueue = queue.filter((song, index, list) => {
      const id = song.id;
      if (!id) return false;
      return list.findIndex((entry) => entry.id === id) === index;
    });
    if (uniqueQueue.length === 0) {
      alert("Queue is empty");
      return;
    }
    const customName = window.prompt("Enter playlist name", "Saved Queue");
    if (customName === null) return;
    const playlistName = customName.trim() || "Saved Queue";
    try {
      saveQueueToLibrary({ name: playlistName, songs: uniqueQueue });
      alert(`Queue successfully saved as "${playlistName}" to your library!`);
    } catch (err) {
      alert(err?.message || "Failed to save queue");
    }
  };

  const handleAddMoreTracks = () => {
    onClose();
    navigate("/search/songs");
  };

  const activeTrackId = track?.id;
  const isTrackActive = (qTrack) => {
    const qId = qTrack?.id;
    return qId && qId === activeTrackId;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const rawTitle = track?.title || "Not Playing";
  const trackTitle = cleanSongTitle(rawTitle);
  const artistName = track?.artist || track?.channelTitle || "Unknown Artist";
  const coverUrl = track?.cover || track?.image || track?.thumbnail || FALLBACK_IMAGE;

  // Metadata labels resolved dynamically
  const meta = getSongMetadata(track?.title, artistName, track?.description);
  const albumName = extractMovieOrAlbum(rawTitle, artistName, track?.album, track?.movie, meta?.album);

  return (
    <div className="nowplaying-screen">
      {/* 2. Background Artwork Stage */}
      <div
        className="nowplaying-ambient-bg"
        style={{
          backgroundImage: `url(${coverUrl})`,
        }}
      />
      <div className="nowplaying-ambient-overlay" />

      {/* Top Absolute Controls */}
      <button
        className="glass-button nowplaying-close-btn"
        onClick={onClose}
        aria-label="Close full screen player"
        title="Exit Full Screen (Esc)"
      >
        <X size={22} />
      </button>

      <div className="glass-panel nowplaying-esc-badge">
        <span>PRESS</span>
        <kbd className="nowplaying-kbd">ESC</kbd>
        <span>TO EXIT FULL SCREEN</span>
      </div>

      {/* 1. Main Grid Zones (76% Left Stage / 24% Right Sidebar) */}
      <div className="nowplaying-main-stage-wrapper">
        
        {/* LEFT ZONE: 76% Width Cinematic Stage */}
        <div className="nowplaying-stage-left">
          
          {/* 3. Now Playing Information (Lower Left) */}
          <div className="nowplaying-track-info-block">
            <span className="nowplaying-label-tag">NOW PLAYING</span>
            <h1 className="nowplaying-hero-title" title={trackTitle}>
              {trackTitle}
            </h1>
            <div className="nowplaying-subtitle-line">
              <span className="nowplaying-artist-name">{artistName}</span>
              <span className="nowplaying-bullet-dot" />
              <span className="nowplaying-album-name">{albumName}</span>
            </div>
          </div>

          {/* 4. Richer Main Controls Group */}
          <div className="nowplaying-main-controls-row">
            {/* Primary Action: Large Green Circular Play/Pause */}
            <button
              className="nowplaying-play-circle-btn"
              onClick={onTogglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause size={30} fill="currentColor" />
              ) : (
                <Play size={30} fill="currentColor" style={{ marginLeft: "3px" }} />
              )}
            </button>

            {/* Smaller Circular Glass Controls */}
            <button
              className={`glass-button nowplaying-ctrl-circle-btn ${isLiked ? "active" : ""}`}
              onClick={onLikeToggle}
              aria-label="Like"
              title={isLiked ? "Liked" : "Like track"}
            >
              <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
            </button>

            <button
              className="glass-button nowplaying-ctrl-circle-btn"
              onClick={() => alert("Downloading is available on premium plans.")}
              aria-label="Download"
              title="Download track"
            >
              <Download size={20} />
            </button>

            <button
              className={`glass-button nowplaying-ctrl-circle-btn ${isShuffle ? "active" : ""}`}
              onClick={onShuffleToggle}
              aria-label="Shuffle"
              title={isShuffle ? "Disable shuffle" : "Enable shuffle"}
            >
              <Shuffle size={20} />
            </button>

            <button
              className={`glass-button nowplaying-ctrl-circle-btn ${isRepeat ? "active" : ""}`}
              onClick={onRepeatToggle}
              aria-label="Repeat"
              title={isRepeat ? "Disable repeat" : "Enable repeat"}
            >
              <Repeat size={20} />
            </button>

            <button
              className="glass-button nowplaying-ctrl-circle-btn"
              onClick={() => alert("More track actions.")}
              aria-label="More options"
              title="More options"
            >
              <MoreHorizontal size={20} />
            </button>
          </div>

          {/* 5 & 6. Timeline & Scrubber Bar Section */}
          <div className="nowplaying-timeline-section">
            {/* 6. Switch to Video Pill */}
            <div className="nowplaying-video-row">
              <button
                className="glass-button nowplaying-video-pill-btn"
                onClick={() => alert("Video mode playback available.")}
              >
                <Film size={14} />
                <span>Switch to Video</span>
              </button>
            </div>

            {/* 5. Progress Bar */}
            <div className="nowplaying-scrubber-container">
              <span className="nowplaying-timestamp">{formatTime(currentTime)}</span>
              
              <div
                className="nowplaying-scrubber-rail"
                ref={scrubberRef}
                onClick={handleScrub}
              >
                <div
                  className="nowplaying-scrubber-fill-bar"
                  style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
                />
                <div
                  className="nowplaying-scrubber-handle"
                  style={{ left: `${Math.min(100, Math.max(0, progressPct))}%` }}
                />
              </div>

              <span className="nowplaying-timestamp">{formatTime(duration)}</span>
            </div>
          </div>

        </div>

        {/* RIGHT ZONE: 24% Width Compact Supporting Sidebar */}
        <div className="nowplaying-sidebar-right">
          <div className="glass-panel nowplaying-sidebar-container">
            
            {/* 7. Sidebar Tabs Header */}
            <div className="nowplaying-sidebar-tabs-header">
              <button
                className={`nowplaying-sidebar-tab-btn ${sidebarTab === "queue" ? "active" : ""}`}
                onClick={() => setSidebarTab("queue")}
              >
                <ListMusic size={15} />
                <span>QUEUE</span>
              </button>

              <button
                className={`nowplaying-sidebar-tab-btn ${sidebarTab === "lyrics" ? "active" : ""}`}
                onClick={() => setSidebarTab("lyrics")}
              >
                <Mic2 size={15} />
                <span>LYRICS</span>
              </button>
            </div>

            {/* 7 & 8. QUEUE TAB CONTENT */}
            {sidebarTab === "queue" && (
              <>
                <div className="nowplaying-upnext-header">
                  <span className="nowplaying-upnext-title">UP NEXT</span>
                  {queue.length > 0 && (
                    <button className="nowplaying-clear-queue-btn" onClick={onClearQueue}>
                      <Trash2 size={13} />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                <div className="nowplaying-queue-list-scroll">
                  {displayQueueList.length === 0 ? (
                    <div className="nowplaying-empty-state">
                      <p>Your queue is empty.</p>
                    </div>
                  ) : (
                    displayQueueList.map((qTrack, index) => {
                      const active = isTrackActive(qTrack);
                      const qTrackId = qTrack.queueItemId || qTrack.id || `q-${index}`;
                      const qCover = qTrack.cover || qTrack.image || qTrack.thumbnail || FALLBACK_IMAGE;
                      const qTitle = cleanSongTitle(qTrack.title || "Untitled Track");
                      const qArtist = qTrack.artist || qTrack.channelTitle || "Unknown Artist";
                      const qDuration = formatTime(qTrack.duration);

                      return (
                        <div
                          key={qTrackId}
                          className={`nowplaying-queue-card ${active ? "active-track" : ""}`}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index)}
                          onClick={() => onSelectTrack({ ...qTrack, shouldAutoPlay: true })}
                        >
                          <GripVertical size={14} className="nowplaying-drag-handle-icon" title="Drag to reorder" />

                          <img src={qCover} alt={qTitle} className="nowplaying-queue-thumb-img" draggable={false} />

                          <div className="nowplaying-queue-card-details">
                            <p className={`nowplaying-queue-song-title ${active ? "active" : ""}`}>
                              {qTitle}
                            </p>
                            <p className="nowplaying-queue-artist-text">{qArtist}</p>
                          </div>

                          <div className="nowplaying-queue-right-meta">
                            {active ? (
                              <div className="nowplaying-equalizer-wave">
                                <div className="nowplaying-eq-bar eq-1" />
                                <div className="nowplaying-eq-bar eq-2" />
                                <div className="nowplaying-eq-bar eq-3" />
                              </div>
                            ) : (
                              <span className="nowplaying-queue-duration-text">{qDuration}</span>
                            )}

                            <button
                              className="nowplaying-remove-item-btn"
                              aria-label="Remove item"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveQueueItem(qTrack.queueItemId || qTrack.id);
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="nowplaying-sidebar-action-footer">
                  <button className="glass-button nowplaying-footer-pill-btn" onClick={handleSaveQueueClick}>
                    <Bookmark size={13} />
                    <span>Save Queue</span>
                  </button>
                  <button className="glass-button nowplaying-footer-pill-btn" onClick={handleAddMoreTracks}>
                    <Plus size={13} />
                    <span>Add Songs</span>
                  </button>
                </div>
              </>
            )}

            {/* 9. LYRICS TAB CONTENT */}
            {sidebarTab === "lyrics" && (
              <div className="nowplaying-lyrics-wrapper">
                {lyrics && lyrics.length > 0 ? (
                  <>
                    {(showFullLyrics ? lyrics : lyrics.slice(0, 6)).map((line, idx) => (
                      <p
                        key={idx}
                        className={`nowplaying-lyric-line-item ${idx === 0 ? "active" : ""}`}
                      >
                        {line}
                      </p>
                    ))}
                    <button
                      className="glass-button nowplaying-footer-pill-btn"
                      style={{ marginTop: "12px" }}
                      onClick={() => setShowFullLyrics(!showFullLyrics)}
                    >
                      <span>{showFullLyrics ? "Show Less" : "Show Full Lyrics"}</span>
                    </button>
                  </>
                ) : (
                  <div className="nowplaying-empty-state">
                    <Mic2 size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
                    <p>Lyrics available with active stream.</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>

      {/* 10. FIXED BOTTOM PLAYBACK CONTROL BAR (100% WIDTH, 96px HEIGHT) */}
      <div className="nowplaying-bottom-fixed-bar">
        
        {/* Left: Artwork, Track Title, Artist */}
        <div className="nowplaying-bar-left">
          <img src={coverUrl} alt={trackTitle} className="nowplaying-bar-thumb" />
          <div className="nowplaying-bar-meta">
            <p className="nowplaying-bar-title">{trackTitle}</p>
            <p className="nowplaying-bar-artist-album">{artistName} • {albumName}</p>
          </div>
        </div>

        {/* Center: Shuffle, Prev, Play/Pause, Next, Repeat */}
        <div className="nowplaying-bar-center">
          <button
            className={`nowplaying-bar-ctrl-btn ${isShuffle ? "active" : ""}`}
            onClick={onShuffleToggle}
            aria-label="Shuffle"
            title={isShuffle ? "Shuffle On" : "Shuffle Off"}
          >
            <Shuffle size={18} />
          </button>

          <button
            className="nowplaying-bar-ctrl-btn"
            onClick={onPrevious}
            aria-label="Previous"
            title="Previous track"
          >
            <SkipBack size={20} />
          </button>

          <button
            className="nowplaying-bar-play-btn"
            onClick={onTogglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause size={22} fill="currentColor" />
            ) : (
              <Play size={22} fill="currentColor" style={{ marginLeft: "2px" }} />
            )}
          </button>

          <button
            className="nowplaying-bar-ctrl-btn"
            onClick={onNext}
            aria-label="Next"
            title="Next track"
          >
            <SkipForward size={20} />
          </button>

          <button
            className={`nowplaying-bar-ctrl-btn ${isRepeat ? "active" : ""}`}
            onClick={onRepeatToggle}
            aria-label="Repeat"
            title={isRepeat ? "Repeat On" : "Repeat Off"}
          >
            <Repeat size={18} />
          </button>
        </div>

        {/* Right: Volume Slider, Queue, Fullscreen */}
        <div className="nowplaying-bar-right">
          <div className="nowplaying-bar-vol-group">
            <Volume2 size={17} className={`nowplaying-vol-icon ${volume > 0 ? "active" : ""}`} />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => onSetVolume(Number(e.target.value))}
              className="nowplaying-bar-vol-slider"
              style={{
                background: `linear-gradient(to right, #10b981 ${Math.round(volume * 100)}%, rgba(255, 255, 255, 0.18) ${Math.round(volume * 100)}%)`
              }}
              aria-label={`Volume: ${Math.round(volume * 100)}%`}
              title={`Volume: ${Math.round(volume * 100)}%`}
            />
          </div>

          <button
            className={`nowplaying-bar-ctrl-btn ${sidebarTab === "queue" ? "active" : ""}`}
            onClick={() => setSidebarTab("queue")}
            aria-label="Queue"
            title="Queue"
          >
            <ListMusic size={18} />
          </button>

          <button
            className="nowplaying-bar-ctrl-btn"
            onClick={onClose}
            aria-label="Exit Fullscreen"
            title="Exit Fullscreen"
          >
            <Maximize2 size={18} />
          </button>
        </div>

      </div>

    </div>
  );
}
