import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Album,
  Clock3,
  History,
  ListMusic,
  MoreHorizontal,
  Music2,
  Play,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import '../styles/HistoryPage.css';

const PAGE_SIZE = 30;
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

const typeMeta = {
  song: { icon: Music2, label: 'Played' },
  search: { icon: Search, label: 'Searched' },
  artist: { icon: UserRound, label: 'Viewed artist' },
  album: { icon: Album, label: 'Viewed album' },
  playlist: { icon: ListMusic, label: 'Opened playlist' },
};

const toTime = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getRelativeTime = (value) => {
  const date = toTime(value);
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diffMs < minute) return 'Just now';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} minutes ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} hours ago`;
  if (diffMs < day * 2) return 'Yesterday';
  if (diffMs < week) return `${Math.floor(diffMs / day)} days ago`;
  return `${Math.floor(diffMs / week)} weeks ago`;
};

const getSectionName = (value) => {
  const activityDay = startOfDay(toTime(value));
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (activityDay.getTime() === today.getTime()) return 'Today';
  if (activityDay.getTime() === yesterday.getTime()) return 'Yesterday';
  return 'Older';
};

const groupActivities = (items) => {
  return items.reduce((groups, item) => {
    const group = getSectionName(item.timestamp);
    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
    return groups;
  }, {});
};

const getActivityText = (item) => {
  const meta = typeMeta[item.type] || typeMeta.song;
  return `${meta.label} ${getRelativeTime(item.timestamp)}`;
};

function HistoryPage({ token, onPlayTrack, onSearchSubmit }) {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const loaderRef = useRef(null);
  const navigate = useNavigate();

  const fetchHistory = useCallback(async ({ offset = 0, append = false } = {}) => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await apiClient.get('/api/history', {
        params: { limit: PAGE_SIZE, offset },
      });

      const nextItems = Array.isArray(response.data?.data) ? response.data.data : [];
      setItems((current) => (append ? [...current, ...nextItems] : nextItems));
      setHasMore(Boolean(response.data?.hasMore));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [token]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    const node = loaderRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting && hasMore && !loading && !loadingMore) {
        fetchHistory({ offset: items.length, append: true });
      }
    }, { rootMargin: '240px' });

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchHistory, hasMore, items.length, loading, loadingMore]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;

    return items.filter((item) => {
      return [item.type, item.title, item.subtitle, item.target]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [items, query]);

  const groupedItems = useMemo(() => groupActivities(filteredItems), [filteredItems]);
  const sectionNames = ['Today', 'Yesterday', 'Older'].filter((name) => groupedItems[name]?.length);

  const handleOpen = (item) => {
    setOpenMenuId(null);

    if (item.type === 'song') {
      onPlayTrack?.({
        id: item.metadata?.id || item.metadata?.videoId || item.target || item.title,
        videoId: item.metadata?.videoId || item.metadata?.id || item.target,
        title: item.title,
        artist: item.subtitle,
        cover: item.image,
        thumbnail: item.image,
        duration: item.metadata?.duration || 0,
        source: item.metadata?.source || 'youtube',
      });
      return;
    }

    if (item.type === 'search') {
      onSearchSubmit?.(item.title);
      return;
    }

    if (item.target) {
      navigate(item.target);
      return;
    }

    if (item.type === 'artist') {
      navigate(`/artist/${encodeURIComponent(item.title)}`);
    } else if (item.type === 'playlist') {
      navigate('/library');
    } else {
      navigate('/');
    }
  };

  const handleRemove = async (itemId) => {
    setOpenMenuId(null);
    setItems((current) => current.filter((item) => item.id !== itemId));
    await apiClient.delete(`/api/history/${itemId}`);
  };

  const handleClear = async () => {
    await apiClient.delete('/api/history');
    setItems([]);
    setShowClearModal(false);
  };

  const renderSkeletons = () => (
    <div className="history-skeleton-list">
      {Array.from({ length: 8 }).map((_, index) => (
        <div className="history-skeleton-card" key={index}>
          <span />
          <div>
            <i />
            <i />
          </div>
          <b />
        </div>
      ))}
    </div>
  );

  return (
    <motion.section
      className="history-page"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="history-page__header">
        <div>
          <span className="history-page__eyebrow">Activity Feed</span>
          <h1>History</h1>
          <p>View your recent activity across the platform</p>
        </div>

        <div className="history-page__tools">
          <label className="history-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search your activity..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <motion.button
            type="button"
            className="history-clear"
            onClick={() => setShowClearModal(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            disabled={items.length === 0}
          >
            <Trash2 size={17} />
            <span>Clear History</span>
          </motion.button>
        </div>
      </header>

      {loading ? (
        renderSkeletons()
      ) : items.length === 0 ? (
        <div className="history-empty">
          <div><History size={42} /></div>
          <h2>No Activity Yet</h2>
          <p>Your searches and listening activity will appear here.</p>
          <button type="button" onClick={() => navigate('/')}>Browse Music</button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="history-empty history-empty--compact">
          <h2>No matching activity</h2>
          <p>Try a different song, artist, album, playlist, or search query.</p>
        </div>
      ) : (
        <div className="history-feed">
          {sectionNames.map((sectionName) => (
            <section className="history-section" key={sectionName}>
              <div className="history-section__title">{sectionName}</div>

              <motion.div
                className="history-section__items"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.045 } },
                }}
              >
                {groupedItems[sectionName].map((item) => {
                  const meta = typeMeta[item.type] || typeMeta.song;
                  const Icon = meta.icon;
                  const highlighted = item.type === 'song';

                  return (
                    <motion.article
                      key={item.id}
                      className={`history-card ${highlighted ? 'history-card--highlight' : ''}`}
                      tabIndex={0}
                      role="button"
                      onClick={() => handleOpen(item)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleOpen(item);
                        }
                      }}
                      variants={{
                        hidden: { opacity: 0, y: 16 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.28 } },
                      }}
                      whileHover={{ y: -2, scale: 1.006 }}
                    >
                      <div className="history-card__media">
                        {item.type === 'search' ? (
                          <Icon size={22} />
                        ) : (
                          <img
                            src={item.image || FALLBACK_IMAGE}
                            alt={item.title}
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src = FALLBACK_IMAGE;
                            }}
                          />
                        )}
                        <span className="history-card__type">
                          <Icon size={14} />
                        </span>
                      </div>

                      <div className="history-card__body">
                        <h3>{item.title}</h3>
                        <p>{item.subtitle || getActivityText(item)}</p>
                      </div>

                      <div className="history-card__time">
                        <Clock3 size={14} />
                        <span>{getActivityText(item)}</span>
                      </div>

                      <div className="history-card__menu-wrap" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          className="history-card__menu-btn"
                          onClick={() => setOpenMenuId((value) => (value === item.id ? null : item.id))}
                          aria-haspopup="menu"
                          aria-expanded={openMenuId === item.id}
                        >
                          <MoreHorizontal size={18} />
                        </button>

                        <AnimatePresence>
                          {openMenuId === item.id && (
                            <motion.div
                              className="history-menu"
                              role="menu"
                              initial={{ opacity: 0, y: 8, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            >
                              <button type="button" onClick={() => handleOpen(item)}>
                                <Play size={15} /> <span>Play Again</span>
                              </button>
                              <button type="button" onClick={() => handleOpen(item)}>
                                <ListMusic size={15} /> <span>Open Details</span>
                              </button>
                              <button type="button" className="danger" onClick={() => handleRemove(item.id)}>
                                <Trash2 size={15} /> <span>Remove From History</span>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.article>
                  );
                })}
              </motion.div>
            </section>
          ))}

          <div ref={loaderRef} className="history-loader">
            {loadingMore && renderSkeletons()}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showClearModal && (
          <motion.div
            className="history-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="history-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="history-clear-title"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
            >
              <h2 id="history-clear-title">Clear all history?</h2>
              <p>This action cannot be undone.</p>
              <div>
                <button type="button" onClick={() => setShowClearModal(false)}>Cancel</button>
                <button type="button" className="danger" onClick={handleClear}>Clear</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

export default HistoryPage;
