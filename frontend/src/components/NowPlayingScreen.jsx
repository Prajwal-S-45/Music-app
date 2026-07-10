import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, Heart, Download, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Volume2, ListMusic, Maximize2, Trash2, GripVertical,
  MoreHorizontal
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
}) {
  const navigate = useNavigate();
  const [showFullLyrics, setShowFullLyrics] = useState(false);
  const [activeTab, setActiveTab] = useState("playing"); // "playing" or "next"
  const scrubberRef = useRef(null);

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
      const id = song.videoId || song.id;
      if (!id) return false;
      return list.findIndex((entry) => (entry.videoId || entry.id) === id) === index;
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
    navigate("/search");
  };

  const activeTrackId = track?.videoId || track?.id;
  const isTrackActive = (qTrack) => {
    const qId = qTrack?.videoId || qTrack?.id;
    return qId && qId === activeTrackId;
  };

  const activeIndex = queue.findIndex((q) => isTrackActive(q));

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const rawTitle = track?.title || "Not Playing";
  const trackTitle = cleanSongTitle(rawTitle);
  const artistName = track?.artist || track?.channelTitle || "Unknown Artist";
  const coverUrl = track?.cover || track?.image || track?.thumbnail || FALLBACK_IMAGE;

  // Metadata labels resolved dynamically
  const meta = getSongMetadata(track?.title, artistName, track?.description);
  const albumName = extractMovieOrAlbum(rawTitle, artistName, track?.album, track?.movie, meta?.album);

  // Tab filtering for queue:
  // "playing" shows the full list with visualizer active.
  // "next" displays upcoming songs following the active song in the queue.
  const displayQueue = activeTab === "playing" 
    ? queue 
    : (activeIndex >= 0 ? queue.slice(activeIndex + 1) : queue);

  return (
    <div className="nowplaying-screen">
      {/* Blurred Ambient Backdrop */}
      <div
        className="nowplaying-ambient-bg"
        style={{
          backgroundImage: `url(${coverUrl})`,
        }}
      />
      <div className="nowplaying-ambient-overlay" />

      {/* Top absolute overlays */}
      <button
        className="nowplaying-close-btn"
        onClick={onClose}
        aria-label="Close"
      >
        <X size={20} color="#fff" />
      </button>

      <div className="nowplaying-esc-badge">
        <span>Press</span>
        <kbd className="nowplaying-kbd">Esc</kbd>
        <span>to exit full screen</span>
      </div>

      <div className="nowplaying-main-area">
        {/* ---- left & center section ---- */}
        <div className="nowplaying-left-section">
          
          {/* Details Pane */}
          <div className="nowplaying-details-pane">
            <span className="nowplaying-album-pre">PLAYING FROM ALBUM</span>
            <p className="nowplaying-album-title-text">{albumName}</p>

            <div className="nowplaying-title-row">
              <h1 className="nowplaying-song-title-text">{trackTitle}</h1>
              <button
                className="nowplaying-heart-toggle-btn"
                onClick={onLikeToggle}
                aria-label="Like toggle"
              >
                <Heart
                  size={24}
                  color={isLiked ? "#1DB954" : "#fff"}
                  fill={isLiked ? "#1DB954" : "none"}
                />
              </button>
            </div>

            <p className="nowplaying-artist-name-text">
              {meta.singer || artistName}
            </p>

            {/* Quality Outlined Badges */}
            <div className="nowplaying-badge-row">
              <span className="nowplaying-quality-badge">320 Kbps</span>
              <span className="nowplaying-quality-badge">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
                  <path d="M12 2v20M17 5v14M22 9v6M7 7v10M2 10v4" />
                </svg>
                Audio
              </span>
            </div>

            {/* Action Icons Row */}
            <div className="nowplaying-action-icons-row">
              <button className="nowplaying-action-icon-btn" onClick={onLikeToggle} aria-label="Like action">
                <Heart size={20} fill={isLiked ? "#1DB954" : "none"} color={isLiked ? "#1DB954" : "#fff"} />
                <span>Like</span>
              </button>
              
              <button className="nowplaying-action-icon-btn" onClick={() => alert("Downloading feature available on premium plans.")} aria-label="Download action">
                <Download size={20} color="#fff" />
                <span>Download</span>
              </button>

              <button className="nowplaying-action-icon-btn" onClick={() => alert("Added to Playlist successfully.")} aria-label="Add playlist action">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
                <span>Add to Playlist</span>
              </button>

              <button className="nowplaying-action-icon-btn" onClick={() => alert("More options.")} aria-label="More options action">
                <MoreHorizontal size={20} color="#fff" />
                <span>More</span>
              </button>
            </div>

            {/* Lyrics Block */}
            <div className="nowplaying-lyrics-block-left">
              <span className="nowplaying-lyrics-header-left">Lyrics</span>
              <div className="nowplaying-lyrics-lines-left">
                {(showFullLyrics
                  ? [...lyrics, ...lyrics]
                  : lyrics.slice(0, 4)
                ).map((line, i) => (
                  <p key={i} className="nowplaying-lyric-line-left">{line}</p>
                ))}
              </div>
              {lyrics.length > 0 && (
                <button
                  className="nowplaying-show-full-lyrics-btn-left"
                  onClick={() => setShowFullLyrics((v) => !v)}
                >
                  <span>{showFullLyrics ? "Show less" : "Show Full Lyrics"}</span>
                  <Maximize2 size={12} color="#fff" />
                </button>
              )}
            </div>

          </div>

          {/* Centered Album Poster Artwork */}
          <div className="nowplaying-artwork-pane">
            <img src={coverUrl} alt={albumName} className="nowplaying-large-artwork" />
          </div>

        </div>

        {/* ---- right sidebar Up Next ---- */}
        <div className="nowplaying-right-column">
          <div className="nowplaying-upnext-panel">
            <div className="nowplaying-sidebar-header">
              <span className="nowplaying-up-next-title">Up Next</span>
              <button className="nowplaying-clear-queue-btn" onClick={onClearQueue}>
                <span>Clear Queue</span>
                <Trash2 size={14} />
              </button>
            </div>

            {/* Queue Tab Selectors */}
            <div className="nowplaying-tabs-row">
              <button
                className={`nowplaying-tab-btn ${activeTab === "playing" ? "active" : ""}`}
                onClick={() => setActiveTab("playing")}
              >
                Playing Now
              </button>
              <button
                className={`nowplaying-tab-btn ${activeTab === "next" ? "active" : ""}`}
                onClick={() => setActiveTab("next")}
              >
                Next In Queue
              </button>
            </div>

            <div className="nowplaying-queue-list">
              {displayQueue.length === 0 && (
                <p className="nowplaying-empty-queue">Your queue is empty. Add some tracks.</p>
              )}
              {displayQueue.map((qTrack, index) => {
                const active = isTrackActive(qTrack);
                // Queue display index maps correctly
                const absoluteIdx = queue.findIndex(q => (q.queueItemId || q.id) === (qTrack.queueItemId || qTrack.id));
                const qTrackId = qTrack.queueItemId || qTrack.id || `${qTrack.videoId || 'queue'}-${index}`;
                const qTrackCover = qTrack.cover || qTrack.image || qTrack.thumbnail || FALLBACK_IMAGE;
                const qTrackTitle = cleanSongTitle(qTrack.title || "Untitled Track");
                const qTrackArtist = qTrack.artist || qTrack.channelTitle || "Unknown Artist";
                const qTrackDurationText = formatTime(qTrack.duration);

                // Calculate visual sequence index
                let rowIndicator = null;
                if (active) {
                  rowIndicator = (
                    <div className="nowplaying-visualizer-wave">
                      <div className="nowplaying-visualizer-bar bar-1"></div>
                      <div className="nowplaying-visualizer-bar bar-2"></div>
                      <div className="nowplaying-visualizer-bar bar-3"></div>
                    </div>
                  );
                } else {
                  rowIndicator = activeIndex >= 0 && absoluteIdx > activeIndex 
                    ? absoluteIdx - activeIndex 
                    : absoluteIdx + 1;
                }

                return (
                  <div
                    key={qTrackId}
                    className="nowplaying-queue-row"
                    style={{
                      backgroundColor: active ? "rgba(255,255,255,0.06)" : "transparent"
                    }}
                    onClick={() => onSelectTrack({ ...qTrack, shouldAutoPlay: true })}
                  >
                    <div className="nowplaying-queue-number">
                      {!active && rowIndicator}
                    </div>
                    
                    <div className="nowplaying-queue-thumb-wrap">
                      <img src={qTrackCover} alt="" className="nowplaying-queue-thumb" />
                    </div>

                    <div className="nowplaying-queue-meta">
                      <p
                        className="nowplaying-queue-track-title"
                        style={{
                          color: active ? "#1DB954" : "#fff"
                        }}
                      >
                        {qTrackTitle}
                      </p>
                      <p className="nowplaying-queue-track-artist">{qTrackArtist}</p>
                    </div>

                    {active ? (
                      <div className="nowplaying-active-wave-right">
                        {rowIndicator}
                      </div>
                    ) : (
                      <span className="nowplaying-queue-duration">{qTrackDurationText}</span>
                    )}

                    {/* Grip/Delete hover control */}
                    <div className="nowplaying-queue-actions-group">
                      <div className="queue-grip-icon nowplaying-drag-handle-icon">
                        <GripVertical size={16} color="rgba(255,255,255,0.3)" />
                      </div>
                      <button
                        className="queue-remove-btn nowplaying-drag-handle"
                        aria-label="Remove from queue"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveQueueItem(qTrack.queueItemId || qTrack.id);
                        }}
                      >
                        <X size={14} color="#8a8a8a" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="nowplaying-queue-actions">
              <button className="nowplaying-outline-pill" onClick={handleSaveQueueClick}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                Save Queue
              </button>
              <button className="nowplaying-outline-pill" onClick={handleAddMoreTracks}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add to Queue
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ---- bottom player bar ---- */}
      <div className="nowplaying-bottom-bar">
        <div className="nowplaying-bottom-left">
          <img src={coverUrl} alt="" className="nowplaying-bottom-thumb" />
          <div>
            <p className="nowplaying-bottom-title">{trackTitle}</p>
            <p className="nowplaying-bottom-artist">{artistName}</p>
          </div>
          <button
            className="nowplaying-bare-icon-btn"
            onClick={onLikeToggle}
            aria-label="Like"
          >
            <Heart
              size={16}
              color={isLiked ? "#1DB954" : "#b3b3b3"}
              fill={isLiked ? "#1DB954" : "none"}
            />
          </button>
        </div>

        <div className="nowplaying-bottom-center">
          <button
            className="nowplaying-bare-icon-btn"
            onClick={onShuffleToggle}
            aria-label="Shuffle"
          >
            <Shuffle size={16} color={isShuffle ? "#1DB954" : "#b3b3b3"} />
          </button>
          <button className="nowplaying-bare-icon-btn" aria-label="Previous" onClick={onPrevious}>
            <SkipBack size={18} color="#fff" fill="#fff" />
          </button>
          <button
            className="nowplaying-bottom-play-btn"
            onClick={onTogglePlay}
            aria-label="Play or pause"
          >
            {isPlaying ? (
              <Pause size={18} fill="#0b0b0a" color="#0b0b0a" />
            ) : (
              <Play size={18} fill="#0b0b0a" color="#0b0b0a" />
            )}
          </button>
          <button className="nowplaying-bare-icon-btn" aria-label="Next" onClick={onNext}>
            <SkipForward size={18} color="#fff" fill="#fff" />
          </button>
          <button
            className="nowplaying-bare-icon-btn"
            onClick={onRepeatToggle}
            aria-label="Repeat"
          >
            <Repeat size={16} color={isRepeat ? "#1DB954" : "#b3b3b3"} />
          </button>
        </div>

        <div className="nowplaying-bottom-right">
          <Volume2 size={16} color="#b3b3b3" />
          <input
            type="range"
            min={0}
            max={100}
            className="nowplaying-volume-slider"
            value={Math.round(volume * 100)}
            onChange={(e) => onSetVolume(Number(e.target.value) / 100)}
            style={{
              background: `linear-gradient(to right, #1DB954 ${Math.round(volume * 100)}%, #4d4d4d ${Math.round(volume * 100)}%)`,
            }}
          />
          <button className="nowplaying-bare-icon-btn" aria-label="Queue" onClick={onClose}>
            <ListMusic size={16} color="#b3b3b3" />
          </button>
          <button className="nowplaying-bare-icon-btn" aria-label="Full screen" onClick={onClose}>
            <Maximize2 size={16} color="#1DB954" />
          </button>
        </div>
      </div>
    </div>
  );
}
