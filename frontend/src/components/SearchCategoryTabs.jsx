import { useNavigate } from 'react-router-dom';
import { Music4, Album, Mic2, Disc3, Podcast, Film } from 'lucide-react';

const CATEGORIES = [
  { id: 'songs', label: 'Songs', icon: Music4, path: '/search/songs' },
  { id: 'albums', label: 'Albums', icon: Album, path: '/search/albums' },
  { id: 'artists', label: 'Artists', icon: Mic2, path: '/search/artists' },
  { id: 'playlists', label: 'Playlists', icon: Disc3, path: '/search/playlists' },
  { id: 'podcasts', label: 'Podcasts', icon: Podcast, path: '/search/podcasts' },
  { id: 'movies', label: 'Movies', icon: Film, path: '/search/movies' },
];

function SearchCategoryTabs({ activeCategory = 'songs', query = '' }) {
  const navigate = useNavigate();

  const handleTabClick = (cat) => {
    const qParam = query ? `?q=${encodeURIComponent(query)}` : '';
    navigate(`${cat.path}${qParam}`);
  };

  return (
    <nav className="search-category-tabs-container" aria-label="Search categories">
      <div className="search-category-tabs-scroll">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory.toLowerCase() === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              className={`search-category-tab ${isActive ? 'active' : ''}`}
              onClick={() => handleTabClick(cat)}
            >
              <Icon size={15} className="tab-icon" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default SearchCategoryTabs;
