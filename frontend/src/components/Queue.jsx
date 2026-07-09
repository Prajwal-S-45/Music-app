import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookmarkPlus,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  GripVertical,
  LayoutList,
  MoreHorizontalIcon,
  Music2,
  Play,
  Trash2,
  X,
} from 'lucide-react';
import { saveQueueToLibrary } from '../utils/savedQueues';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

const formatQueueDuration = (seconds) => {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
};

const getTrackPlaybackId = (item) => item?.videoId || item?.id;

const getQueueItemKey = (item, index) =>
  item?.queueItemId || item?.id || `${item?.title || 'queue-item'}-${index}`;

function Queue({
  items = [],
  activeTrackId,
  onSelectTrack,
  isOpen = false,
  isCompactLayout = false,
  onToggleQueue,
  onPlayTrack,
  onClearQueue,
  onRestoreQueue,
  onReorderQueue,
  onRemoveQueueItem,
  onRemoveQueueItems,
}) {
  const isExpanded = isCompactLayout ? isOpen : true;
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [undoState, setUndoState] = useState({ visible: false, items: [] });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [selectedQueueItems, setSelectedQueueItems] = useState([]);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const undoTimerRef = useRef(null);
  const statusTimerRef = useRef(null);
  const menuRef = useRef(null);
  const listRef = useRef(null);
  const itemRefs = useRef(new Map());

  const queueDuration = useMemo(
    () => items.reduce((total, item) => total + (Number(item?.duration) || 0), 0),
    [items]
  );

  const showStatus = (type, message) => {
    if (statusTimerRef.current) {
      window.clearTimeout(statusTimerRef.current);
    }
    setSaveStatus({ type, message });
    statusTimerRef.current = window.setTimeout(() => {
      setSaveStatus((prev) => (prev.message === message ? { type: '', message: '' } : prev));
      statusTimerRef.current = null;
    }, 2600);
  };

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
      if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const activeIndex = useMemo(
    () => items.findIndex((item) => getTrackPlaybackId(item) === activeTrackId),
    [items, activeTrackId]
  );

  const scrollToNowPlaying = () => {
    if (!listRef.current || activeTrackId == null) return false;
    const activeElement = itemRefs.current.get(activeTrackId);
    if (!activeElement) return false;
    const listElement = listRef.current;
    const targetTop = Math.max(
      0,
      activeElement.offsetTop - listElement.clientHeight / 2 + activeElement.clientHeight / 2
    );
    listElement.scrollTo({ top: targetTop, behavior: 'smooth' });
    return true;
  };

  useEffect(() => {
    if (activeTrackId) scrollToNowPlaying();
  }, [activeTrackId, items]);

  const handleSaveQueue = async (event) => {
    event.stopPropagation();
    if (isSaving) return;
    const uniqueQueue = items.filter((song, index, list) => {
      if (!song?.id) return false;
      return list.findIndex((entry) => entry?.id === song.id) === index;
    });
    if (uniqueQueue.length === 0) { showStatus('error', 'Queue is empty'); return; }
    const suggestedName = 'Saved Queue';
    const customName = window.prompt('Enter playlist name', suggestedName);
    if (customName === null) return;
    const playlistName = customName.trim() || suggestedName;
    try {
      setIsSaving(true);
      setSaveStatus({ type: '', message: '' });
      saveQueueToLibrary({ name: playlistName, songs: uniqueQueue });
      showStatus('success', 'Queue saved to Library');
    } catch (error) {
      showStatus('error', error?.message || 'Failed to save queue');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearClick = (event) => {
    event.stopPropagation();
    setIsMenuOpen(false);
    if (items.length === 0) { showStatus('error', 'Queue is already empty'); return; }
    setIsClearModalOpen(true);
  };

  const handleConfirmClear = () => {
    setIsClearModalOpen(false);
    const snapshot = items.slice();
    onClearQueue?.();
    setUndoState({ visible: true, items: snapshot });
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = window.setTimeout(() => {
      setUndoState({ visible: false, items: [] });
    }, 5000);
  };

  const handleUndoClear = () => {
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    if (undoState.items.length > 0) onRestoreQueue?.(undoState.items);
    setUndoState({ visible: false, items: [] });
  };

  const handleFindNowPlaying = () => {
    setIsMenuOpen(false);
    if (activeIndex < 0 || !scrollToNowPlaying()) {
      showStatus('error', 'Now playing track is not in queue');
    }
  };

  const handleMenuToggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsMenuOpen((value) => !value);
  };

  const handleDragStart = (index) => {
    if (!isEditMode) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (event, overIndex) => {
    if (!isEditMode) return;
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === overIndex) return;
    setDragOverIndex(overIndex);
  };

  const handleDrop = (event, dropIndex) => {
    if (!isEditMode || draggedIndex === null) return;
    event.preventDefault();
    if (draggedIndex !== dropIndex) onReorderQueue?.(draggedIndex, dropIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleRemoveItem = (event, queueItemId) => {
    event.stopPropagation();
    onRemoveQueueItem?.(queueItemId);
  };

  const handleMoveItem = (event, fromIndex, toIndex) => {
    event.stopPropagation();
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= items.length) return;
    onReorderQueue?.(fromIndex, toIndex);
  };

  const toggleSelectedItem = (queueItemId) => {
    setSelectedQueueItems((currentSelected) =>
      currentSelected.includes(queueItemId)
        ? currentSelected.filter((itemId) => itemId !== queueItemId)
        : [...currentSelected, queueItemId]
    );
  };

  const clearSelection = () => setSelectedQueueItems([]);

  const handleBulkRemoveSelected = () => {
    if (selectedQueueItems.length === 0) return;
    onRemoveQueueItems?.(selectedQueueItems);
    clearSelection();
  };

  const handleEditQueue = () => {
    setIsEditMode((value) => {
      const nextValue = !value;
      if (!nextValue) {
        clearSelection();
        setDraggedIndex(null);
        setDragOverIndex(null);
      }
      return nextValue;
    });
    setIsMenuOpen(false);
  };

  // On desktop: render as permanent "Up Next" panel
  if (!isCompactLayout) {
    return (
      <aside className="upnext-panel" role="complementary" aria-label="Up Next queue">
        {/* Header */}
        <div className="upnext-panel__header">
          <span className="upnext-panel__title">Up Next</span>
          <div className="upnext-panel__header-actions" ref={menuRef}>
            {isEditMode && selectedQueueItems.length > 0 && (
              <button type="button" className="upnext-panel__bulk-remove" onClick={handleBulkRemoveSelected}>
                Remove ({selectedQueueItems.length})
              </button>
            )}
            <button
              type="button"
              className="upnext-panel__save-btn"
              onClick={handleSaveQueue}
              disabled={isSaving || items.length === 0}
              title="Save queue as playlist"
            >
              <BookmarkPlus size={14} />
            </button>
            <button
              type="button"
              className="upnext-panel__clear-btn"
              onClick={handleClearClick}
              disabled={items.length === 0}
              title="Clear queue"
            >
              Clear
            </button>
            <div className="upnext-panel__menu-shell">
              <button
                type="button"
                className="upnext-panel__menu-btn"
                onClick={handleMenuToggle}
                aria-label="Queue options"
                aria-expanded={isMenuOpen}
              >
                <MoreHorizontalIcon size={16} />
              </button>
              {isMenuOpen && (
                <div
                  className="upnext-panel__menu"
                  role="menu"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => { e.stopPropagation(); handleEditQueue(); }}
                  >
                    <GripVertical size={14} />
                    {isEditMode ? 'Close Edit' : 'Edit Queue'}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => { e.stopPropagation(); handleFindNowPlaying(); }}
                  >
                    <LayoutList size={14} />
                    Find Now Playing
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Queue list */}
        <div
          className={`upnext-panel__list ${isEditMode ? 'editing' : ''}`}
          ref={listRef}
        >
          {items.length === 0 ? (
            <div className="upnext-panel__empty">
              <Music2 size={22} />
              <p>Queue is empty</p>
              <span>Play a track to start</span>
            </div>
          ) : (
            items.map((item, index) => (
              <div
                key={getQueueItemKey(item, index)}
                ref={(node) => {
                  const playbackId = getTrackPlaybackId(item);
                  if (node && playbackId) itemRefs.current.set(playbackId, node);
                  else if (playbackId) itemRefs.current.delete(playbackId);
                }}
                className={`upnext-panel__item ${activeTrackId === getTrackPlaybackId(item) ? 'active' : ''} ${
                  isEditMode ? 'editing' : ''
                } ${selectedQueueItems.includes(getQueueItemKey(item, index)) ? 'selected' : ''} ${
                  dragOverIndex === index ? 'drop-target' : ''
                }`}
                draggable={isEditMode}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(event) => handleDragOver(event, index)}
                onDrop={(event) => handleDrop(event, index)}
                onDragEnd={handleDragEnd}
                onClick={(event) => {
                  if (isEditMode) {
                    if (draggedIndex !== null) return;
                    toggleSelectedItem(getQueueItemKey(item, index));
                    return;
                  }
                  event.stopPropagation();
                  onSelectTrack?.(item);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (isEditMode) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectTrack?.(item);
                  }
                }}
              >
                {isEditMode && (
                  <span className="upnext-panel__drag-handle" aria-hidden="true">
                    <GripVertical size={13} />
                  </span>
                )}
                {isEditMode && (
                  <label className="upnext-panel__select-box" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedQueueItems.includes(getQueueItemKey(item, index))}
                      onChange={() => toggleSelectedItem(getQueueItemKey(item, index))}
                      aria-label={`Select ${item.title}`}
                    />
                    <span />
                  </label>
                )}
                <img
                  src={item.cover || item.image || FALLBACK_IMAGE}
                  alt={item.title}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = FALLBACK_IMAGE;
                  }}
                />
                <div className="upnext-panel__item-info">
                  <strong title={item.title}>{item.title}</strong>
                  <span title={item.artist || item.subtitle}>{item.artist || item.subtitle}</span>
                </div>
                {!isEditMode && item.duration ? (
                  <span className="upnext-panel__item-duration">
                    {formatQueueDuration(item.duration)}
                  </span>
                ) : null}
                {isEditMode && (
                  <div className="upnext-panel__move-controls">
                    <button
                      type="button"
                      onClick={(e) => handleMoveItem(e, index, index - 1)}
                      disabled={index === 0}
                      aria-label={`Move ${item.title} up`}
                    >
                      <ChevronUp size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleMoveItem(e, index, index + 1)}
                      disabled={index >= items.length - 1}
                      aria-label={`Move ${item.title} down`}
                    >
                      <ChevronDown size={11} />
                    </button>
                  </div>
                )}
                {isEditMode ? (
                  <button
                    type="button"
                    className="upnext-panel__remove-btn"
                    onClick={(e) => handleRemoveItem(e, getQueueItemKey(item, index))}
                    aria-label={`Remove ${item.title}`}
                  >
                    <X size={11} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="upnext-panel__item-play"
                    onClick={(e) => { e.stopPropagation(); onPlayTrack?.(item); }}
                    aria-label={`Play ${item.title}`}
                  >
                    <Play size={11} fill="currentColor" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* View Full Queue footer */}
        {items.length > 0 && (
          <div className="upnext-panel__footer">
            <button
              type="button"
              className="upnext-panel__view-all"
              onClick={handleSaveQueue}
            >
              View Full Queue ({items.length})
            </button>
          </div>
        )}

        {saveStatus.message && (
          <p className={`upnext-panel__status ${saveStatus.type} visible`}>{saveStatus.message}</p>
        )}

        {undoState.visible && (
          <div className="upnext-panel__undo-toast" role="status" aria-live="polite">
            <span>Queue cleared</span>
            <button type="button" onClick={handleUndoClear}>Undo</button>
          </div>
        )}

        {isClearModalOpen && (
          <div className="dashboard-queue__modal" role="presentation" onClick={() => setIsClearModalOpen(false)}>
            <div
              className="dashboard-queue__modal-card"
              role="dialog"
              aria-modal="true"
              aria-label="Clear queue confirmation"
              onClick={(event) => event.stopPropagation()}
            >
              <strong>Clear Queue</strong>
              <p>Are you sure you want to clear the queue?</p>
              <div className="dashboard-queue__modal-actions">
                <button type="button" className="dashboard-queue__modal-secondary" onClick={() => setIsClearModalOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="dashboard-queue__modal-primary" onClick={handleConfirmClear}>
                  Clear Queue
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    );
  }

  // ─── MOBILE / COMPACT: original drawer behaviour ───────────────────────────
  return (
    <motion.aside
      className={`dashboard-queue ${isExpanded ? 'open' : 'collapsed'} ${isCompactLayout ? 'mobile' : 'desktop'} ${
        isEditMode ? 'editing' : ''
      }`}
      role="complementary"
      aria-label="Playback queue"
    >
      <motion.div className="dashboard-queue__header">
        <div className="dashboard-queue__mobile-header-left">
          <button className="dashboard-queue__mobile-back" onClick={(e) => { e.stopPropagation(); onToggleQueue?.(); }}>
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="dashboard-queue__mobile-title">Now Playing</span>
        </div>

        <p className="dashboard-queue__title desktop-only">
          <LayoutList size={16} />
          <span className="dashboard-queue__title-copy">
            <span className="dashboard-queue__title-text">Queue</span>
            <small className="dashboard-queue__meta">
              {items.length} {items.length === 1 ? 'song' : 'songs'}
              {queueDuration > 0 ? ` · ${formatQueueDuration(queueDuration)}` : ''}
            </small>
          </span>
        </p>
        <div className="dashboard-queue__header-actions" ref={menuRef}>
          <motion.button
            type="button"
            className="dashboard-queue__save-inline"
            onClick={handleSaveQueue}
            disabled={isSaving}
            aria-label="Save queue"
            title="Save queue"
          >
            <BookmarkPlus size={14} />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </motion.button>
          <motion.button
            type="button"
            className="dashboard-queue__clear-inline"
            onClick={handleClearClick}
            disabled={items.length === 0}
            aria-label="Clear queue"
            title="Clear queue"
          >
            <Trash2 size={14} />
            <span>Clear</span>
          </motion.button>
          {isEditMode && selectedQueueItems.length > 0 && (
            <button type="button" className="dashboard-queue__bulk-remove" onClick={handleBulkRemoveSelected}>
              Remove ({selectedQueueItems.length})
            </button>
          )}
          <div className="dashboard-queue__menu-shell">
            <button
              type="button"
              className="dashboard-queue__menu-btn"
              onClick={handleMenuToggle}
              aria-label="Queue options"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
            >
              <MoreHorizontalIcon size={16} />
            </button>
            {isMenuOpen && (
              <div
                className="dashboard-queue__menu"
                role="menu"
                aria-label="Queue options"
                onPointerDown={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => { e.stopPropagation(); handleEditQueue(); }}
                >
                  <GripVertical size={14} />
                  {isEditMode ? 'Close Edit Queue' : 'Edit Queue'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => { e.stopPropagation(); handleFindNowPlaying(); }}
                >
                  <LayoutList size={14} />
                  Find Now Playing
                </button>
              </div>
            )}
          </div>
          {isCompactLayout && isExpanded && (
            <button
              type="button"
              className="dashboard-queue__collapse"
              onClick={(event) => { event.stopPropagation(); onToggleQueue?.(); }}
              aria-label="Collapse queue"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>
      </motion.div>

      <div
        id="app-queue"
        className={`dashboard-queue__list ${isEditMode ? 'editing' : ''}`}
        ref={listRef}
      >
        {items.length === 0 ? (
          <div className="dashboard-queue__empty">
            <Music2 size={20} />
            <p>No songs in queue.</p>
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={getQueueItemKey(item, index)}
              ref={(node) => {
                const playbackId = getTrackPlaybackId(item);
                if (node && playbackId) itemRefs.current.set(playbackId, node);
                else if (playbackId) itemRefs.current.delete(playbackId);
              }}
              className={`dashboard-queue__item ${activeTrackId === getTrackPlaybackId(item) ? 'active' : ''} ${
                isEditMode ? 'editing' : ''
              } ${selectedQueueItems.includes(getQueueItemKey(item, index)) ? 'selected' : ''} ${
                dragOverIndex === index ? 'drop-target' : ''
              }`}
              draggable={isEditMode}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(event) => handleDragOver(event, index)}
              onDrop={(event) => handleDrop(event, index)}
              onDragEnd={handleDragEnd}
              onClick={(event) => {
                if (isEditMode) {
                  if (draggedIndex !== null) return;
                  toggleSelectedItem(getQueueItemKey(item, index));
                  return;
                }
                event.stopPropagation();
                onSelectTrack?.(item);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (isEditMode) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectTrack?.(item);
                }
              }}
            >
              {isEditMode && (
                <span className="dashboard-queue__drag-handle" aria-hidden="true">
                  <GripVertical size={14} />
                </span>
              )}
              <img
                src={item.cover || item.image || FALLBACK_IMAGE}
                alt={item.title}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = FALLBACK_IMAGE;
                }}
              />
              <div className="dashboard-queue__item-content">
                <strong title={item.title}>{item.title}</strong>
                <span title={item.artist || item.subtitle}>{item.artist || item.subtitle}</span>
              </div>
              {!isEditMode && item.duration ? (
                <span className="dashboard-queue__item-duration">{formatQueueDuration(item.duration)}</span>
              ) : null}
              {isEditMode ? (
                <button
                  type="button"
                  className="dashboard-queue__remove-btn"
                  onClick={(e) => handleRemoveItem(e, getQueueItemKey(item, index))}
                  aria-label={`Remove ${item.title} from queue`}
                >
                  <X size={12} />
                </button>
              ) : (
                <motion.button
                  type="button"
                  className="dashboard-queue__item-play"
                  onClick={(event) => { event.stopPropagation(); onPlayTrack?.(item); }}
                  aria-label={`Play ${item.title}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Play size={12} fill="currentColor" />
                </motion.button>
              )}
            </div>
          ))
        )}
      </div>

      {saveStatus.message && (
        <p className={`dashboard-queue__save-status ${saveStatus.type} visible`}>{saveStatus.message}</p>
      )}

      {undoState.visible && (
        <div className="dashboard-queue__undo-toast" role="status" aria-live="polite">
          <span>Queue cleared</span>
          <button type="button" onClick={handleUndoClear}>Undo clear</button>
        </div>
      )}

      {isClearModalOpen && (
        <div className="dashboard-queue__modal" role="presentation" onClick={() => setIsClearModalOpen(false)}>
          <div
            className="dashboard-queue__modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Clear queue confirmation"
            onClick={(event) => event.stopPropagation()}
          >
            <strong>Clear Queue</strong>
            <p>Are you sure you want to clear the queue?</p>
            <div className="dashboard-queue__modal-actions">
              <button type="button" className="dashboard-queue__modal-secondary" onClick={() => setIsClearModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="dashboard-queue__modal-primary" onClick={handleConfirmClear}>
                Clear Queue
              </button>
            </div>
          </div>
        </div>
      )}

      {isCompactLayout && !isExpanded && (
        <button
          type="button"
          className="dashboard-queue__peek-toggle"
          onClick={(event) => { event.stopPropagation(); onToggleQueue?.(); }}
          aria-label="Expand queue"
        >
          <LayoutList size={16} />
        </button>
      )}
    </motion.aside>
  );
}

export default Queue;
