import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Music2, Mic2, Radio, UsersRound } from 'lucide-react';
import '../styles/TopPillBar.css';

const tabs = [
  { label: 'Music', icon: Music2, to: '/' },
  { label: 'Room', icon: UsersRound, to: '/room' },
  { label: 'Podcasts', icon: Mic2, to: '/podcasts' },
  { label: 'Radio', icon: Radio, to: '/radio' },
];

function TopPillBar({ onToggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="top-pill-bar">
      <button 
        type="button" 
        className="top-pill-bar__menu-btn" 
        onClick={onToggleSidebar} 
        aria-label="Toggle Sidebar"
      >
        <Menu size={22} />
      </button>

      <div className="top-pill-bar__tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.to;
          return (
            <button
              key={tab.label}
              type="button"
              className={`top-pill-bar__pill ${isActive ? 'active' : ''}`}
              onClick={() => navigate(tab.to)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TopPillBar;
