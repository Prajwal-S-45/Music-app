import React, { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Heart, ListPlus, MoreHorizontal, Radio, Sparkles, Disc3, Mic2, Film, Music4 } from 'lucide-react';
import apiClient from '../api/client';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=500&q=80';

const formatDuration = (seconds) => {
  const value = Number(seconds) || 0;
  if (!value) return 'Preview';
  const mins = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

import { ChevronDown, ChevronUp, Download, Share2 } from 'lucide-react';

const normalizeKey = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();

function CategorySongRow({ song, index, activeTrackId, onPlayTrack, onLikeTrack, onQueueTrack, isLiked, isSubRow = false }) {
  const isActive = activeTrackId === song.id;

  return (
    <motion.article
      className={`premium-song-row category-song-row ${isActive ? 'is-active' : ''} ${isSubRow ? 'sub-version-row' : ''}`}
      whileHover={{ y: -2 }}
    >
      <div className="song-row-number">{!isSubRow ? index + 1 : 'â†³'}</div>
      <div className="premium-song-row__left cursor-pointer" onClick={() => onPlayTrack?.(song)}>
        <div className="premium-song-row__art">
          <img src={song.cover || song.thumbnail || FALLBACK_IMAGE} alt={song.title} loading="lazy" />
          <button className="premium-song-row__play-btn" aria-label="Play song">
            <Play size={16} fill="currentColor" strokeWidth={0} />
          </button>
        </div>
        <div className="premium-song-row__info">
          <strong className="premium-song-row__title text-slate-100 font-bold text-sm block">{song.title}</strong>
          <span className="premium-song-row__artist text-slate-400 text-xs">{song.artist}</span>
        </div>
      </div>

      <div className="premium-song-row__album text-slate-500 text-xs hidden md:block">{song.album || 'Single'}</div>

      <div className="premium-song-row__stats">
        <span className="premium-song-row__duration text-slate-400 text-xs">{formatDuration(song.duration)}</span>
      </div>

      <div className="premium-song-row__actions opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          type="button"
          className={`premium-song-row__like ${isLiked ? 'liked' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onLikeTrack?.(song);
          }}
          title={isLiked ? 'Unlike' : 'Like'}
        >
          <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} />
        </button>
        <button
          type="button"
          className="premium-song-row__queue"
          onClick={(e) => {
            e.stopPropagation();
            onQueueTrack?.(song);
          }}
          title="Add to queue"
        >
          <ListPlus size={15} />
        </button>
      </div>
    </motion.article>
  );
}

function SongGroupRow({ group, index, activeTrackId, onPlayTrack, onLikeTrack, onQueueTrack, likedSongIds }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { primary, duplicates } = group;

  return (
    <div className="song-group-container">
      <CategorySongRow
        song={primary}
        index={index}
        activeTrackId={activeTrackId}
        onPlayTrack={onPlayTrack}
        onLikeTrack={onLikeTrack}
        onQueueTrack={onQueueTrack}
        isLiked={likedSongIds?.includes(primary.id)}
      />

      {duplicates.length > 0 && (
        <div className="more-versions-toggle-wrapper">
          <button
            type="button"
            className="more-versions-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            <span>{duplicates.length} {duplicates.length === 1 ? 'Other Version' : 'More Versions'}</span>
          </button>
        </div>
      )}

      {isExpanded && duplicates.length > 0 && (
        <div className="more-versions-sublist pl-8 border-l-2 border-slate-800 ml-4 my-1 space-y-1">
          {duplicates.map((subSong, subIdx) => (
            <CategorySongRow
              key={subSong.id || `sub-${subIdx}`}
              song={subSong}
              index={subIdx}
              activeTrackId={activeTrackId}
              onPlayTrack={onPlayTrack}
              onLikeTrack={onLikeTrack}
              onQueueTrack={onQueueTrack}
              isLiked={likedSongIds?.includes(subSong.id)}
              isSubRow={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryAlbumCard({ album }) {
  const navigate = useNavigate();

  const handleClick = () => {
    const artist = album.artist || album.composer || 'Unknown';
    const title = album.title || album.name || 'Untitled';
    navigate(`/album/${encodeURIComponent(artist)}/${encodeURIComponent(title)}${album.id ? `?id=${encodeURIComponent(album.id)}` : ''}`);
  };

  return (
    <motion.button
      type="button"
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="category-card category-card--album group"
      onClick={handleClick}
    >
      <div className="category-card__image-wrapper">
        <img src={album.cover || album.image || FALLBACK_IMAGE} alt={album.title || album.name} loading="lazy" />
        <span className="category-card__play-badge">
          <Play size={16} fill="currentColor" strokeWidth={0} />
        </span>
      </div>
      <div className="category-card__info">
        <strong className="category-card__title">{album.title || album.name}</strong>
        <span className="category-card__sub">{album.artist || album.composer || 'Album'}</span>
        {album.year && <span className="category-card__meta">{album.year}</span>}
      </div>
    </motion.button>
  );
}

function CategoryArtistCard({ artist }) {
  const navigate = useNavigate();
  const title = artist.name || artist.title || 'Artist';
  const initialPhoto = (artist.photo && !artist.photo.includes('unsplash.com'))
    ? artist.photo
    : ((artist.image && !artist.image.includes('unsplash.com')) ? artist.image : null);

  const [photo, setPhoto] = useState(initialPhoto);

  useEffect(() => {
    if (photo && !photo.includes('unsplash.com')) return;
    let isMounted = true;

    apiClient
      .get(`/api/music/artist-image?name=${encodeURIComponent(title)}`)
      .then((res) => {
        if (isMounted && res.data?.url) {
          setPhoto(res.data.url);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [title, photo]);

  const handleClick = () => {
    navigate(`/artists/${encodeURIComponent(title)}`);
  };

  return (
    <motion.button
      type="button"
      whileHover={{ y: -4, scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      className="category-card category-card--artist group"
      onClick={handleClick}
    >
      <div className="category-card__image-wrapper category-card__image-wrapper--round">
        <img src={photo || FALLBACK_IMAGE} alt={title} loading="lazy" />
      </div>
      <div className="category-card__info text-center">
        <strong className="category-card__title">{title}</strong>
        <span className="category-card__sub">{artist.profession || artist.role || 'Artist'}</span>
      </div>
    </motion.button>
  );
}

function CategoryPlaylistCard({ playlist }) {
  const title = playlist.title || playlist.name || 'Playlist';

  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.02 }}
      className="category-card category-card--playlist group"
    >
      <div className="category-card__image-wrapper">
        <img src={playlist.cover || playlist.image || FALLBACK_IMAGE} alt={title} loading="lazy" />
        <span className="category-card__play-badge">
          <Play size={16} fill="currentColor" strokeWidth={0} />
        </span>
      </div>
      <div className="category-card__info">
        <strong className="category-card__title">{title}</strong>
        <span className="category-card__sub">by {playlist.creator || 'JioSaavn'}</span>
        <span className="category-card__meta">{playlist.songCount || 12} Songs</span>
      </div>
    </motion.article>
  );
}

function CategoryPodcastCard({ podcast }) {
  const title = podcast.title || podcast.name || 'Podcast';

  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.02 }}
      className="category-card category-card--podcast group"
    >
      <div className="category-card__image-wrapper">
        <img src={podcast.cover || podcast.image || FALLBACK_IMAGE} alt={title} loading="lazy" />
        <span className="category-card__play-badge">
          <Radio size={16} />
        </span>
      </div>
      <div className="category-card__info">
        <strong className="category-card__title">{title}</strong>
        <span className="category-card__sub">{podcast.host || 'Podcast Host'}</span>
        <span className="category-card__meta">{podcast.season || 'Podcast'}</span>
      </div>
    </motion.article>
  );
}

function CategoryMovieCard({ movie }) {
  const title = movie.title || movie.name || 'Movie Soundtrack';

  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.02 }}
      className="category-card category-card--movie group"
    >
      <div className="category-card__image-wrapper">
        <img src={movie.poster || movie.cover || FALLBACK_IMAGE} alt={title} loading="lazy" />
        <span className="category-card__play-badge">
          <Film size={16} />
        </span>
      </div>
      <div className="category-card__info">
        <strong className="category-card__title">{title}</strong>
        <span className="category-card__sub">{movie.language || 'Hindi'} â€¢ {movie.year || 'Soundtrack'}</span>
        <span className="category-card__meta">{movie.songCount || 5} Songs</span>
      </div>
    </motion.article>
  );
}

function CategoryResultsGrid({
  category = 'songs',
  items = [],
  activeTrackId,
  likedSongIds = [],
  onPlayTrack,
  onLikeTrack,
  onQueueTrack,
}) {
  const cat = category.toLowerCase();

  if (cat === 'songs') {
    // Group identical song titles + artist combinations
    const groupsMap = new Map();
    items.forEach((song) => {
      const key = `${normalizeKey(song.title)}::${normalizeKey(song.artist)}`;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, { primary: song, duplicates: [] });
      } else {
        const group = groupsMap.get(key);
        const titleLower = (song.title || '').toLowerCase();
        if (titleLower.includes('original') || titleLower.includes('official')) {
          group.duplicates.push(group.primary);
          group.primary = song;
        } else {
          group.duplicates.push(song);
        }
      }
    });

    const songGroups = Array.from(groupsMap.values());

    return (
      <div className="category-song-list-vertical">
        {songGroups.map((group, index) => (
          <SongGroupRow
            key={group.primary.id || `group-${index}`}
            group={group}
            index={index}
            activeTrackId={activeTrackId}
            onPlayTrack={onPlayTrack}
            onLikeTrack={onLikeTrack}
            onQueueTrack={onQueueTrack}
            likedSongIds={likedSongIds}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`category-results-grid category-results-grid--${cat}`}>
      {items.map((item, index) => {
        const key = item.id || `item-${cat}-${index}`;
        switch (cat) {
          case 'albums':
            return <CategoryAlbumCard key={key} album={item} />;
          case 'artists':
            return <CategoryArtistCard key={key} artist={item} />;
          case 'playlists':
            return <CategoryPlaylistCard key={key} playlist={item} />;
          case 'podcasts':
            return <CategoryPodcastCard key={key} podcast={item} />;
          case 'movies':
            return <CategoryMovieCard key={key} movie={item} />;
          default:
            return <CategoryAlbumCard key={key} album={item} />;
        }
      })}
    </div>
  );
}

export default memo(CategoryResultsGrid);
