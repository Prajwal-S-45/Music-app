import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Album,
  Heart,
  History,
  Home,
  LibraryBig,
  ListMusic,
  Mic2,
  Music2,
  PlusCircle,
  Radio,
  Search,
  Sparkles,
  TrendingUp,
  UsersRound,
} from 'lucide-react';

const browseItems = [
  { label: 'New Releases', icon: Sparkles },
  { label: 'Top Charts', icon: TrendingUp },
  { label: 'Top Playlists', icon: ListMusic },
  { label: 'Podcasts', icon: Mic2 },
  { label: 'Top Artists', icon: UsersRound },
  { label: 'Radio', icon: Radio },
];

const libraryItems = [
  { label: 'History', icon: History },
  { label: 'Liked Songs', icon: Heart, to: '/profile' },
  { label: 'Albums', icon: Album },
  { label: 'Podcasts', icon: Mic2 },
  { label: 'Artists', icon: Music2 },
];

const primaryItems = [
  { label: 'Home', icon: Home, to: '/' },
  { label: 'Search', icon: Search, to: '/search' },
  { label: 'Your Library', icon: LibraryBig, to: '/library' },
];

const MenuIcon = ({ icon: Icon }) => <Icon size={18} strokeWidth={2} />;

function Sidebar({ onCreatePlaylist, isOpen, onClose }) {
  const handleCloseIfCompact = () => {
    if (window.innerWidth <= 1100) {
      onClose?.();
    }
  };

  return (
    <aside className={`dashboard-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="dashboard-brand">
        <div className="dashboard-brand__mark">M</div>
        <div>
          <strong>Music App</strong>
          <span>Premium streaming</span>
        </div>
      </div>

      <nav className="dashboard-nav" aria-label="Primary navigation">
        {primaryItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `dashboard-nav__item ${isActive ? 'active' : ''}`}
            onClick={handleCloseIfCompact}
          >
            <MenuIcon icon={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="dashboard-sidebar__section">
        <p className="dashboard-sidebar__label">Browse</p>
        <div className="dashboard-chip-grid">
          {browseItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label} type="button" className="dashboard-chip" title={item.label}>
                <Icon size={16} strokeWidth={2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="dashboard-sidebar__section">
        <p className="dashboard-sidebar__label">My Library</p>
        <div className="dashboard-library-list">
          {libraryItems.map((item) => {
            const Icon = item.icon;
            return item.to ? (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) => `dashboard-library-list__item ${isActive ? 'active' : ''}`}
                onClick={handleCloseIfCompact}
              >
                <Icon size={16} strokeWidth={2} />
                <span>{item.label}</span>
              </NavLink>
            ) : (
              <button key={item.label} type="button" className="dashboard-library-list__item">
                <Icon size={16} strokeWidth={2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button type="button" className="dashboard-create-playlist" onClick={onCreatePlaylist}>
        <PlusCircle size={18} strokeWidth={2} />
        <span>Create Playlist</span>
      </button>
    </aside>
  );
}

export default Sidebar;