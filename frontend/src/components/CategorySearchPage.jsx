import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, RefreshCw, AlertTriangle, Layers, ListFilter } from 'lucide-react';
import useCategorySearch from '../hooks/useCategorySearch';
import SearchCategoryTabs from './SearchCategoryTabs';
import CategoryHeader from './CategoryHeader';
import CategoryResultsGrid from './CategoryResultsGrid';
import PaginationControl from './PaginationControl';
import apiClient from '../api/client';
import { buildSongLikePayload } from '../utils/songPayload';
import '../styles/Search.css';

function CategorySkeleton({ category }) {
  return (
    <div className="category-skeleton-container">
      {category === 'songs' ? (
        <div className="search-skeleton-list">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="search-skeleton search-skeleton--row" />
          ))}
        </div>
      ) : (
        <div className="search-skeleton-grid">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="search-skeleton search-skeleton--card" />
          ))}
        </div>
      )}
    </div>
  );
}

function CategorySearchPage({ token, activeTrackId, onPlayTrack, onQueueTrack, onLikeUpdate, onHistoryRecord }) {
  const { category = 'songs' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = searchParams.get('q') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const sortParam = searchParams.get('sort') || 'relevance';

  const [mode, setMode] = useState('pagination'); // 'pagination' or 'infinite'
  const [likedSongIds, setLikedSongIds] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');

  const {
    items,
    page,
    total,
    totalPages,
    hasMore,
    isLoading,
    isFetchingMore,
    error,
    sort,
    setSort,
    loadMore,
    goToPage,
    refetch,
  } = useCategorySearch({
    query,
    category,
    initialPage: pageParam,
    limit: 20,
    sort: sortParam,
  });

  const sentinelRef = useRef(null);

  // Fetch liked songs
  const fetchLikedSongs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiClient.get('/api/music/liked', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setLikedSongIds(list.map((s) => s.id));
    } catch {
      // Ignore
    }
  }, [token]);

  useEffect(() => {
    fetchLikedSongs();
  }, [fetchLikedSongs]);

  // Keep URL search params in sync with state
  const handlePageChange = useCallback(
    (nextPage) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set('page', String(nextPage));
          return p;
        },
        { replace: true }
      );
      goToPage(nextPage);
    },
    [goToPage, setSearchParams]
  );

  const handleSortChange = useCallback(
    (nextSort) => {
      setSort(nextSort);
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set('sort', nextSort);
          p.set('page', '1');
          return p;
        },
        { replace: true }
      );
    },
    [setSort, setSearchParams]
  );

  const handleQuerySubmit = useCallback(
    (nextQuery) => {
      navigate(`/search/${category}?q=${encodeURIComponent(nextQuery)}&page=1&sort=${sort}`);
    },
    [category, navigate, sort]
  );

  // Infinite Scroll IntersectionObserver
  useEffect(() => {
    if (mode !== 'infinite' || !hasMore || isLoading || isFetchingMore) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '300px' }
    );

    const target = sentinelRef.current;
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [mode, hasMore, isLoading, isFetchingMore, loadMore]);

  // Handle play song
  const handlePlay = useCallback(
    (song) => {
      onPlayTrack?.(song);
      setStatusMessage(`Playing ${song.title || song.name}`);
      setTimeout(() => setStatusMessage(''), 2500);
    },
    [onPlayTrack]
  );

  // Handle like song
  const handleLike = useCallback(
    async (song) => {
      if (!token) {
        setStatusMessage('Login required to like songs.');
        setTimeout(() => setStatusMessage(''), 2500);
        return;
      }
      try {
        await apiClient.post('/api/music/like', buildSongLikePayload(song), {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLikedSongIds((prev) => [...new Set([...prev, song.id])]);
        setStatusMessage(`Liked ${song.title || song.name}`);
        onLikeUpdate?.();
      } catch (err) {
        if (err.response?.status === 400) {
          setStatusMessage('Song already liked.');
        } else {
          setStatusMessage('Could not like song right now.');
        }
      } finally {
        setTimeout(() => setStatusMessage(''), 2500);
      }
    },
    [token, onLikeUpdate]
  );

  // Handle queue song
  const handleQueue = useCallback(
    (song) => {
      onQueueTrack?.(song);
      setStatusMessage(`${song.title || song.name} added to queue`);
      setTimeout(() => setStatusMessage(''), 2500);
    },
    [onQueueTrack]
  );

  return (
    <div className="search-page-shell min-h-screen text-slate-100">
      <div className="search-page-shell__glow search-page-shell__glow--left" />
      <div className="search-page-shell__glow search-page-shell__glow--right" />

      <div className="search-page-shell__content mx-auto w-full max-w-7xl pb-24 pt-20 px-4 md:px-8 md:pb-10 md:pt-28">
        {/* Category Navigation Tabs */}
        <SearchCategoryTabs activeCategory={category} query={query} />

        {/* Category Header with Unified Toolbar */}
        <CategoryHeader
          category={category}
          query={query}
          total={total}
          sort={sort}
          mode={mode}
          onSortChange={handleSortChange}
          onModeChange={setMode}
        />

        {/* Content Area */}
        <div className="category-page-body">
          {isLoading && items.length === 0 ? (
            <CategorySkeleton category={category} />
          ) : error ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="search-empty-state search-empty-state--error">
              <AlertTriangle size={28} className="text-amber-400 mb-2" />
              <h2>Category search failed</h2>
              <p>{error}</p>
              <button type="button" className="retry-btn mt-4" onClick={refetch}>
                <RefreshCw size={15} /> Try Again
              </button>
            </motion.div>
          ) : items.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="search-empty-state">
              <SearchIcon size={28} className="text-slate-400 mb-2" />
              <h2>No {category} found</h2>
              <p>We couldn't find any {category} matching "{query}". Try checking for typos or searching a different term.</p>
            </motion.div>
          ) : (
            <>
              <CategoryResultsGrid
                category={category}
                items={items}
                activeTrackId={activeTrackId}
                likedSongIds={likedSongIds}
                onPlayTrack={handlePlay}
                onLikeTrack={handleLike}
                onQueueTrack={handleQueue}
              />

              {/* Mode 1: Traditional Pagination */}
              {mode === 'pagination' && (
                <PaginationControl
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  isLoading={isLoading}
                />
              )}

              {/* Mode 2: Infinite Scroll Sentinel */}
              {mode === 'infinite' && (
                <div ref={sentinelRef} className="infinite-scroll-sentinel">
                  {isFetchingMore && (
                    <div className="infinite-loading-spinner">
                      <RefreshCw size={20} className="animate-spin" />
                      <span>Loading more {category}...</span>
                    </div>
                  )}
                  {!hasMore && items.length > 0 && (
                    <div className="infinite-end-notice">You've reached the end of the results.</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Status Toast */}
        <AnimatePresence>
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="search-status-pill mt-4"
            >
              {statusMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default CategorySearchPage;
