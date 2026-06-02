import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookmarkPlus,
  ChevronLeft,
  GripVertical,
  ListMusic,
  MoreHorizontalIcon,
  Music2,
  Play,
  Trash2,
  X,
} from 'lucide-react';
import { saveQueueToLibrary } from '../utils/savedQueues';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

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
  const [isHovered, setIsHovered] = useState(false);
  const shouldShowQueueDetails = !isCompactLayout || isExpanded || isHovered || isEditMode;
  const undoTimerRef = useRef(null);
  const menuRef = useRef(null);
  const listRef = useRef(null);
  const itemRefs = useRef(new Map());

  const showStatus = (type, message) => {
    setSaveStatus({ type, message });
    window.setTimeout(() => {
      setSaveStatus((prev) => (prev.message === message ? { type: '', message: '' } : prev));
    }, 2600);
  };

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        window.clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const activeIndex = useMemo(() => items.findIndex((item) => item.id === activeTrackId), [items, activeTrackId]);

  const scrollToNowPlaying = () => {
    if (!listRef.current || activeTrackId == null) {
      return false;
    }

    const activeElement = itemRefs.current.get(activeTrackId);
    if (!activeElement) {
      return false;
    }

    const listElement = listRef.current;
    const targetTop = Math.max(
      0,
      activeElement.offsetTop - listElement.clientHeight / 2 + activeElement.clientHeight / 2
    );

    listElement.scrollTo({ top: targetTop, behavior: 'smooth' });
    return true;
  };

  useEffect(() => {
    if (activeTrackId) {
      scrollToNowPlaying();
    }
  }, [activeTrackId, items]);

  const handleSaveQueue = async (event) => {
    event.stopPropagation();

    if (isSaving) {
      return;
    }

    const uniqueQueue = items.filter((song, index, list) => {
      if (!song?.id) {
        return false;
      }
      return list.findIndex((entry) => entry?.id === song.id) === index;
    });

    if (uniqueQueue.length === 0) {
      showStatus('error', 'Queue is empty');
      return;
    }

    const suggestedName = 'Saved Queue';
    const customName = window.prompt('Enter playlist name', suggestedName);
    if (customName === null) {
      return;
    }

    const playlistName = customName.trim() || suggestedName;

    try {
      setIsSaving(true);
      setSaveStatus({ type: '', message: '' });

      saveQueueToLibrary({
        name: playlistName,
        songs: uniqueQueue,
      });

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

    if (items.length === 0) {
      showStatus('error', 'Queue is already empty');
      return;
    }

    setIsClearModalOpen(true);
  };

  const handleConfirmClear = () => {
    setIsClearModalOpen(false);

    const snapshot = items.slice();
    onClearQueue?.();

    setUndoState({ visible: true, items: snapshot });

    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
    }

    undoTimerRef.current = window.setTimeout(() => {
      setUndoState({ visible: false, items: [] });
    }, 5000);
  };

  const handleUndoClear = () => {
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
    }

    if (undoState.items.length > 0) {
      onRestoreQueue?.(undoState.items);
    }

    setUndoState({ visible: false, items: [] });
  };

  const handleFindNowPlaying = () => {
    setIsMenuOpen(false);

    if (activeIndex < 0 || !scrollToNowPlaying()) {
      showStatus('error', 'Now playing track is not in queue');
      return;
    }
  };

  const handleMenuToggle = (event) => {
    event.stopPropagation();
    setIsMenuOpen((value) => !value);
  };

  const handleDragStart = (index) => {
    if (!isEditMode) {
      return;
    }

    setDraggedIndex(index);
  };

  const handleDragOver = (event, overIndex) => {
    if (!isEditMode) {
      return;
    }

    event.preventDefault();

    if (draggedIndex === null || draggedIndex === overIndex) {
      return;
    }

    setDragOverIndex(overIndex);
    onReorderQueue?.(draggedIndex, overIndex);
    setDraggedIndex(overIndex);
  };

  const handleDrop = (event, dropIndex) => {
    if (!isEditMode || draggedIndex === null) {
      return;
    }

    event.preventDefault();
    if (draggedIndex !== dropIndex) {
      onReorderQueue?.(draggedIndex, dropIndex);
    }
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

  const toggleSelectedItem = (queueItemId) => {
    setSelectedQueueItems((currentSelected) =>
      currentSelected.includes(queueItemId)
        ? currentSelected.filter((itemId) => itemId !== queueItemId)
        : [...currentSelected, queueItemId]
    );
  };

  const clearSelection = () => {
    setSelectedQueueItems([]);
  };

  const handleBulkRemoveSelected = () => {
    if (selectedQueueItems.length === 0) {
      return;
    }

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

  return (
    <motion.aside
      className={`dashboard-queue ${isExpanded ? 'open' : 'collapsed'} ${isCompactLayout ? 'mobile' : 'desktop'} ${
        isEditMode ? 'editing' : ''
      } ${isHovered ? 'hovered' : ''}`}
      role="complementary"
      aria-label="Playback queue"
      onMouseEnter={() => !isCompactLayout && setIsHovered(true)}
      onMouseLeave={() => !isCompactLayout && setIsHovered(false)}
      animate={{
        width: isCompactLayout ? 'auto' : isHovered || isEditMode ? 'clamp(460px, 32vw, 540px)' : '280px',
      }}
      transition={{
        width: {
          duration: 0.28,
          ease: 'easeInOut',
        },
      }}
    >
      <motion.div
        className="dashboard-queue__header"
        animate={{
          opacity: 1,
          pointerEvents: 'auto',
        }}
        transition={{
          opacity: { duration: 0.22 },
        }}
      >
        <p>
          <ListMusic size={16} />
          <span>Queue</span>
        </p>
        <div className="dashboard-queue__header-actions" ref={menuRef}>
          <motion.button
            type="button"
            className="dashboard-queue__save-inline"
            onClick={handleSaveQueue}
            disabled={isSaving}
            aria-label="Save queue"
            title="Save queue"
            animate={{
              opacity: 1,
            }}
            transition={{ opacity: { duration: 0.2 } }}
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
            animate={{
              opacity: 1,
            }}
            transition={{ opacity: { duration: 0.2 } }}
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
              <div className="dashboard-queue__menu" role="menu" aria-label="Queue options">
                <button type="button" role="menuitem" onClick={handleEditQueue}>
                  <GripVertical size={14} />
                  {isEditMode ? 'Close Edit Queue' : 'Edit Queue'}
                </button>
                <button type="button" role="menuitem" onClick={handleFindNowPlaying}>
                  <ListMusic size={14} />
                  Find Now Playing
                </button>
              </div>
            )}
          </div>
          {isCompactLayout && isExpanded && (
            <button
              type="button"
              className="dashboard-queue__collapse"
              onClick={(event) => {
                event.stopPropagation();
                onToggleQueue?.();
              }}
              aria-label="Collapse queue"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>
      </motion.div>

      <motion.div
        id="app-queue"
        className={`dashboard-queue__list ${isEditMode ? 'editing' : ''}`}
        ref={listRef}
        animate={{
                gridTemplateColumns: isCompactLayout || isHovered || isEditMode ? 'auto minmax(0, 1fr)' : '1fr',
        }}
        transition={{
          gridTemplateColumns: { duration: 0.28 },
        }}
      >
        {items.length === 0 ? (
          <div className="dashboard-queue__empty">
            <Music2 size={20} />
            <p>No songs in queue.</p>
          </div>
        ) : (
          items.map((item, index) => (
            <motion.div
              key={item.id || `${item.title}-${index}`}
              ref={(node) => {
                if (node) {
                  itemRefs.current.set(item.id, node);
                } else {
                  itemRefs.current.delete(item.id);
                }
              }}
              className={`dashboard-queue__item ${activeTrackId === item.id ? 'active' : ''} ${
                isEditMode ? 'editing' : ''
              } ${selectedQueueItems.includes(item.id) ? 'selected' : ''} ${
                dragOverIndex === index ? 'drop-target' : ''
              }`}
              draggable={isEditMode}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(event) => handleDragOver(event, index)}
              onDrop={(event) => handleDrop(event, index)}
              onDragEnd={handleDragEnd}
              onClick={(event) => {
                if (isEditMode) {
                  if (draggedIndex !== null) {
                    return;
                  }

                  toggleSelectedItem(item.id);
                  return;
                }

                event.stopPropagation();
                onSelectTrack?.(item);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (isEditMode) {
                  return;
                }

                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectTrack?.(item);
                }
              }}
              animate={{
                gridColumn: shouldShowQueueDetails ? '1 / -1' : 'auto',
                justifySelf: shouldShowQueueDetails ? 'stretch' : 'center',
                maxWidth: shouldShowQueueDetails ? 'none' : '64px',
              }}
              transition={{
                gridColumn: { duration: 0.28 },
                justifySelf: { duration: 0.28 },
                maxWidth: { duration: 0.28 },
              }}
            >
              {isEditMode && (
                <span className="dashboard-queue__drag-handle" aria-hidden="true">
                  <GripVertical size={14} />
                </span>
              )}
              {isEditMode && (
                <label className="dashboard-queue__select-box" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedQueueItems.includes(item.id)}
                    onChange={() => toggleSelectedItem(item.id)}
                    aria-label={`Select ${item.title}`}
                  />
                  <span />
                </label>
              )}
              <motion.img
                src={item.cover || item.image || FALLBACK_IMAGE}
                alt={item.title}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = FALLBACK_IMAGE;
                }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.18 }}
              />
              <motion.div
                className="dashboard-queue__item-content"
                animate={{
                  opacity: shouldShowQueueDetails ? 1 : 0,
                  maxWidth: shouldShowQueueDetails ? '100%' : '0px',
                  pointerEvents: shouldShowQueueDetails ? 'auto' : 'none',
                }}
                transition={{
                  opacity: { duration: 0.22 },
                  maxWidth: { duration: 0.26 },
                }}
              >
                <strong title={item.title}>{item.title}</strong>
                <span title={item.artist || item.subtitle}>{item.artist || item.subtitle}</span>
              </motion.div>
              {isEditMode && (
                <button
                  type="button"
                  className="dashboard-queue__remove-btn"
                  onClick={(event) => handleRemoveItem(event, item.id)}
                  aria-label={`Remove ${item.title} from queue`}
                  title="Remove song"
                >
                  <X size={12} />
                </button>
              )}
              {!isEditMode && (
                <motion.button
                  type="button"
                  className="dashboard-queue__item-play"
                  onClick={(event) => {
                    event.stopPropagation();
                    onPlayTrack?.(item);
                  }}
                  aria-label={`Play ${item.title}`}
                  title={`Play ${item.title}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                >
                  <Play size={12} fill="currentColor" />
                </motion.button>
              )}
            </motion.div>
          ))
        )}
      </motion.div>

      {saveStatus.message && (
        <p className={`dashboard-queue__save-status ${saveStatus.type} visible`}>{saveStatus.message}</p>
      )}

      {undoState.visible && (
        <div className="dashboard-queue__undo-toast" role="status" aria-live="polite">
          <span>Queue cleared</span>
          <button type="button" onClick={handleUndoClear}>
            Undo clear
          </button>
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
          onClick={(event) => {
            event.stopPropagation();
            onToggleQueue?.();
          }}
          aria-label="Expand queue"
        >
          <ListMusic size={16} />
        </button>
      )}
    </motion.aside>
  );
}

export default Queue;