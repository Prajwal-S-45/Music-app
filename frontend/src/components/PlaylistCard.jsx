import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Edit3, PlayCircle, Trash2, Heart, MoreHorizontal, Play } from 'lucide-react';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

const getDotColor = (name) => {
  const n = String(name || '').toLowerCase();
  if (n.includes('liked')) return '#8b5cf6';
  if (n.includes('road')) return '#f97316';
  if (n.includes('party')) return '#d946ef';
  if (n.includes('chill')) return '#0ea5e9';
  if (n.includes('workout')) return '#22c55e';
  if (n.includes('romantic')) return '#f43f5e';
  if (n.includes('long drive')) return '#f97316';
  if (n.includes('rainy')) return '#3b82f6';
  if (n.includes('acoustic')) return '#f97316';
  if (n.includes('late')) return '#0ea5e9';

  let hash = 0;
  for (let i = 0; i < n.length; i++) {
    hash = n.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#3b82f6', '#f97316', '#d946ef', '#0ea5e9', '#22c55e', '#a855f7', '#eab308'];
  return colors[Math.abs(hash) % colors.length];
};

function PlaylistCard({ queue, onOpenQueue, onPlayAll, onRenameQueue, onDeleteQueue }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const isLikedSongs = queue.id === 'liked-songs';

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMenuOpen]);

  const handleOpen = useCallback(() => {
    onOpenQueue?.(queue.id);
  }, [onOpenQueue, queue.id]);

  const handlePlayAll = useCallback((e) => {
    e.stopPropagation();
    onPlayAll?.(queue);
  }, [onPlayAll, queue]);

  const handleRename = useCallback(() => {
    onRenameQueue?.(queue);
  }, [onRenameQueue, queue]);

  const handleDelete = useCallback(() => {
    onDeleteQueue?.(queue.id);
  }, [onDeleteQueue, queue.id]);

  const toggleMenu = useCallback((e) => {
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);
  }, []);

  return (
    <article className="playlist-card" onClick={handleOpen}>
      <div className="playlist-card__img-container">
        {isLikedSongs ? (
          <div className="playlist-card__liked-cover">
            <Heart size={44} fill="none" stroke="#ffffff" strokeWidth={1.5} />
          </div>
        ) : (
          <img src={queue.cover || FALLBACK_IMAGE} alt={queue.name} />
        )}
        
        {/* Play Button Overlay on Hover */}
        <button 
          className="playlist-card__play-overlay" 
          onClick={handlePlayAll} 
          aria-label="Play playlist"
        >
          <Play size={22} fill="currentColor" stroke="none" />
        </button>

        {/* Floating Options Button - shown on all cards */}
        <div className="playlist-card__menu-container" ref={menuRef}>
          <button 
            className={`playlist-card__menu-btn ${isMenuOpen ? 'active' : ''}`}
            onClick={toggleMenu} 
            aria-label="Playlist options"
            type="button"
          >
            <MoreHorizontal size={18} />
          </button>
          {isMenuOpen && (
            <div className="playlist-card__dropdown" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={(e) => { setIsMenuOpen(false); handlePlayAll(e); }}>
                <PlayCircle size={14} /> Play All
              </button>
              {!isLikedSongs && (
                <>
                  <button type="button" onClick={() => { setIsMenuOpen(false); handleRename(); }}>
                    <Edit3 size={14} /> Rename
                  </button>
                  <button type="button" className="danger" onClick={() => { setIsMenuOpen(false); handleDelete(); }}>
                    <Trash2 size={14} /> Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="playlist-card__info">
        <h4>{queue.name || 'Saved Queue'}</h4>
        <p className="playlist-card__meta">
          <span 
            className="playlist-card__dot" 
            style={{ backgroundColor: getDotColor(queue.name) }} 
          />
          {queue.songCount || queue.songs?.length || 0} songs
        </p>
      </div>
    </article>
  );
}

export default memo(PlaylistCard);
