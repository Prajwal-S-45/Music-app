import { NavLink, useLocation } from 'react-router-dom';
import {
  Album,
  Download,
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

/* ─── Nav items shown at the top ─── */
const primaryItems = [
  { label: 'Home', icon: Home, to: '/' },
  { label: 'Room', icon: UsersRound, to: '/room' },
];

/* ─── Browse section ─── */
const browseItems = [
  { label: 'New Releases', icon: Sparkles, to: '/new-releases' },
  { label: 'Top Charts', icon: TrendingUp, to: '/top-charts' },
  { label: 'Top Playlists', icon: ListMusic, to: '/top-playlists' },
  { label: 'Podcasts', icon: Mic2, to: '/podcasts' },
  { label: 'Top Artists', icon: UsersRound, to: '/top-artists' },
  { label: 'Radio', icon: Radio, to: '/radio' },
];

/* ─── Library section ─── */
const libraryItems = [
  { label: 'Liked Songs', icon: Heart, to: '/liked-songs' },
  { label: 'History', icon: History, to: '/history' },
  { label: 'Playlists', icon: ListMusic, to: '/library' },
  { label: 'Albums', icon: Album, to: '/albums' },
  { label: 'Artists', icon: Music2, to: '/artists' },
  { label: 'Downloads', icon: Download, to: '/downloads' },
];

const MenuIcon = ({ icon: Icon }) => <Icon size={17} strokeWidth={2} />;

function Sidebar({ onCreatePlaylist, isOpen, onClose, user }) {
  const location = useLocation();
  const handleCloseIfCompact = () => {
    if (window.innerWidth <= 1100) {
      onClose?.();
    }
  };

  return (
    <aside className={`dashboard-sidebar ${isOpen ? 'open' : ''}`}>

      {/* ── Primary nav (Home / Search / Your Library) ─── */}
      <nav className="dashboard-nav sidebar-primary-nav" aria-label="Primary navigation">
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

      {/* ── Browse ─────────────────────────────────── */}
      <div className="dashboard-sidebar__section">
        <p className="dashboard-sidebar__label">Browse</p>
        <div className="dashboard-library-list">
          {browseItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) => `dashboard-library-list__item ${isActive ? 'active' : ''}`}
                onClick={handleCloseIfCompact}
              >
                <Icon size={18} strokeWidth={2} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* ── Your Library ───────────────────────────── */}
      <div className="dashboard-sidebar__section">
        <p className="dashboard-sidebar__label">Your Library</p>
        <div className="dashboard-library-list">
          {libraryItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={() => {
                  let isActive = false;
                  if (item.to === '/library') {
                    isActive = location.pathname === '/library';
                  } else if (item.to === '/artists') {
                    isActive = location.pathname === '/artists';
                  } else {
                    isActive = location.pathname === item.to;
                  }
                  const modifier = item.to.replace(/^\//, '').replace(/\//g, '-');
                  return `dashboard-library-list__item dashboard-library-list__item--${modifier} ${isActive ? 'active' : ''}`;
                }}
                onClick={handleCloseIfCompact}
              >
                <Icon size={18} strokeWidth={2} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>




      {/* ── Create Playlist ─────────────────────────── */}
      <div className="sidebar-create-wrap">
        <button type="button" className="dashboard-create-playlist" onClick={onCreatePlaylist}>
          <PlusCircle size={16} strokeWidth={2} />
          <span>Create Playlist</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
