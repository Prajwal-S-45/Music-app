import React from 'react';
import { Clock3, Sparkles, X } from 'lucide-react';
import { motion } from 'framer-motion';

function RecentSearches({ searches = [], onSearch, onClear }) {
  if (!searches || searches.length === 0) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/7 px-5 py-12 text-center shadow-[0_18px_40px_rgba(2,6,23,0.26)] backdrop-blur-xl">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/8 text-slate-100 ring-1 ring-white/10">
          <Clock3 size={32} strokeWidth={1.7} />
        </div>
        <p className="text-base font-semibold text-white">No recent searches</p>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-300/75">
          Try searching for your favorite songs, artists, albums, or playlists. Your recent activity will appear here for quick access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Quick access</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-white">Recent searches</h2>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300/80 md:flex">
          <Sparkles size={14} className="text-emerald-300" />
          Continue where you left off
        </div>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {searches.map((search, idx) => (
          <motion.li
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: idx * 0.03 }}
            className="group flex items-center justify-between rounded-[20px] border border-white/10 bg-white/7 px-4 py-3 shadow-[0_12px_28px_rgba(2,6,23,0.2)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-[0_16px_32px_rgba(2,6,23,0.28)]"
          >
            <button
              onClick={() => onSearch(search)}
              className="flex flex-1 items-center gap-3 text-left"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-emerald-300 transition group-hover:bg-emerald-500/20 group-hover:text-emerald-200">
                <Clock3 size={16} />
              </span>
              <span className="truncate text-sm font-medium text-slate-100 transition group-hover:text-white">{search}</span>
            </button>
            <button
              onClick={() => onClear(search)}
              className="flex-shrink-0 rounded-full p-2 text-slate-400 transition opacity-0 hover:bg-white/10 hover:text-white group-hover:opacity-100"
              title="Remove"
            >
              <X size={18} />
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export default RecentSearches;
