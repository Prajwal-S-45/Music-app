// HistoryPage.jsx - Cache Buster v3
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Album,
  ChevronLeft,
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
import historyHeaderBg from '../assets/history_header_bg.png';
import '../styles/HistoryPage.css';

const PAGE_SIZE = 40;
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
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  if (diffMs < day * 2) return 'Yesterday';
  if (diffMs < week) return `${Math.floor(diffMs / day)}d ago`;
  return `${Math.floor(diffMs / week)}w ago`;
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
  return `${meta.label} • ${getRelativeTime(item.timestamp)}`;
};

const getSongId = (...values) => {
  return values
    .map((value) => String(value || '').trim())
    .find(Boolean);
};

const formatDuration = (secs) => {
  if (!secs) return '';
  const minutes = Math.floor(secs / 60);
  const seconds = Math.floor(secs % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

function HistoryPage({ token, activeTrackId, onPlayTrack, onSearchSubmit }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('recently-played'); // 'recently-played' | 'recently-searched' | 'play-history'
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const loaderRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchHistory = useCallback(async ({ offset = 0, append = false } = {}) => {
    if (!token) {
      setItems([]);
      setErrorMessage('');
      setLoading(false);
      return;
    }

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      setErrorMessage('');
      const response = await apiClient.get('/api/history', {
        params: { limit: PAGE_SIZE, offset },
      });

      const nextItems = Array.isArray(response.data?.data) ? response.data.data : [];
      setItems((current) => (append ? [...current, ...nextItems] : nextItems));
      setHasMore(Boolean(response.data?.hasMore));
    } catch (error) {
      console.error('Could not load history:', error);
      setErrorMessage(append ? 'Could not load more history.' : 'Could not load history right now.');
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

  // Tab Filtering & Processing Logic
  const processedItems = useMemo(() => {
    if (activeTab === 'recently-played') {
      // Deduplicated unique played items (excluding search queries)
      const seen = new Set();
      return items.filter((item) => {
        if (item.type === 'search') return false;

        const songId = getSongId(item.metadata?.id, item.metadata?.songId, item.target);
        const source = item.metadata?.source || 'jiosaavn';
        const key = songId
          ? `${source}-${songId}`
          : `${item.type}-${item.title}-${item.subtitle || ''}`;

        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } else if (activeTab === 'recently-searched') {
      // Only search history queries
      return items.filter((item) => item.type === 'search');
    } else {
      // 'play-history': All song items chronologically (allows duplicates)
      return items.filter((item) => item.type === 'song');
    }
  }, [items, activeTab]);

  const groupedItems = useMemo(() => groupActivities(processedItems), [processedItems]);
  const sectionNames = ['Today', 'Yesterday', 'Older'].filter((name) => groupedItems[name]?.length);

  const isSongPlaying = (item) => {
    if (item.type !== 'song') return false;
    const songId = getSongId(item.metadata?.id, item.metadata?.songId, item.target);
    return songId && songId === activeTrackId;
  };

  const handleOpen = (item) => {
    setOpenMenuId(null);
    setErrorMessage('');

    if (item.type === 'song') {
      const songId = getSongId(item.metadata?.id, item.metadata?.songId, item.target);
      if (!songId) {
        setErrorMessage('Could not play this history item because its song ID is unavailable.');
        return;
      }

      onPlayTrack?.({
        id: songId,
        title: item.title,
        artist: item.subtitle,
        cover: item.image,
        thumbnail: item.image,
        duration: item.metadata?.duration || 0,
        source: item.metadata?.source || 'jiosaavn',
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
      navigate(`/artists/${encodeURIComponent(item.title)}`);
    } else if (item.type === 'playlist') {
      navigate('/library');
    } else {
      navigate('/');
    }
  };

  const handleRemove = async (itemId) => {
    setOpenMenuId(null);
    try {
      setErrorMessage('');
      await apiClient.delete(`/api/history/${itemId}`);
      setItems((current) => current.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error('Could not remove history item:', error);
      setErrorMessage('Could not remove this history item. Please try again.');
    }
  };

  const handleClear = async () => {
    try {
      setErrorMessage('');
      await apiClient.delete('/api/history');
      setItems([]);
      setShowClearModal(false);
    } catch (error) {
      console.error('Could not clear history:', error);
      setErrorMessage('Could not clear history. Please try again.');
    }
  };

  const renderSkeletons = () => (
    <div className="history-skeleton-list">
      {Array.from({ length: 6 }).map((_, index) => (
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
      className={`history-page ${isMobile ? 'history-page--mobile' : 'history-page--desktop'}`}
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Mobile Top Navigation Bar */}
      {isMobile && (
        <div className="history-mobile-nav">
          <button type="button" className="history-mobile-nav__back" onClick={() => navigate(-1)} aria-label="Go back">
            <ChevronLeft size={24} />
          </button>
          <span className="history-mobile-nav__title">History</span>
          <button
            type="button"
            className="history-mobile-nav__clear"
            onClick={() => setShowClearModal(true)}
            disabled={items.length === 0}
            aria-label="Clear history"
          >
            <Trash2 size={20} />
          </button>
        </div>
      )}

      {/* Header Banner - Desktop vs Mobile Layout */}
      {isMobile ? (
        <div className="history-mobile-banner">
          <img src={historyHeaderBg} alt="History background" />
        </div>
      ) : (
        <header className="history-page__header">
          <div className="history-page__header-text">
            <h1>History</h1>
            <p>Songs you've played and searched</p>
          </div>
        </header>
      )}

      {/* Tabs & Clear Action Bar */}
      <div className="history-controls-bar">
        <div className="history-pills-tabs">
          <button
            type="button"
            className={`history-pill-tab ${activeTab === 'recently-played' ? 'active' : ''}`}
            onClick={() => setActiveTab('recently-played')}
          >
            Recently Played
          </button>
          <button
            type="button"
            className={`history-pill-tab ${activeTab === 'recently-searched' ? 'active' : ''}`}
            onClick={() => setActiveTab('recently-searched')}
          >
            Recently Searched
          </button>
          <button
            type="button"
            className={`history-pill-tab ${activeTab === 'play-history' ? 'active' : ''}`}
            onClick={() => setActiveTab('play-history')}
          >
            Play History
          </button>
        </div>

        {!isMobile && (
          <motion.button
            type="button"
            className="history-clear-btn"
            onClick={() => setShowClearModal(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            disabled={items.length === 0}
          >
            <Trash2 size={16} />
            <span>Clear History</span>
          </motion.button>
        )}
      </div>

      {errorMessage ? (
        <p className="history-page__error" role="alert">{errorMessage}</p>
      ) : null}

      {/* Feed List */}
      {loading ? (
        renderSkeletons()
      ) : items.length === 0 ? (
        <div className="history-empty">
          <div><History size={42} /></div>
          <h2>No Activity Yet</h2>
          <p>Your searches and listening activity will appear here.</p>
          <button type="button" onClick={() => navigate('/')}>Browse Music</button>
        </div>
      ) : (
        <>
          {processedItems.length === 0 ? (
            <div className="history-empty history-empty--compact">
              <h2>No activity found</h2>
              <p>Try playing songs or searching for tracks first.</p>
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
                      visible: { transition: { staggerChildren: 0.04 } },
                    }}
                  >
                    {groupedItems[sectionName].map((item) => {
                      const meta = typeMeta[item.type] || typeMeta.song;
                      const Icon = meta.icon;
                      const isSongType = item.type === 'song';
                      const isCurrent = isSongPlaying(item);

                      return (
                        <motion.article
                          key={item.id}
                          className={`history-card ${isCurrent ? 'history-card--active' : ''} ${isSongType ? 'history-card--song' : ''}`}
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
                            hidden: { opacity: 0, y: 12 },
                            visible: { opacity: 1, y: 0, transition: { duration: 0.24 } },
                          }}
                          whileHover={{ y: -2 }}
                        >
                          <div className="history-card__media">
                            {item.type === 'search' ? (
                              <Icon size={22} />
                            ) : (
                              <>
                                <img
                                  src={item.image || FALLBACK_IMAGE}
                                  alt={item.title}
                                  loading="lazy"
                                  onError={(event) => {
                                    event.currentTarget.onerror = null;
                                    event.currentTarget.src = FALLBACK_IMAGE;
                                  }}
                                />
                                {isSongType && !isCurrent && (
                                  <div className="history-card__play-overlay">
                                    <Play size={14} fill="currentColor" />
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Equalizer Indicator for currently playing tracks */}
                          {isCurrent && (
                            <div className="history-card__equalizer" title="Currently Playing">
                              <span className="eq-bar eq-bar-1"></span>
                              <span className="eq-bar eq-bar-2"></span>
                              <span className="eq-bar eq-bar-3"></span>
                            </div>
                          )}

                          <div className="history-card__body">
                            <h3 className={isCurrent ? 'text-active' : ''}>{item.title}</h3>
                            <p>{item.subtitle || getActivityText(item)}</p>
                          </div>

                          <div className="history-card__right-details">
                            {isSongType && item.metadata?.duration ? (
                              <span className="history-card__duration">
                                {formatDuration(item.metadata.duration)}
                              </span>
                            ) : (
                              <span className="history-card__time-ago">
                                {getRelativeTime(item.timestamp)}
                              </span>
                            )}

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
                                      <Play size={15} /> <span>{item.type === 'search' ? 'Search Again' : 'Play'}</span>
                                    </button>
                                    <button type="button" className="danger" onClick={() => handleRemove(item.id)}>
                                      <Trash2 size={15} /> <span>Remove</span>
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </motion.article>
                      );
                    })}
                  </motion.div>
                </section>
              ))}
            </div>
          )}

          <div ref={loaderRef} className="history-loader">
            {loadingMore && renderSkeletons()}
          </div>
        </>
      )}

      {/* Confirmation Modal */}
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
              <p>This action cannot be undone. All play logs, search queries, and activity items will be permanently deleted.</p>
              {errorMessage ? (
                <p className="history-modal__error" role="alert">{errorMessage}</p>
              ) : null}
              <div className="history-modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowClearModal(false)}>Cancel</button>
                <button type="button" className="danger btn-clear" onClick={handleClear}>Clear</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

export default HistoryPage;
