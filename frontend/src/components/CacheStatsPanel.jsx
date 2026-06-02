import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';

const POLL_INTERVAL_MS = 8000;

const formatPercent = (value) => {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toFixed(1)}%`;
};

const formatUptime = (uptimeMs) => {
  const totalSeconds = Math.max(0, Math.floor(Number(uptimeMs || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
};

function StatItem({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function CacheStatsPanel() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/cache/stats');
      setStats(response.data?.cache || null);
      setErrorMessage('');
      setLastUpdatedAt(new Date());
    } catch (error) {
      setErrorMessage('Could not load cache metrics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      if (!isMounted) {
        return;
      }
      await fetchStats();
    };

    loadStats();
    const intervalId = window.setInterval(loadStats, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [fetchStats]);

  const computed = useMemo(() => {
    const search = stats?.search || {};
    const trending = stats?.trending || {};

    const searchTotal = Number(search.hits || 0) + Number(search.misses || 0);
    const trendingTotal = Number(trending.hits || 0) + Number(trending.misses || 0);

    const searchHitRate = searchTotal > 0 ? (Number(search.hits || 0) / searchTotal) * 100 : 0;
    const trendingHitRate = trendingTotal > 0 ? (Number(trending.hits || 0) / trendingTotal) * 100 : 0;

    return {
      search,
      trending,
      searchHitRate,
      trendingHitRate,
      uptime: formatUptime(stats?.uptimeMs || 0),
    };
  }, [stats]);

  if (isLoading) {
    return (
      <section className="dashboard-section rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm text-slate-600">Loading cache diagnostics...</p>
      </section>
    );
  }

  return (
    <section className="dashboard-section rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Cache Diagnostics</h3>
          <p className="text-xs text-slate-600">Live metrics from backend in-memory cache.</p>
        </div>
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
          onClick={fetchStats}
        >
          Refresh
        </button>
      </div>

      {errorMessage ? (
        <p className="mb-3 text-sm text-rose-600">{errorMessage}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatItem label="Search Hit Rate" value={formatPercent(computed.searchHitRate)} />
        <StatItem label="Trending Hit Rate" value={formatPercent(computed.trendingHitRate)} />
        <StatItem label="Search Upstream Calls" value={String(computed.search.upstreamCalls || 0)} />
        <StatItem label="Quota Fallbacks" value={String(computed.search.quotaFallbacks || 0)} />
        <StatItem label="Stale Served" value={String((computed.search.staleHits || 0) + (computed.trending.staleHits || 0))} />
        <StatItem label="In-Flight Joins" value={String(computed.search.inFlightJoins || 0)} />
        <StatItem label="Rejected Short Queries" value={String(computed.search.rejectedShortQueries || 0)} />
        <StatItem label="Server Uptime" value={computed.uptime} />
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Last updated: {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString() : 'N/A'}
      </p>
    </section>
  );
}

export default CacheStatsPanel;
