import React from 'react';
import { motion } from 'framer-motion';
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
  { label: 'Artists', icon: Music2, to: '/library?section=artists' },
];

const primaryItems = [
  { label: 'Home', icon: Home, to: '/' },
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
    <motion.aside
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={`dashboard-sidebar dashboard-sidebar--slim ${isOpen ? 'open' : ''}`}
    >
      <div className="dashboard-sidebar__brand">
        <div className="dashboard-brand__mark">M</div>
        <div className="dashboard-sidebar__brand-copy">
          <strong>Music App</strong>
          <span>Premium streaming</span>
        </div>
      </div>

      <nav className="dashboard-sidebar__nav" aria-label="Primary navigation">
        {primaryItems.map((item) => (
          <motion.div
            key={item.label}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.99 }}
          >
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `dashboard-sidebar__nav-item ${isActive ? 'active' : ''}`}
              onClick={handleCloseIfCompact}
            >
              <span className="dashboard-sidebar__nav-icon">
                <MenuIcon icon={item.icon} />
              </span>
              <span className="dashboard-sidebar__nav-label">{item.label}</span>
            </NavLink>
          </motion.div>
        ))}
      </nav>

      <div className="dashboard-sidebar__section">
        <p className="dashboard-sidebar__label">Browse</p>
        <div className="dashboard-sidebar__quick-grid">
          {browseItems.map((item) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.label}
                type="button"
                className="dashboard-sidebar__quick-item"
                title={item.label}
                whileHover={{ y: -1, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon size={15} strokeWidth={2} />
                <span>{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="dashboard-sidebar__section">
        <p className="dashboard-sidebar__label">My Library</p>
        <div className="dashboard-sidebar__library-list">
          {libraryItems.map((item) => {
            const Icon = item.icon;
            return item.to ? (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) => `dashboard-sidebar__library-item ${isActive ? 'active' : ''}`}
                onClick={handleCloseIfCompact}
              >
                <span className="dashboard-sidebar__library-icon"><Icon size={15} strokeWidth={2} /></span>
                <span>{item.label}</span>
              </NavLink>
            ) : (
              <button key={item.label} type="button" className="dashboard-sidebar__library-item">
                <span className="dashboard-sidebar__library-icon"><Icon size={15} strokeWidth={2} /></span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button type="button" className="dashboard-sidebar__create-playlist" onClick={onCreatePlaylist}>
        <PlusCircle size={16} strokeWidth={2} />
        <span>Create playlist</span>
      </button>
    </motion.aside>
  );
}

export default Sidebar;