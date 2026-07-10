import { NavLink } from 'react-router-dom';
import { Home, Search, LibraryBig, Crown } from 'lucide-react';
import '../styles/BottomNavigation.css';

function BottomNavigation() {
  return (
    <nav className="mobile-bottom-nav">
      <NavLink 
        to="/" 
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        end
      >
        <Home size={24} />
        <span>Home</span>
      </NavLink>

      <NavLink 
        to="/search" 
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <Search size={24} />
        <span>Search</span>
      </NavLink>

      <NavLink 
        to="/library" 
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <LibraryBig size={24} />
        <span>Library</span>
      </NavLink>

      <div className="bottom-nav-item premium-link">
        <Crown size={24} />
        <span>Premium</span>
      </div>
    </nav>
  );
}

export default BottomNavigation;
