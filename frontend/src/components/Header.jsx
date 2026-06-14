import React, { useMemo, useState, useEffect, useRef } from 'react';
import '../styles/Header.css';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  Globe2,
  History,
  LogOut,
  Mic2,
  Music2,
  Search,
  Settings,
  UserCircle2,
} from 'lucide-react';
import SearchDropdown from './SearchDropdown';

const navItems = [
  { label: 'Music', icon: Music2 },
  { label: 'Podcasts', icon: Mic2 },
  { label: 'Pro', icon: UserCircle2 },
];

const languageOptions = [
  { value: 'KANNADA', label: 'Kannada', flag: 'KA' },
  { value: 'ENGLISH', label: 'English', flag: 'EN' },
  { value: 'HINDI', label: 'Hindi', flag: 'HI' },
  { value: 'EN', label: 'English', flag: 'EN' },
];

const placeholderPhrases = [
  'Search songs, artists, albums...',
  'Ask for a mood, artist, or playlist...',
  'Discover trending sounds near you...',
];

const recentSearches = ['Kannada hits', 'Lo-fi focus', 'Arijit Singh', '90s love songs'];

function Header({ userName, onSearchSubmit, language, onLanguageChange, onLogout, onToggleSidebar }) {
  const [query, setQuery] = useState('');
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Music');
  const [searchFocused, setSearchFocused] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [typedPlaceholder, setTypedPlaceholder] = useState('');
  const avatarMenuRef = useRef(null);
  const avatarToggleRef = useRef(null);
  const languageMenuRef = useRef(null);
  const languageToggleRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        avatarOpen &&
        avatarMenuRef.current && !avatarMenuRef.current.contains(event.target) &&
        avatarToggleRef.current && !avatarToggleRef.current.contains(event.target)
      ) {
        setAvatarOpen(false);
      }

      if (
        languageOpen &&
        languageMenuRef.current && !languageMenuRef.current.contains(event.target) &&
        languageToggleRef.current && !languageToggleRef.current.contains(event.target)
      ) {
        setLanguageOpen(false);
      }
    }

    if (avatarOpen || languageOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [avatarOpen, languageOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const dashboardScroll = document.querySelector('.dashboard-scroll');
      setIsScrolled((window.scrollY || dashboardScroll?.scrollTop || 0) > 8);
    };

    const dashboardScroll = document.querySelector('.dashboard-scroll');
    window.addEventListener('scroll', handleScroll, { passive: true });
    dashboardScroll?.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      dashboardScroll?.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    let characterIndex = 0;
    let timeoutId;
    const phrase = placeholderPhrases[placeholderIndex];

    const typeNext = () => {
      setTypedPlaceholder(phrase.slice(0, characterIndex + 1));
      characterIndex += 1;

      if (characterIndex < phrase.length) {
        timeoutId = window.setTimeout(typeNext, 42);
        return;
      }

      timeoutId = window.setTimeout(() => {
        setPlaceholderIndex((value) => (value + 1) % placeholderPhrases.length);
      }, 1800);
    };

    setTypedPlaceholder('');
    timeoutId = window.setTimeout(typeNext, 220);

    return () => window.clearTimeout(timeoutId);
  }, [placeholderIndex]);

  const initials = useMemo(() => {
    const parts = String(userName || 'Listener').trim().split(/\s+/).slice(0, 2);
    return parts.map((part) => part.charAt(0).toUpperCase()).join('');
  }, [userName]);

  const selectedLanguage = useMemo(
    () => languageOptions.find((option) => option.value === language) || languageOptions[1],
    [language]
  );

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

  const handleRecentSearch = (value) => {
    setQuery(value);
    setDropdownOpen(false);
    setSearchFocused(false);
    onSearchSubmit?.(value);
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -16, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
      className={`app-header ${isScrolled ? 'scrolled' : ''}`}
    >
      <div className="app-header__ambient" aria-hidden="true" />

      <div className="app-header__left">
        <div className="app-header__brand" aria-label="Music App">
          <div className="app-header__brand-mark">
            M
            <span className="app-header__waveform" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
          <div className="app-header__brand-copy">
            <strong>Music App</strong>
            <span>Premium streaming</span>
          </div>
        </div>

        <nav className="app-header__tabs" aria-label="Library navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.label;

            return (
              <motion.button
                key={item.label}
                type="button"
                className={`app-header__tab ${active ? 'active' : ''}`}
                onClick={() => setActiveTab(item.label)}
                whileHover={{ y: -1, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {active && (
                  <motion.span
                    className="app-header__tab-indicator"
                    layoutId="header-active-tab"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon size={15} />
                <span>{item.label}</span>
              </motion.button>
            );
          })}
        </nav>
      </div>


      <div className="app-header__center">
        <motion.div
          className="app-header__search-shell"
          animate={{ scale: searchFocused ? 1.018 : 1 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        >
          <form
            className={`app-header__searchbar ${searchFocused ? 'focused' : ''}`}
            onSubmit={handleSubmit}
            role="search"
          >
            <motion.span
              className="app-header__search-icon"
              animate={{ rotate: searchFocused ? 8 : 0, scale: searchFocused ? 1.08 : 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18 }}
            >
              <Search size={18} className="search-icon" />
            </motion.span>
            <input
              type="search"
              placeholder={typedPlaceholder || placeholderPhrases[0]}
              value={query}
              onChange={(event) => {
                const nextValue = event.target.value;
                setQuery(nextValue);
                setDropdownOpen(true);
              }}
              onFocus={() => {
                setDropdownOpen(true);
                setSearchFocused(true);
              }}
              onBlur={() => {
                window.setTimeout(() => setSearchFocused(false), 140);
              }}
            />
          </form>

          <AnimatePresence>
            {searchFocused && !query.trim() && (
              <motion.div
                className="app-header__recent-searches"
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <div className="app-header__recent-title">
                  <History size={14} />
                  <span>Recent sparks</span>
                </div>
                {recentSearches.map((item) => (
                  <button key={item} type="button" onMouseDown={() => handleRecentSearch(item)}>
                    {item}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <SearchDropdown
            isOpen={dropdownOpen && Boolean(query.trim())}
            query={query}
            onClose={() => setDropdownOpen(false)}
            onClear={() => {
              setQuery('');
              setDropdownOpen(false);
            }}
            onSearchSelect={handleSearchSelect}
          />
        </motion.div>
      </div>

      <div className="app-header__right">
        <div className="app-header__language">
          <motion.button
            ref={languageToggleRef}
            type="button"
            className="app-header__language-button"
            onClick={() => setLanguageOpen((value) => !value)}
            aria-expanded={languageOpen}
            whileHover={{ y: -1, scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="app-header__language-icon">
              <Globe2 size={16} />
            </span>
            <span className="app-header__language-copy">Music Preferences</span>
            <strong>{selectedLanguage.label}</strong>
            <ChevronDown size={14} className={`app-header__chevron ${languageOpen ? 'open' : ''}`} />
          </motion.button>

          <AnimatePresence>
            {languageOpen && (
              <motion.div
                ref={languageMenuRef}
                className="app-header__language-menu"
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <div className="app-header__language-menu-header">
                  <h4>Preferred Music</h4>
                  <p>Choose the languages you want to discover music in. Your results and mix will adjust.</p>
                </div>

                <div className="app-header__language-list">
                  {languageOptions
                    .filter((option, index, list) => list.findIndex((entry) => entry.label === option.label) === index)
                    .map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={selectedLanguage.label === option.label ? 'active' : ''}
                        onClick={() => {
                          onLanguageChange?.(option.value);
                          setLanguageOpen(false);
                        }}
                      >
                        <span>{option.flag}</span>
                        <strong>{option.label}</strong>
                      </button>
                    ))}
                </div>

                <div className="app-header__language-note">
                  <span>Note</span>
                  <p>This affects songs and trends. UI language remains in English.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="app-header__avatar">
          <motion.button
            ref={avatarToggleRef}
            type="button"
            className="app-header__avatar-button"
            onClick={() => setAvatarOpen(!avatarOpen)}
            aria-expanded={avatarOpen}
            whileHover={{ y: -1, scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
          >
            <div className="app-header__avatar-pill">
              <div className="app-header__avatar-halo">
                {initials}
                <span className="app-header__avatar-online" />
              </div>
              <span className="app-header__avatar-name">{userName || 'Prajwal'}</span>
              <ChevronDown size={14} className={`app-header__chevron ${avatarOpen ? 'open' : ''}`} />
            </div>
          </motion.button>

          <AnimatePresence>
            {avatarOpen && (
              <motion.div
                ref={avatarMenuRef}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="app-header__account-menu"
              >
                <div className="app-header__account-identity">
                  <span>{initials}</span>
                  <div>
                    <strong>{userName || 'Listener'}</strong>
                    <small>Online now</small>
                  </div>
                </div>
                <div className="app-header__menu-divider" />
                <button type="button">
                  <UserCircle2 size={16} /> <span>Profile</span>
                </button>
                <button type="button">
                  <Settings size={16} /> <span>Settings</span>
                </button>
                <div className="app-header__menu-divider" />
                <button type="button" className="app-header__logout" onClick={onLogout}>
                  <LogOut size={16} /> <span>Sign Out</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}

export default Header;
