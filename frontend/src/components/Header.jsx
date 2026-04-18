import React, { useMemo, useState } from 'react';
import { ChevronDown, LogOut, PanelLeft, Search, UserCircle2 } from 'lucide-react';

const navItems = ['Music', 'Podcasts', 'Pro'];

function Header({ userName, onSearchSubmit, language, onLanguageChange, onLogout, onToggleSidebar }) {
  const [query, setQuery] = useState('');
  const [avatarOpen, setAvatarOpen] = useState(false);

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
    if (onSearchSubmit) {
      onSearchSubmit(query.trim());
    }
  };

  return (
    <header className="dashboard-header">
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
        <form className="dashboard-searchbar" onSubmit={handleSubmit} role="search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search "
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
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
    </header>
  );
}

export default Header;