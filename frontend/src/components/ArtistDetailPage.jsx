import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../api/client';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80';

function ArtistDetailPage({ onPlayTrack }) {
  const { name } = useParams();
  const navigate = useNavigate();
  const artistName = decodeURIComponent(String(name || ''));
  const [songs, setSongs] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [artistLanguage, setArtistLanguage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadSongs = async () => {
      if (!artistName) {
        setSongs([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage('');

        const [artistResponse, songsResponse, albumsResponse] = await Promise.all([
          apiClient.get('/api/music/artists', {
            params: {
              q: artistName,
              limit: 1,
            },
          }),
          apiClient.get('/api/music/search', {
            params: {
              q: `${artistName} official songs`,
              type: 'song',
              limit: 12,
            },
          }),
          apiClient.get('/api/music/search', {
            params: {
              q: `${artistName} album`,
              type: 'album',
              limit: 8,
            },
          }),
        ]);

        const artistItems = Array.isArray(artistResponse.data?.data) ? artistResponse.data.data : [];
        const primaryArtist = artistItems[0] || null;
        const songItems = Array.isArray(songsResponse.data?.data) ? songsResponse.data.data : [];
        const albumItems = Array.isArray(albumsResponse.data?.data) ? albumsResponse.data.data : [];

        const normalizedSongs = songItems.map((song) => ({
          id: song.videoId || song.id,
          videoId: song.videoId || song.id,
          title: song.title || 'Untitled Track',
          artist: song.channelTitle || artistName,
          thumbnail: song.thumbnail || FALLBACK_IMAGE,
          duration: Number(song.duration) || 0,
          source: 'youtube',
        }));

        const normalizedAlbums = albumItems.map((album, index) => ({
          id: album.videoId || album.id || `album-${index}`,
          title: album.title || 'Untitled Album',
          artist: album.channelTitle || artistName,
          thumbnail: album.thumbnail || FALLBACK_IMAGE,
        }));

        if (mounted) {
          setSongs(normalizedSongs);
          setAlbums(normalizedAlbums);
          setArtistLanguage(primaryArtist?.language || '');
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage('Could not load artist songs right now.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadSongs();
    return () => {
      mounted = false;
    };
  }, [artistName]);

  return (
    <div className="artist-detail-page">
      <div className="artist-detail-page__header">
        <div>
          <p className="artist-detail-page__eyebrow">Artist</p>
          <h2>{artistName || 'Artist'}</h2>
          <p>{artistLanguage ? `${artistLanguage} artist with a live catalog of top songs and albums.` : 'Live artist profile with top songs and albums.'}</p>
        </div>
        <button type="button" className="artist-detail-page__back" onClick={() => navigate('/artists')}>
          Back to Artists
        </button>
      </div>

      <section className="artist-detail-page__bio">
        <h3>Bio</h3>
        <p>
          {artistName
            ? `${artistName} is surfaced dynamically from the live music catalog. Use the sections below to explore popular songs and related albums.`
            : 'Artist details are loaded dynamically from the live catalog.'}
        </p>
      </section>

      {isLoading ? <p className="artist-detail-page__status">Loading songs...</p> : null}
      {errorMessage ? <p className="artist-detail-page__error">{errorMessage}</p> : null}

      {albums.length > 0 ? (
        <section className="artist-detail-page__albums">
          <div className="artist-detail-page__section-head">
            <h3>Albums</h3>
          </div>
          <div className="artist-detail-page__album-grid">
            {albums.map((album) => (
              <button key={album.id} type="button" className="artist-detail-page__album">
                <img src={album.thumbnail} alt={album.title} loading="lazy" />
                <strong>{album.title}</strong>
                <span>{album.artist}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="artist-detail-page__songs">
        {songs.map((song) => (
          <button key={song.id} type="button" className="artist-detail-page__song" onClick={() => onPlayTrack?.(song)}>
            <img src={song.thumbnail} alt={song.title} loading="lazy" />
            <div>
              <strong>{song.title}</strong>
              <span>{song.artist}</span>
            </div>
            <em>Play</em>
          </button>
        ))}
      </div>
    </div>
  );
}

export default ArtistDetailPage;
