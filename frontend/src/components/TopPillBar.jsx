import { useState } from 'react';
import { Menu, Music2, Mic2, Radio } from 'lucide-react';
import '../styles/TopPillBar.css';

const tabs = [
  { label: 'Music', icon: Music2 },
  { label: 'Podcasts', icon: Mic2 },
  { label: 'Radio', icon: Radio },
];

function TopPillBar({ onToggleSidebar }) {
  const [activeTab, setActiveTab] = useState('Music');

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
          const isActive = activeTab === tab.label;
          return (
            <button
              key={tab.label}
              type="button"
              className={`top-pill-bar__pill ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.label)}
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
