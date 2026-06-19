import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <section className="landing-page">
      <p className="eyebrow">Home</p>
      <h1>Explore, queue, and organize your library.</h1>
      <p className="hero-copy">
        Search songs, play from the catalog, and create playlists right after login.
      </p>
      <Link to="/login" className="landing-page__cta">
        Go to Login
      </Link>
    </section>
  );
}

export default HomePage;
