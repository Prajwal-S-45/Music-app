import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Play } from 'lucide-react';
import MusicCard from './MusicCard';
import apiClient from '../api/client';

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80';

const SKELETON_KEYS = ['recent-skel-1', 'recent-skel-2', 'recent-skel-3', 'recent-skel-4', 'recent-skel-5', 'recent-skel-6'];

const formatDuration = (seconds) => {
  const parsed = Number(seconds);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return '0:00';
  }

  const mins = Math.floor(parsed / 60);
  const secs = Math.floor(parsed % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatTrack = (track) => {
  if (!track || !(track.videoId || track.id)) {
    return null;
  }

  const trackId = track.videoId || track.id;

  return {
    id: trackId,
    videoId: trackId,
    title: track.title || 'Untitled Track',
    artist: track.channelTitle || track.artist || 'Unknown Artist',
    cover: track.thumbnail || track.cover || DEFAULT_COVER,
    duration: Number(track.duration) || 0,
    source: 'youtube',
  };
};

import { PodcastsView, RadioView } from './NewCategories';

function DashboardHome({ user, recentlyPlayed = [], onTrackSelect, onAddToQueue, onLikeTrack, onTracksLoaded }) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePill, setActivePill] = useState('All');
  const onTracksLoadedRef = useRef(onTracksLoaded);

  useEffect(() => {
    onTracksLoadedRef.current = onTracksLoaded;
  }, [onTracksLoaded]);

  useEffect(() => {
    const loadTrending = async () => {
      try {
        setLoading(true);

        const response = await apiClient.get('/api/trending', {
          params: { limit: 40 },
        });
        const trendingTracks = Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
            ? response.data
            : [];

        const normalized = trendingTracks.map((track) => formatTrack(track)).filter(Boolean);

        setTracks(normalized);
        onTracksLoadedRef.current?.(normalized);
      } catch (error) {
        console.error('Failed to load dashboard tracks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTrending();
  }, []);

  const recentCards = useMemo(() => {
    return recentlyPlayed.length > 0 ? recentlyPlayed.slice(0, 18) : tracks.slice(0, 18);
  }, [recentlyPlayed, tracks]);

  const curatedMixes = useMemo(() => {
    const source = tracks.length > 0 ? tracks : recentCards;
    const pool = [...source].reverse();
    return pool.slice(0, 15).map((track, index) => ({
      id: `daily-${track.id}-${index}`,
      title: `Daily Mix ${index + 1}`,
      subtitle: `Inspired by ${track.artist}`,
      cover: track.cover,
      track,
    }));
  }, [tracks, recentCards]);

  const trendingMixes = useMemo(() => {
    const source = tracks.length > 0 ? tracks : recentCards;
    const startOffset = source.length > 15 ? 5 : 0;
    return source.slice(startOffset, startOffset + 25).map((track, index) => ({
      id: `trend-${track.id}-${index}`,
      title: track.title,
      subtitle: `${track.artist} - ${formatDuration(track.duration)}`,
      cover: track.cover,
      track,
    }));
  }, [tracks, recentCards]);

  const featuredTrack = tracks[0] || recentCards[0] || null;

  const playTrack = useCallback((track) => {
    if (!track) return;
    onTrackSelect?.(track);
  }, [onTrackSelect]);

  return (
    <div className="dashboard-home dashboard-home--desktop-reference">
      


      {activePill === 'Podcasts' && <PodcastsView />}
      
      {activePill !== 'Podcasts' && (
        <>
          <section className="dashboard-hero">
        <div className="dashboard-hero__content">
          {user?.isPremium && <span className="dashboard-hero__tag">PREMIUM</span>}
          <h1>Made for {user?.name ? user.name.toLowerCase() : 'you'}</h1>
          <p>
            Dive back into your favorite tracks or discover something new.
          </p>

          <div className="dashboard-hero__actions">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-primary"
              onClick={() => featuredTrack && onTrackSelect?.(featuredTrack)}
            >
              <Play size={18} fill="currentColor" />
              <span>Play Now</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-secondary"
              onClick={() => featuredTrack && onLikeTrack?.(featuredTrack)}
              aria-label="Like featured track"
            >
              <Heart size={18} />
            </motion.button>
          </div>
        </div>

        <div className="dashboard-hero__right-rail">
          <div className="dashboard-hero__artwork">
            <span className="dashboard-hero__vinyl" aria-hidden="true" />
            <img
              src={featuredTrack?.cover || DEFAULT_COVER}
              alt={featuredTrack ? `${featuredTrack.title} artwork` : 'Featured artwork'}
            />
            <div className="dashboard-hero__artwork-glow" />
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <h3>Recently Played</h3>
          </div>
        </div>

        <div className="dashboard-scroll-row" role="list" aria-label="Recently played tracks">
          {(loading ? SKELETON_KEYS : recentCards).map((item) => (
            loading ? (
              <div key={item} className="music-card skeleton" />
            ) : (
              <MusicCard
                key={item.id}
                image={item.cover}
                title={item.title}
                subtitle={item.artist}
                eyebrow="Recently played"
                compact
                track={item}
                onPlayTrack={playTrack}
                onAddToQueue={onAddToQueue}
                onLikeTrack={onLikeTrack}
              />
            )
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <h3>Trending Now</h3>
          </div>
        </div>

        <div className="dashboard-scroll-row">
          {curatedMixes.map((mix) => (
            <MusicCard
              key={mix.id}
              image={mix.cover}
              title={mix.title}
              subtitle={mix.subtitle}
              eyebrow="Playlist"
              track={mix.track}
              onPlayTrack={playTrack}
              onAddToQueue={onAddToQueue}
              onLikeTrack={onLikeTrack}
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

        <div className="dashboard-scroll-row">
          {trendingMixes.map((mix) => (
            <MusicCard
              key={mix.id}
              image={mix.cover}
              title={mix.title}
              subtitle={mix.subtitle}
              eyebrow="Trending"
              track={mix.track}
              onPlayTrack={playTrack}
              onAddToQueue={onAddToQueue}
              onLikeTrack={onLikeTrack}
            />
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <h3>Made For You</h3>
          </div>
        </div>

        <div className="dashboard-scroll-row">
          {curatedMixes.map((mix) => (
            <MusicCard
              key={mix.id}
              image={mix.cover}
              title={mix.title}
              subtitle={mix.subtitle}
              eyebrow="Made For You"
              track={mix.track}
              onPlayTrack={playTrack}
              onAddToQueue={onAddToQueue}
              onLikeTrack={onLikeTrack}
            />
          ))}
        </div>
      </section>
        </>
      )}

      {activePill === 'Radio' && <RadioView />}
    </div>
  );
}

export default DashboardHome;
