import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import '../styles/components/Playlists.css';

function Playlists({ token }) {
  const [playlists, setPlaylists] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const authHeaders = token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {};

  const fetchPlaylists = async () => {
    try {
      const response = await apiClient.get('/api/playlists', authHeaders);
      setPlaylists(response.data);
    } catch (err) {
      setError('Could not load playlists');
    }
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Playlist name is required');
      return;
    }

    try {
      await apiClient.post('/api/playlists/create', { name, description }, authHeaders);

      setName('');
      setDescription('');
      setSuccess('Playlist created successfully');
      fetchPlaylists();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create playlist');
    }
  };

  return (
    <div className="playlists-panel">
      <div className="playlists-header">
        <h3>Your Playlists</h3>
        <p>Create and manage your personal music collections.</p>
      </div>

      <form className="playlist-form" onSubmit={handleCreatePlaylist}>
        <input
          type="text"
          placeholder="Playlist name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows="3"
        />
        <button type="submit">Create Playlist</button>
      </form>

      {error && <div className="playlist-message error">{error}</div>}
      {success && <div className="playlist-message success">{success}</div>}

      <div className="playlist-list">
        {playlists.length > 0 ? (
          playlists.map((playlist) => (
            <div key={playlist.id} className="playlist-card">
              <h4>{playlist.name}</h4>
              <p>{playlist.description || 'No description added yet.'}</p>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>No playlists yet. Create your first one above.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Playlists;
