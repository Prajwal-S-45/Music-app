import React, { useEffect, useMemo, useState } from 'react';
import MusicCard from './MusicCard';

const AUDIUS_APP_NAME = 'music_app';
const AUDIUS_DISCOVERY_ENDPOINT = 'https://api.audius.co';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const RECENTLY_PLAYED_KEY = 'music_app_recently_played';

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

const getArtworkUrl = (artwork) => {
  if (!artwork) return DEFAULT_COVER;

  return artwork['1000x1000'] || artwork['480x480'] || artwork['150x150'] || DEFAULT_COVER;
};

const formatDuration = (seconds) => {
  const parsed = Number(seconds);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return '0:00';
  }

  const mins = Math.floor(parsed / 60);
  const secs = Math.floor(parsed % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatTrack = (track, discoveryProvider) => {
  if (!track || !track.id || !discoveryProvider) {
    return null;
  }

  const artworkUrl = getArtworkUrl(track.artwork);

  return {
    id: track.id,
    title: track.title || 'Untitled Track',
    artist: track.user?.name || 'Unknown Artist',
    cover: `${API_URL}/api/music/artwork?url=${encodeURIComponent(artworkUrl)}`,
    duration: Number(track.duration) || 0,
    streamUrl: `${discoveryProvider}/v1/tracks/${track.id}/stream?app_name=${AUDIUS_APP_NAME}`,
    source: 'audius',
  };
};

function DashboardHome({ user, onTrackSelect, onTracksLoaded }) {
  const [tracks, setTracks] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(RECENTLY_PLAYED_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((item) => {
            const coverValue = String(item?.cover || '');
            const migratedCover = coverValue.replace(
              /^https?:\/\/localhost:\d+\/api\/music\/artwork\?/i,
              `${API_URL}/api/music/artwork?`
            );

            return {
              ...item,
              cover: migratedCover || item?.cover,
            };
          });

          setRecentlyPlayed(normalized);
          window.localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(normalized));
        }
      }
    } catch {
      window.localStorage.removeItem(RECENTLY_PLAYED_KEY);
    }
  }, []);

  useEffect(() => {
    const loadTrending = async () => {
      try {
        setLoading(true);

        const discoveryResponse = await fetch(AUDIUS_DISCOVERY_ENDPOINT);
        const discoveryJson = await discoveryResponse.json();
        const providers = Array.isArray(discoveryJson?.data) ? discoveryJson.data : [];

        if (providers.length === 0) {
          throw new Error('No Audius discovery providers available');
        }

        const discoveryProvider = providers[0].replace(/\/$/, '');
        const trendingResponse = await fetch(
          `${discoveryProvider}/v1/tracks/trending?app_name=${AUDIUS_APP_NAME}&limit=18&time=month`
        );
        const trendingJson = await trendingResponse.json();
        const trendingTracks = Array.isArray(trendingJson?.data) ? trendingJson.data : [];

        const normalized = trendingTracks
          .map((track) => formatTrack(track, discoveryProvider))
          .filter(Boolean);

        setTracks(normalized);
        onTracksLoaded?.(normalized);
      } catch (error) {
        console.error('Failed to load dashboard tracks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTrending();
  }, [onTracksLoaded]);

  const recentCards = useMemo(() => {
    return recentlyPlayed.length > 0 ? recentlyPlayed.slice(0, 6) : tracks.slice(0, 6);
  }, [recentlyPlayed, tracks]);

  const curatedMixes = useMemo(() => {
    const source = tracks.length > 0 ? tracks : recentCards;
    return source.slice(0, 6).map((track, index) => ({
      id: `${track.id}-${index}`,
      title: `Daily Mix ${index + 1}`,
      subtitle: `Inspired by ${track.artist}`,
      cover: track.cover,
      track,
    }));
  }, [tracks, recentCards]);

  const trendingMixes = useMemo(() => {
    const source = tracks.length > 0 ? tracks : recentCards;
    return source.slice(6, 12).map((track, index) => ({
      id: `trend-${track.id}-${index}`,
      title: track.title,
      subtitle: `${track.artist} • ${formatDuration(track.duration)}`,
      cover: track.cover,
      track,
    }));
  }, [tracks, recentCards]);

  const playTrack = (track) => {
    if (!track) return;

    onTrackSelect?.(track);

    try {
      const next = [{ ...track, playedAt: Date.now() }, ...recentlyPlayed.filter((item) => item.id !== track.id)].slice(0, 8);
      window.localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(next));
      setRecentlyPlayed(next);
    } catch {
      // Ignore storage failures.
    }
  };

  return (
    <div className="dashboard-home">
      <section className="dashboard-hero">
        <div>
          <span className="dashboard-hero__tag">Your personalized soundscape</span>
          <h2>Made for {user?.name || 'you'}</h2>
          <p>
            Explore trending music, revisit the songs you played recently, and jump into a cleaner streaming
            experience designed with a modern Spotify and JioSaavn feel.
          </p>
        </div>

        <div className="dashboard-hero__stats">
          <div>
            <strong>{tracks.length || '18+'}</strong>
            <span>Trending tracks</span>
          </div>
          <div>
            <strong>{recentCards.length || '6'}</strong>
            <span>Recently played</span>
          </div>
          <div>
            <strong>HQ</strong>
            <span>Audio streaming</span>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <h3>Recently Played</h3>
            <p>Quick access to the songs you loved most.</p>
          </div>
        </div>

        <div className="dashboard-scroll-row" role="list" aria-label="Recently played tracks">
          {(loading ? Array.from({ length: 6 }) : recentCards).map((item, index) => (
            loading ? (
              <div key={`recent-skel-${index}`} className="music-card skeleton" />
            ) : (
              <MusicCard
                key={item.id}
                image={item.cover}
                title={item.title}
                subtitle={`${item.artist} • ${formatDuration(item.duration)}`}
                eyebrow="Recently played"
                compact
                onPlay={() => playTrack(item)}
              />
            )
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <h3>Made Just For You</h3>
            <p>Playlist-inspired cards that feel alive and easy to explore.</p>
          </div>
        </div>

        <div className="dashboard-grid-cards">
          {curatedMixes.map((mix) => (
            <MusicCard
              key={mix.id}
              image={mix.cover}
              title={mix.title}
              subtitle={mix.subtitle}
              eyebrow="Playlist"
              onPlay={() => playTrack(mix.track)}
            />
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <h3>Trending Mixes</h3>
            <p>Fresh picks with the same smooth card interactions.</p>
          </div>
        </div>

        <div className="dashboard-grid-cards">
          {trendingMixes.map((mix) => (
            <MusicCard
              key={mix.id}
              image={mix.cover}
              title={mix.title}
              subtitle={mix.subtitle}
              eyebrow="Trending"
              onPlay={() => playTrack(mix.track)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default DashboardHome;