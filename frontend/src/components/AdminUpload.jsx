import React, { useState } from 'react';
import axios from 'axios';
import '../styles/components/AdminUpload.css';

function AdminUpload({ token }) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [duration, setDuration] = useState('');
  const [songFile, setSongFile] = useState(null);
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setArtist('');
    setAlbum('');
    setDuration('');
    setSongFile(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('');

    if (!title.trim() || !artist.trim() || !songFile) {
      setStatus('Title, artist, and song file are required.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('artist', artist.trim());
    formData.append('album', album.trim());
    formData.append('duration', duration || 0);
    formData.append('songFile', songFile);

    try {
      setSubmitting(true);
      await axios.post('http://localhost:5000/api/music/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setStatus('Song uploaded successfully.');
      resetForm();
    } catch (error) {
      if (error.response?.status === 403) {
        setStatus('Upload blocked: this account is not in ADMIN_EMAILS.');
      } else {
        setStatus(error.response?.data?.error || 'Upload failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="admin-upload-panel">
      <div className="admin-upload-header">
        <h3>Admin Upload</h3>
        <p>Upload new tracks to the catalog (admin only).</p>
      </div>

      <form className="admin-upload-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Song title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <input
          type="text"
          placeholder="Artist"
          value={artist}
          onChange={(event) => setArtist(event.target.value)}
        />
        <input
          type="text"
          placeholder="Album"
          value={album}
          onChange={(event) => setAlbum(event.target.value)}
        />
        <input
          type="number"
          placeholder="Duration (seconds)"
          min="0"
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
        />
        <input
          type="file"
          accept="audio/*"
          onChange={(event) => setSongFile(event.target.files?.[0] || null)}
        />

        <button type="submit" disabled={submitting}>
          {submitting ? 'Uploading...' : 'Upload Song'}
        </button>
      </form>

      {status && <div className="admin-upload-status">{status}</div>}
    </section>
  );
}

export default AdminUpload;
