import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/components/LikedSongs.css';

function LikedSongs({ token, refreshSignal }) {
  const [likedSongs, setLikedSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLikedSongs();
  }, [refreshSignal]);

  const fetchLikedSongs = async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.get('http://localhost:5000/api/music/liked', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLikedSongs(response.data);
    } catch (err) {
      setError('Could not load liked songs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="liked-panel">
      <div className="liked-header">
        <h3>Liked Songs</h3>
        <p>Your favorites stay here for quick access.</p>
      </div>

      {loading ? (
        <div className="liked-empty">Loading your liked songs...</div>
      ) : error ? (
        <div className="liked-empty error">{error}</div>
      ) : likedSongs.length === 0 ? (
        <div className="liked-empty">
          No liked songs yet. Tap the heart icon on any track to save it here.
        </div>
      ) : (
        <div className="liked-list">
          {likedSongs.map((song) => (
            <article key={song.id} className="liked-card">
              <div>
                <h4>{song.title}</h4>
                <p>{song.artist}</p>
              </div>
              <span>{song.album || 'Single'}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default LikedSongs;
