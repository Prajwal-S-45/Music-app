import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, LogOut, PanelLeft, Search, UserCircle2, X } from 'lucide-react';
import SearchDropdown from './SearchDropdown';

const navItems = ['Music', 'Podcasts', 'Pro'];

function Header({ userName, onSearchSubmit, language, onLanguageChange, onLogout, onToggleSidebar }) {
  const [query, setQuery] = useState('');
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const initials = useMemo(() => {
    const parts = String(userName || 'Listener').trim().split(/\s+/).slice(0, 2);
    return parts.map((part) => part.charAt(0).toUpperCase()).join('');
  }, [userName]);

  const languageLabel = useMemo(() => {
    const map = {
      KANNADA: 'Kannada',
      ENGLISH: 'English',
      HINDI: 'Hindi',
    };
    return map[language] || 'English';
  }, [language]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setDropdownOpen(false);
      return;
    }

    onSearchSubmit?.(trimmed);
    setDropdownOpen(false);
  };

  const handleSearchSelect = (result) => {
    const nextQuery = String(result?.title || result?.query || '').trim();
    if (!nextQuery) return;

    setQuery(nextQuery);
    setDropdownOpen(false);

    onSearchSubmit?.(nextQuery);
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: 'easeOut' }}
      className="dashboard-header"
    >
      <div className="dashboard-header__left">
        <button
          type="button"
          className="dashboard-icon-btn dashboard-mobile-sidebar-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <PanelLeft size={16} />
        </button>

        <nav className="dashboard-header__nav" aria-label="Header navigation">
          {navItems.map((item, index) => (
            <button
              key={item}
              type="button"
              className={`dashboard-header__nav-item ${index === 0 ? 'active' : ''}`}
            >
              {item}
            </button>
          ))}
        </nav>
      </div>

      <div className="dashboard-header__center">
        <div className="dashboard-searchwrap">
          <form className="dashboard-searchbar" onSubmit={handleSubmit} role="search">
            <Search size={16} className="transition-colors duration-200" />
            <input
              type="search"
              placeholder="Search songs, artists, albums"
              value={query}
              onChange={(event) => {
                const nextValue = event.target.value;
                setQuery(nextValue);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              className="transition-all duration-200"
            />
            {query && (
              <button
                type="button"
                className="dashboard-searchbar__clear"
                aria-label="Clear search"
                onClick={() => {
                  setQuery('');
                  setDropdownOpen(false);
                }}
              >
                <X size={14} strokeWidth={2.2} />
              </button>
            )}
          </form>

          <SearchDropdown
            isOpen={dropdownOpen && Boolean(query.trim())}
            query={query}
            onClose={() => setDropdownOpen(false)}
            onSearchSelect={handleSearchSelect}
          />
        </div>
      </div>

      <div className="dashboard-header__right">
        <label className="dashboard-language">
          <div className="dashboard-language__meta">
            <span className="dashboard-language__label">Music Languages</span>
          </div>
          <select value={language} onChange={(event) => onLanguageChange?.(event.target.value)}>
            <option value="KANNADA">Kannada</option>
            <option value="ENGLISH">English</option>
            <option value="HINDI">Hindi</option>
          </select>
        </label>

        <button
          type="button"
          className="dashboard-avatar"
          onClick={() => setAvatarOpen((value) => !value)}
          aria-haspopup="menu"
          aria-expanded={avatarOpen}
        >
          <span>{initials || <UserCircle2 size={18} />}</span>
          <ChevronDown size={16} />
        </button>

        {avatarOpen && (
          <div className="dashboard-avatar__menu" role="menu">
            <button type="button" onClick={onLogout} role="menuitem">
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </div>
    </motion.header>
  );
}

export default Header;