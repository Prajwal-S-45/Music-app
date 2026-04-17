import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import '../styles/components/Search.css';

function Search({ token, onPlayTrack, onQueueTrack, onLikeUpdate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [likedSongIds, setLikedSongIds] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [playlistSelections, setPlaylistSelections] = useState({});
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchLikedSongs();
    fetchPlaylists();
  }, [token]);

  const fetchLikedSongs = async () => {
    if (!token) return;

    try {
      const response = await apiClient.get('/api/music/liked', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const likedSongs = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];
      setLikedSongIds(likedSongs.map((song) => song.id));
    } catch (error) {
      console.error('Error fetching liked songs for search:', error);
    }
  };

  const fetchPlaylists = async () => {
    if (!token) return;

    try {
      const response = await apiClient.get('/api/playlists', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlaylists(response.data);
    } catch (error) {
      console.error('Error fetching playlists for search actions:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      const response = await apiClient.get(`/api/music/search?query=${query}`);
      const nextResults = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];
      setResults(nextResults);
      setSearched(true);
      setStatus('');
    } catch (error) {
      console.error('Error searching:', error);
      setResults([]);
    }
  };

  const playTrack = (song) => {
    if (onPlayTrack) {
      onPlayTrack(song);
    }
    setStatus(`Playing ${song.title}`);
  };

  const likeTrack = async (song, event) => {
    event.stopPropagation();

    if (!token) {
      setStatus('Login required to like songs.');
      return;
    }

    try {
      await apiClient.post(
        '/api/music/like',
        { songId: song.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLikedSongIds((current) => [...new Set([...current, song.id])]);
      setStatus(`Liked ${song.title}`);

      if (onLikeUpdate) {
        onLikeUpdate();
      }
    } catch (error) {
      if (error.response?.status === 400) {
        setStatus('Song already liked.');
        return;
      }

      setStatus('Could not like this song right now.');
    }
  };

  const queueTrack = (song, event) => {
    event.stopPropagation();

    if (onQueueTrack) {
      onQueueTrack(song);
      setStatus(`${song.title} added to queue`);
    }
  };

  const handlePlaylistSelection = (songId, playlistId) => {
    setPlaylistSelections((current) => ({
      ...current,
      [songId]: playlistId,
    }));
  };

  const addToPlaylist = async (song, event) => {
    event.stopPropagation();

    if (!token) {
      setStatus('Login required to add songs to playlists.');
      return;
    }

    const selectedPlaylistId = playlistSelections[song.id];
    if (!selectedPlaylistId) {
      setStatus('Select a playlist before adding.');
      return;
    }

    try {
      await apiClient.post(
        '/api/playlists/add-song',
        { playlistId: selectedPlaylistId, songId: song.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus(`${song.title} added to playlist`);
    } catch (error) {
      if (error.response?.data?.error) {
        setStatus(error.response.data.error);
        return;
      }

      setStatus('Could not add song to playlist.');
    }
  };

  return (
    <div className="search-container">
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="🔍 Search songs, artists, albums..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      {searched && (
        <div className="search-results">
          {results.length > 0 ? (
            <>
              <h3>Found {results.length} song(s)</h3>
              <div className="results-list">
                {results.map((song) => {
                  const isLiked = likedSongIds.includes(song.id);

                  return (
                    <div key={song.id} className="result-item" onClick={() => playTrack(song)}>
                      <div className="result-info">
                        <p className="title">{song.title}</p>
                        <p className="artist">{song.artist}</p>
                      </div>
                      <div className="result-actions">
                        <span className="album">{song.album || 'Single'}</span>
                        <button
                          type="button"
                          className="result-button play"
                          onClick={(event) => {
                            event.stopPropagation();
                            playTrack(song);
                          }}
                        >
                          Play
                        </button>
                        <button
                          type="button"
                          className="result-button queue"
                          onClick={(event) => queueTrack(song, event)}
                        >
                          Queue
                        </button>
                        <button
                          type="button"
                          className={`result-button like ${isLiked ? 'liked' : ''}`}
                          onClick={(event) => likeTrack(song, event)}
                        >
                          {isLiked ? '♥' : '♡'}
                        </button>
                        <select
                          className="result-playlist-select"
                          value={playlistSelections[song.id] || ''}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => handlePlaylistSelection(song.id, event.target.value)}
                        >
                          <option value="">Select playlist</option>
                          {playlists.map((playlist) => (
                            <option key={playlist.id} value={playlist.id}>
                              {playlist.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="result-button add"
                          onClick={(event) => addToPlaylist(song, event)}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="no-results">No songs found</p>
          )}
        </div>
      )}

      {status && <div className="search-status">{status}</div>}
    </div>
  );
}

export default Search;
