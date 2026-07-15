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
];

/* ─── Browse section ─── */
const browseItems = [
  { label: 'New Releases', icon: Sparkles, to: '/new-releases' },
  { label: 'Top Charts', icon: TrendingUp, to: '/top-charts' },
  { label: 'Top Playlists', icon: ListMusic, to: '/top-playlists' },
  { label: 'Podcasts', icon: Mic2, to: '/podcasts' },
  { label: 'Top Artists', icon: UsersRound, to: '/artists' },
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

/* ─── Playlist items ─── */
const playlistItems = [
  { label: 'Chill Vibes', color: '#6ee7b7', to: '/coming-soon?feature=Chill%20Vibes' },
  { label: 'Workout Hits', color: '#fbbf24', to: '/coming-soon?feature=Workout%20Hits' },
  { label: 'Road Trip', color: '#60a5fa', to: '/coming-soon?feature=Road%20Trip' },
  { label: 'Bollywood Mix', color: '#f472b6', to: '/coming-soon?feature=Bollywood%20Mix' },
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
                <Icon size={15} strokeWidth={2} />
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
                <Icon size={15} strokeWidth={2} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* ── Playlists ──────────────────────────────── */}
      <div className="dashboard-sidebar__section">
        <p className="dashboard-sidebar__label">Playlists</p>
        <div className="dashboard-library-list">
          {playlistItems.map((pl) => (
            <NavLink
              key={pl.label}
              to={pl.to}
              className={({ isActive }) => `dashboard-library-list__item sidebar-playlist-item ${isActive ? 'active' : ''}`}
              onClick={handleCloseIfCompact}
            >
              <span
                className="sidebar-playlist-dot"
                style={{ background: pl.color }}
                aria-hidden="true"
              />
              <span>{pl.label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/coming-soon?feature=Playlists"
            className={({ isActive }) => `dashboard-library-list__item sidebar-show-more ${isActive ? 'active' : ''}`}
            onClick={handleCloseIfCompact}
          >
            <span>Show More</span>
          </NavLink>
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
