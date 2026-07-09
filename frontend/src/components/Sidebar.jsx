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
  { label: 'New Releases', icon: Sparkles },
  { label: 'Top Charts', icon: TrendingUp },
  { label: 'Top Playlists', icon: ListMusic },
  { label: 'Podcasts', icon: Mic2 },
  { label: 'Top Artists', icon: UsersRound },
  { label: 'Radio', icon: Radio },
];

/* ─── Library section ─── */
const libraryItems = [
  { label: 'Liked Songs', icon: Heart, to: '/liked-songs' },
  { label: 'History', icon: History, to: '/history' },
  { label: 'Playlists', icon: ListMusic, to: '/library' },
  { label: 'Albums', icon: Album },
  { label: 'Artists', icon: Music2, to: '/artists' },
  { label: 'Downloads', icon: Download },
];

/* ─── Playlist items ─── */
const playlistItems = [
  { label: 'Chill Vibes', color: '#6ee7b7' },
  { label: 'Workout Hits', color: '#fbbf24' },
  { label: 'Road Trip', color: '#60a5fa' },
  { label: 'Bollywood Mix', color: '#f472b6' },
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
              <button key={item.label} type="button" className="dashboard-library-list__item">
                <Icon size={15} strokeWidth={2} />
                <span>{item.label}</span>
              </button>
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
            return item.to ? (
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
                  return `dashboard-library-list__item ${isActive ? 'active' : ''}`;
                }}
                onClick={handleCloseIfCompact}
              >
                <Icon size={15} strokeWidth={2} />
                <span>{item.label}</span>
              </NavLink>
            ) : (
              <button key={item.label} type="button" className="dashboard-library-list__item">
                <Icon size={15} strokeWidth={2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Playlists ──────────────────────────────── */}
      <div className="dashboard-sidebar__section">
        <p className="dashboard-sidebar__label">Playlists</p>
        <div className="dashboard-library-list">
          {playlistItems.map((pl) => (
            <button key={pl.label} type="button" className="dashboard-library-list__item sidebar-playlist-item">
              <span
                className="sidebar-playlist-dot"
                style={{ background: pl.color }}
                aria-hidden="true"
              />
              <span>{pl.label}</span>
            </button>
          ))}
          <button type="button" className="dashboard-library-list__item sidebar-show-more">
            <span>Show More</span>
          </button>
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
