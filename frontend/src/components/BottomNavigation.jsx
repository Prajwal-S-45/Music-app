import { NavLink } from 'react-router-dom';
import { Home, Search, LibraryBig, Crown, UsersRound } from 'lucide-react';
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
        to="/room" 
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <UsersRound size={24} />
        <span>Room</span>
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

      <NavLink 
        to="/premium" 
        className={({ isActive }) => `bottom-nav-item premium-link ${isActive ? 'active' : ''}`}
      >
        <Crown size={24} />
        <span>Premium</span>
      </NavLink>
    </nav>
  );
}

export default BottomNavigation;
