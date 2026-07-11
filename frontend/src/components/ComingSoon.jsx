import React, { useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Bell, BellOff, ArrowLeft } from 'lucide-react';
import comingSoonImage from '../assets/coming_soon_headphones.png';
import '../styles/ComingSoon.css';

function ComingSoon() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Resolve feature name based on query parameter or path name
  let featureName = searchParams.get('feature');
  if (!featureName) {
    const path = location.pathname;
    if (path === '/new-releases') featureName = 'New Releases';
    else if (path === '/top-charts') featureName = 'Top Charts';
    else if (path === '/top-playlists') featureName = 'Top Playlists';
    else if (path === '/podcasts') featureName = 'Podcasts';
    else if (path === '/radio') featureName = 'Radio';
    else if (path === '/albums') featureName = 'Albums';
    else if (path === '/downloads') featureName = 'Downloads';
    else if (path === '/premium') featureName = 'Premium';
    else featureName = 'this feature';
  }

  const handleNotifyToggle = () => {
    setIsSubscribed(!isSubscribed);
  };

  return (
    <div className="coming-soon-container">
      <button 
        type="button" 
        className="coming-soon-back-btn" 
        onClick={() => navigate(-1)}
        aria-label="Go back"
      >
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>

      <div className="coming-soon-content">
        {/* Left Side: Graphic */}
        <div className="coming-soon-graphic-section">
          <div className="coming-soon-image-glow-wrapper">
            <img 
              src={comingSoonImage} 
              alt="Coming Soon Graphic" 
              className="coming-soon-image" 
            />
            <div className="coming-soon-glow-effect" />
          </div>
        </div>

        {/* Right Side: Information */}
        <div className="coming-soon-info-section">
          <span className="coming-soon-badge">COMING SOON</span>
          <h1 className="coming-soon-title">Something amazing is on the way!</h1>
          <p className="coming-soon-desc">
            We're working hard to bring you {featureName.toLowerCase()}.
            <br />
            Stay tuned!
          </p>

          <button 
            type="button" 
            className={`coming-soon-notify-btn ${isSubscribed ? 'subscribed' : ''}`}
            onClick={handleNotifyToggle}
          >
            {isSubscribed ? <BellOff size={18} /> : <Bell size={18} />}
            <span>{isSubscribed ? 'Subscribed' : 'Notify Me'}</span>
          </button>

          <p className="coming-soon-subtext">
            {isSubscribed 
              ? "We'll let you know as soon as this feature launches!" 
              : "We'll notify you when it's ready."
            }
          </p>
        </div>
      </div>
    </div>
  );
}

export default ComingSoon;
