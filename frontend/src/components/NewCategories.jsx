import { Play } from 'lucide-react';
import '../styles/Podcasts.css';

export function PodcastsView() {
  const categories = [
    { title: 'True Crime', color: '#6366f1' },
    { title: 'Comedy', color: '#f59e0b' },
    { title: 'News', color: '#3b82f6' },
    { title: 'Technology', color: '#8b5cf6' }
  ];

  const featured = [
    { title: 'The Daily', publisher: 'The New York Times', color: '#ef4444' },
    { title: 'Crime Junkie', publisher: 'audiochuck', color: '#6366f1' },
    { title: 'SmartLess', publisher: 'Jason Bateman', color: '#f59e0b' }
  ];

  return (
    <div className="podcasts-view">
      <div className="podcasts-categories">
        {categories.map((cat, i) => (
          <div key={i} className="podcast-category-card" style={{ backgroundColor: cat.color }}>
            <span>{cat.title}</span>
          </div>
        ))}
      </div>
      
      <div className="dashboard-section__header mt-4">
        <h3>Featured Podcasts</h3>
      </div>
      
      <div className="dashboard-grid-cards">
        {featured.map((pod, i) => (
          <div key={i} className="music-card podcast-card">
            <div className="podcast-card-art" style={{ backgroundColor: pod.color }}></div>
            <div className="music-card__body">
              <h3>{pod.title}</h3>
              <p className="music-card__artist">{pod.publisher}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RadioView() {
  const stations = [
    { title: 'Pop Mix Radio', desc: 'Continuous pop hits', color: '#3b82f6' },
    { title: 'Chill Vibes', desc: 'Relaxing ambient', color: '#8b5cf6' },
    { title: 'Classic Rock', desc: 'The best of rock', color: '#ef4444' }
  ];

  return (
    <div className="radio-view">
      <div className="dashboard-section__header mt-4">
        <h3>Featured Stations</h3>
      </div>
      
      <div className="dashboard-grid-cards">
        {stations.map((station, i) => (
          <div key={i} className="music-card radio-card">
            <div className="radio-card-art" style={{ backgroundColor: station.color }}></div>
            <div className="music-card__body">
              <h3>{station.title}</h3>
              <p className="music-card__artist">{station.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
