import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/Header.css';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  ChevronDown,
  Globe2,
  History,
  LogOut,
  Mic2,
  Music2,
  Radio,
  Search,
  Settings,
  Star,
  UserCircle2,
  Menu,
} from 'lucide-react';
import SearchDropdown from './SearchDropdown';

const navItems = [
  { label: 'Music', icon: Music2, to: '/' },
  { label: 'Podcasts', icon: Mic2, to: '/podcasts' },
  { label: 'Radio', icon: Radio, to: '/radio' },
];

const languageOptions = [
  { value: 'KANNADA', label: 'Kannada', flag: 'KA' },
  { value: 'ENGLISH', label: 'English', flag: 'EN' },
  { value: 'HINDI', label: 'Hindi', flag: 'HI' },
];

const placeholderPhrases = [
  'Search songs, artists, albums, podcasts...',
  'Ask for a mood, artist, or playlist...',
  'Discover trending sounds near you...',
];

const recentSearches = ['Kannada hits', 'Lo-fi focus', 'Arijit Singh', '90s love songs'];

function Header({ userName, user, onSearchSubmit, language, onLanguageChange, onLogout, onPlayTrack, onLikeTrack, onQueueTrack, onToggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const activeTab = useMemo(() => {
    const path = location.pathname;
    if (path === '/podcasts') return 'Podcasts';
    if (path === '/radio') return 'Radio';
    return 'Music';
  }, [location.pathname]);

  const [searchFocused, setSearchFocused] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [typedPlaceholder, setTypedPlaceholder] = useState('');
  const avatarMenuRef = useRef(null);
  const avatarToggleRef = useRef(null);
  const languageMenuRef = useRef(null);
  const languageToggleRef = useRef(null);
  const searchShellRef = useRef(null);
  const searchInputRef = useRef(null);

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
      if (
        searchExpanded &&
        searchShellRef.current && !searchShellRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
        setSearchFocused(false);
        setSearchExpanded(false);
      }
    }
    if (avatarOpen || languageOpen || searchExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [avatarOpen, languageOpen, searchExpanded]);

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
    if (!trimmed) { setDropdownOpen(false); return; }
    onSearchSubmit?.(trimmed);
    setQuery('');
    setDropdownOpen(false);
    setSearchFocused(false);
  };

  const handleSearchSelect = (result) => {
    const nextQuery = String(result?.query || result?.title || '').trim();
    if (!nextQuery) return;
    setDropdownOpen(false);
    setSearchFocused(false);
    onSearchSubmit?.({ query: nextQuery, type: result?.type || 'songs' });
    setQuery('');
  };

  const handleRecentSearch = (value) => {
    setDropdownOpen(false);
    setSearchFocused(false);
    onSearchSubmit?.(value);
    setQuery('');
  };

  const handleDropdownPlay = (song) => { onPlayTrack?.(song); setDropdownOpen(false); };
  const handleDropdownLike = (song) => { onLikeTrack?.(song); };
  const handleDropdownQueue = (song) => { onQueueTrack?.(song); setDropdownOpen(false); };

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      className={`app-header ${isScrolled ? 'scrolled' : ''}`}
    >
      <div className="app-header__ambient" aria-hidden="true" />

      {/* BRAND LOGO (Mobile/Tablet Only) */}
      <div className="app-header__brand-mobile">
        <button type="button" className="app-header__menu-btn" onClick={onToggleSidebar} aria-label="Toggle Sidebar">
          <Menu size={24} />
        </button>
        <div className="app-header__brand-mark">
          <span>{userName ? userName.charAt(0).toUpperCase() : 'M'}</span>
        </div>
        <div className="app-header__brand-copy">
          <strong>Music App</strong>
          {user?.isPremium && <span>Premium Streaming</span>}
        </div>
      </div>

      {/* LEFT: Brand Logo (Desktop) & Navigation Tabs */}
      <div className="app-header__left">
        <div className="app-header__brand-desktop">
          <div className="app-header__brand-mark">
            <span>{userName ? userName.charAt(0).toUpperCase() : 'M'}</span>
          </div>
          <div className="app-header__brand-copy">
            <strong>Music App</strong>
            {user?.isPremium && <span>Premium Streaming</span>}
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
                onClick={() => navigate(item.to)}
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
                <Icon size={14} />
                <span>{item.label}</span>
              </motion.button>
            );
          })}
        </nav>
      </div>

      {/* CENTER: Search bar */}
      <div className="app-header__center">
        <motion.div
          ref={searchShellRef}
          className={`app-header__search-shell ${searchExpanded ? 'expanded' : ''}`}
          animate={{
            scale: searchExpanded ? 1.01 : 1,
            maxWidth: searchExpanded ? 760 : 560,
          }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        >
          <form
            className={`app-header__searchbar ${searchFocused ? 'focused' : ''} ${searchExpanded ? 'expanded' : ''}`}
            onSubmit={handleSubmit}
            role="search"
            onClick={() => searchInputRef.current?.focus()}
          >
            <motion.span
              className="app-header__search-icon"
              animate={{ rotate: searchExpanded ? 10 : 0, scale: searchExpanded ? 1.1 : 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18 }}
            >
              <Search size={17} className="search-icon" />
            </motion.span>
            <input
              ref={searchInputRef}
              type="search"
              placeholder={typedPlaceholder || placeholderPhrases[0]}
              value={query}
              onChange={(event) => {
                const nextValue = event.target.value;
                setQuery(nextValue);
                setDropdownOpen(true);
                setSearchExpanded(true);
              }}
              onFocus={() => {
                setDropdownOpen(true);
                setSearchFocused(true);
                setSearchExpanded(true);
              }}
              onBlur={() => {
                window.setTimeout(() => {
                  setSearchFocused(false);
                  if (!query.trim()) setSearchExpanded(false);
                }, 160);
              }}
            />
            {searchExpanded && query && (
              <button
                type="button"
                className="app-header__searchbar-clear"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setQuery('');
                  setDropdownOpen(false);
                  setSearchExpanded(false);
                }}
                aria-label="Clear search"
              >
                âœ•
              </button>
            )}
          </form>

          <AnimatePresence>
            {false && searchExpanded && searchFocused && !query.trim() && (
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
            isOpen={dropdownOpen}
            query={query}
            onClose={() => { setDropdownOpen(false); setSearchExpanded(false); }}
            onClear={() => { setQuery(''); setDropdownOpen(false); setSearchExpanded(false); }}
            onSearchSelect={(result) => { handleSearchSelect(result); setSearchExpanded(false); }}
            onPlayTrack={handleDropdownPlay}
            onLikeTrack={handleDropdownLike}
            onMoreTrack={handleDropdownQueue}
          />
        </motion.div>
      </div>

      {/* RIGHT: Upgrade to Premium + Bell + Language + Avatar */}
      <div className="app-header__right">


        {/* Notification bell */}
        <motion.button
          type="button"
          className="app-header__icon-btn"
          aria-label="Notifications"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Bell size={18} />
        </motion.button>



        {/* Language selector */}
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
              <Globe2 size={15} />
            </span>
            <strong>{selectedLanguage.flag}</strong>
            <ChevronDown size={13} className={`app-header__chevron ${languageOpen ? 'open' : ''}`} />
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
                  <p>Choose the languages you want to discover music in.</p>
                </div>
                <div className="app-header__language-list">
                  {languageOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={selectedLanguage.label === option.label ? 'active' : ''}
                      onClick={() => { onLanguageChange?.(option.value); setLanguageOpen(false); }}
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

        {/* Avatar */}
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
                <img 
                  src={user?.avatar || 'http://localhost:5000/uploads/profile_avatar.png'} 
                  alt="" 
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }} 
                />
                <span className="app-header__avatar-online" />
              </div>
              <span className="app-header__avatar-name">{userName || 'Listener'}</span>
              <ChevronDown size={13} className={`app-header__chevron ${avatarOpen ? 'open' : ''}`} />
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
                  <img 
                    src={user?.avatar || 'http://localhost:5000/uploads/profile_avatar.png'} 
                    alt="" 
                    style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', display: 'block' }} 
                  />
                  <div>
                    <strong>{userName || 'Listener'}</strong>
                    <small>Online now</small>
                  </div>
                </div>
                <div className="app-header__menu-divider" />
                <button type="button" onClick={() => { navigate('/profile'); setAvatarOpen(false); }}>
                  <UserCircle2 size={15} /> <span>Profile</span>
                </button>
                <button type="button" onClick={() => { navigate('/settings'); setAvatarOpen(false); }}>
                  <Settings size={15} /> <span>Settings</span>
                </button>
                <div className="app-header__menu-divider" />
                <button type="button" className="app-header__logout" onClick={onLogout}>
                  <LogOut size={15} /> <span>Sign Out</span>
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
