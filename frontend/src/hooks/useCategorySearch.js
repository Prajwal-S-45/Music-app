import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../api/client';

export function useCategorySearch({ query = '', category = 'songs', initialPage = 1, limit = 20, sort = 'relevance' }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState('');
  const [activeSort, setActiveSort] = useState(sort);

  const activeRequestKeyRef = useRef('');

  const fetchCategoryData = useCallback(
    async (targetPage = 1, isAppend = false) => {
      const trimmedQuery = String(query || '').trim();
      const cat = String(category || 'songs').toLowerCase();

      if (!trimmedQuery || trimmedQuery.length < 2) {
        setItems([]);
        setTotal(0);
        setTotalPages(1);
        setHasMore(false);
        setError('');
        setIsLoading(false);
        setIsFetchingMore(false);
        return;
      }

      const requestKey = `${cat}::${trimmedQuery.toLowerCase()}::p${targetPage}::l${limit}::s${activeSort}`;
      activeRequestKeyRef.current = requestKey;

      try {
        if (isAppend) {
          setIsFetchingMore(true);
        } else {
          setIsLoading(true);
        }
        setError('');

        const response = await apiClient.get(`/api/search/${cat}`, {
          params: {
            q: trimmedQuery,
            page: targetPage,
            limit,
            sort: activeSort,
          },
        });

        if (activeRequestKeyRef.current !== requestKey) {
          return; // Ignore stale responses
        }

        const data = response.data || {};
        const rawList = Array.isArray(data.data) ? data.data : [];

        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setHasMore(Boolean(data.hasMore));
        setPage(data.page || targetPage);

        if (isAppend) {
          setItems((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            const newItems = rawList.filter((item) => !existingIds.has(item.id));
            return [...prev, ...newItems];
          });
        } else {
          setItems(rawList);
        }
      } catch (err) {
        if (activeRequestKeyRef.current === requestKey) {
          console.error(`Error loading ${cat} search results:`, err);
          setError(err.response?.data?.error || `Failed to load ${cat} search results.`);
          if (!isAppend) {
            setItems([]);
          }
        }
      } finally {
        if (activeRequestKeyRef.current === requestKey) {
          setIsLoading(false);
          setIsFetchingMore(false);
        }
      }
    },
    [query, category, limit, activeSort]
  );

  // Re-fetch when query, category, or sort changes
  useEffect(() => {
    setPage(1);
    fetchCategoryData(1, false);
  }, [query, category, activeSort, fetchCategoryData]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || isFetchingMore) return;
    const nextPage = page + 1;
    fetchCategoryData(nextPage, true);
  }, [hasMore, isLoading, isFetchingMore, page, fetchCategoryData]);

  const goToPage = useCallback(
    (targetPage) => {
      const p = Math.max(1, Math.min(targetPage, totalPages));
      if (p === page && !error) return;
      fetchCategoryData(p, false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [totalPages, page, error, fetchCategoryData]
  );

  const refetch = useCallback(() => {
    fetchCategoryData(page, false);
  }, [fetchCategoryData, page]);

  return {
    items,
    page,
    total,
    totalPages,
    hasMore,
    isLoading,
    isFetchingMore,
    error,
    sort: activeSort,
    setSort: setActiveSort,
    loadMore,
    goToPage,
    refetch,
  };
}

export default useCategorySearch;
