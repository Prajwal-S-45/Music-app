import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play, Shuffle, Heart, MoreHorizontal,
  Clock, Share2, Disc, ListMusic, Plus,
} from 'lucide-react';
import { getArtistAlbums, searchSongs } from '../api/musicApi';
import '../styles/AlbumDetailsStyles.css';

/* ─── Helpers ─── */
const fmt = (s) => {
  if (!s) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const extractMovieName = (albumName) => {
  const regex = /(?:\(|\[)\s*from\s+["'“‘]([^"'”’]+)["'”’]\s*(?:\)|\])/i;
  const match = albumName.match(regex);
  if (match && match[1]) return match[1].trim();

  const regexNoQuotes = /(?:\(|\[)\s*from\s+([^)\]]+)(?:\)|\])/i;
  const matchNoQuotes = albumName.match(regexNoQuotes);
  if (matchNoQuotes && matchNoQuotes[1]) {
    return matchNoQuotes[1].replace(/movie|film/gi, '').trim();
  }
  return null;
};

const sumDuration = (tracks) => {
  const total = tracks.reduce((a, t) => a + (Number(t.duration) || 0), 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h} hr ${m} min`;
  return `${m} min`;
};

/* ─── Skeleton ─── */
const SkeletonLoader = () => (
  <div className="adp-page">
    <div className="adp-skel-hero">
      <div className="adp-skel-cover adp-shimmer" />
      <div className="adp-skel-info">
        <div className="adp-skel-line adp-shimmer" style={{ height: 12, width: '20%' }} />
        <div className="adp-skel-line adp-shimmer" style={{ height: 52, width: '70%' }} />
        <div className="adp-skel-line adp-shimmer" style={{ height: 16, width: '35%' }} />
        <div className="adp-skel-line adp-shimmer" style={{ height: 12, width: '45%' }} />
      </div>
    </div>
    <div style={{ padding: '28px 40px 0' }}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="adp-skel-track-row">
          <div className="adp-skel-idx adp-shimmer" />
          <div className="adp-skel-track-info">
            <div className="adp-skel-line adp-shimmer" style={{ height: 14, width: `${40 + (i * 7) % 30}%` }} />
            <div className="adp-skel-line adp-shimmer" style={{ height: 10, width: '20%' }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ─── Track Row (memoised) ─── */
const TrackRow = memo(({ song, idx, isPlaying, onPlay, onQueue, onLike, likedIds }) => {
  const [liked, setLiked] = useState(likedIds.has(song.id || song.videoId));

  const handleLike = (e) => {
    e.stopPropagation();
    setLiked(prev => !prev);
    if (onLike) onLike(song);
  };

  const handleQueue = (e) => {
    e.stopPropagation();
    if (onQueue) onQueue(song);
  };

  return (
    <tr
      className={`adp-track-row${isPlaying ? ' playing' : ''}`}
      onClick={() => onPlay(song)}
    >
      <td className="adp-idx-cell">
        <span className="adp-idx-num">{idx + 1}</span>
        <Play size={15} className="adp-idx-play-icon" fill="currentColor" />
      </td>
      <td>
        <div className="adp-title-cell">
          <span className="adp-track-title">{song.title || 'Untitled'}</span>
          <span className="adp-track-singer">{song.artist || song.channelTitle || ''}</span>
        </div>
      </td>
      <td className="adp-duration-cell adp-hide-mobile">{fmt(song.duration)}</td>
      <td>
        <div className="adp-row-actions">
          <button className={`adp-row-btn${liked ? ' liked' : ''}`} onClick={handleLike} title="Like">
            <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
          </button>
          <button className="adp-row-btn" onClick={handleQueue} title="Add to queue">
            <Plus size={16} />
          </button>
          <button className="adp-row-btn" onClick={e => e.stopPropagation()} title="More">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
});

/* ─── Related Album Card ─── */
const RelatedCard = memo(({ album, onClick, onPlay }) => (
  <div className="adp-related-card" onClick={onClick}>
    <div className="adp-related-img-wrap">
      <img src={album.cover} alt={album.name} loading="lazy" />
      <div className="adp-related-overlay">
        <button
          className="adp-related-play-btn"
          onClick={e => { e.stopPropagation(); onPlay(album, e); }}
          title={`Play ${album.name}`}
        >
          <Play size={20} fill="currentColor" />
        </button>
      </div>
    </div>
    <div className="adp-related-title">{album.name}</div>
    <div className="adp-related-meta">{album.year || '—'} · {album.type || 'Album'}</div>
  </div>
));

/* ─── Main Component ─── */
export default function AlbumDetailsPage({ onPlayTrack, onQueueTrack, onLikeUpdate }) {
  const { artistName: rawArtist, albumName: rawAlbum } = useParams();
  const navigate = useNavigate();

  const decodedArtist = decodeURIComponent(rawArtist || '');
  const decodedAlbum  = decodeURIComponent(rawAlbum  || '');

  const [albumData,    setAlbumData]    = useState(null);
  const [allArtistAlbums, setAllArtistAlbums] = useState([]);
  const [tracks,       setTracks]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [isLiked,      setIsLiked]      = useState(false);
  const [activeId,     setActiveId]     = useState(null);

  const likedIds = useRef(new Set());

  /* ── Fetch ── */
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setTracks([]);
    setAlbumData(null);

    const run = async () => {
      try {
        const movieName = extractMovieName(decodedAlbum);
        // Clean query — jiosaavnService already appends "official audio video"
        const albumSearch = movieName || decodedAlbum;
        const searchQueryStr = `${albumSearch} movie songs`;

        /* Parallel: album metadata + track search (high limit to capture full soundtrack) */
        const [albumsRes, songsRes] = await Promise.allSettled([
          getArtistAlbums(decodedArtist, { nocache: 'true' }),
          searchSongs(searchQueryStr, 40),
        ]);

        if (!alive) return;

        /* Album metadata */
        if (albumsRes.status === 'fulfilled') {
          const list = albumsRes.value?.data?.data ?? albumsRes.value?.data ?? albumsRes.value ?? [];
          const albums = Array.isArray(list) ? list : [];
          setAllArtistAlbums(albums);
          const match = albums.find(a =>
            a.name.toLowerCase() === decodedAlbum.toLowerCase()
          );
          setAlbumData(match ?? {
            name: decodedAlbum,
            artist: decodedArtist,
            cover: null, type: 'Album', year: '', genre: '', label: '',
          });
        } else {
          setAlbumData({ name: decodedAlbum, artist: decodedArtist, cover: null, type: 'Album', year: '' });
        }

        /* Tracks */
        if (songsRes.status === 'fulfilled') {
          const raw = songsRes.value?.data;
          const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);

          // Patterns for non-original/fan-made content to exclude
          const junkPatterns = [
            /\bmashup\b/i,
            /\bcover\s+(song|version)\b/i,
            /\bdance\s+cover\b/i,
            /\bslowed\s*(\+|and|&)\s*reverb\b/i,
            /\b(8d|16d)\s*audio\b/i,
            /\blofi\b/i,
            /\blo-fi\b/i,
            /\bkaraoke\b/i,
            /\binstrumental\b/i,
            /\bringtone\b/i,
            /\bbehind\s+the\s+scenes\b/i,
            /\bmaking\s+of\b/i,
            /\breaction\b/i,
            /\bparody\b/i,
            /\btutorial\b/i,
            /\bjukebox\b/i,
            /\bnon[\s-]*stop\b/i,
            /\ball\s+songs\b/i,
            /\bfull\s+album\b/i,
            /\bbest\s+(hits|of)\b/i,
          ];

          const normalised = arr
            .map((s, i) => ({
              ...s,
              id: s.videoId || s.id || String(i),
              videoId: s.videoId || s.id,
              cover: s.thumbnail || s.cover || '',
              artist: s.channelTitle || s.artist || decodedArtist,
              source: 'jiosaavn',
              playable: Boolean(s.videoId || s.id),
            }))
            .filter(s => {
              const title = (s.title || s.name || '').toLowerCase();
              const dur = Number(s.duration) || 0;
              // Exclude jukebox/compilations (>10 min) and very short clips (<1 min)
              if (dur > 0 && (dur > 600 || dur < 60)) return false;
              return !junkPatterns.some(p => p.test(title));
            });

          // Deduplicate: extract core song name, keep first occurrence
          const seen = new Set();
          const unique = normalised.filter(s => {
            const baseName = (s.title || s.name || '')
              .toLowerCase()
              .replace(/\(.*?\)/g, '')       // remove parenthetical
              .replace(/\|.*$/g, '')          // remove after pipe
              .replace(/[-–—].*?(official|full|video|audio|song|lyric|hd|4k).*/gi, '')
              .replace(/[^a-z0-9\s]/g, '')
              .trim()
              .split(/\s+/).slice(0, 3).join(' ');  // first 3 words for matching
            if (!baseName || seen.has(baseName)) return false;
            seen.add(baseName);
            return true;
          });

          setTracks(unique);
        }
      } catch (err) {
        if (alive) setError(err.message || 'Something went wrong.');
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();
    return () => { alive = false; };
  }, [rawArtist, rawAlbum]);

  /* ── Playback handlers ── */
  const playSong = useCallback((song, idx, list) => {
    if (!song.playable || !onPlayTrack) return;
    setActiveId(song.id);
    onPlayTrack(song);
    // Queue remaining
    if (onQueueTrack && list) {
      list.slice(idx + 1).forEach(t => { if (t.playable) onQueueTrack(t); });
    }
  }, [onPlayTrack, onQueueTrack]);

  const playAll = useCallback(() => {
    if (!tracks.length || !onPlayTrack) return;
    const first = tracks[0];
    setActiveId(first.id);
    onPlayTrack(first);
    if (onQueueTrack) tracks.slice(1).forEach(t => { if (t.playable) onQueueTrack(t); });
  }, [tracks, onPlayTrack, onQueueTrack]);

  const shufflePlay = useCallback(() => {
    if (!tracks.length || !onPlayTrack) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    setActiveId(shuffled[0].id);
    onPlayTrack(shuffled[0]);
    if (onQueueTrack) shuffled.slice(1).forEach(t => { if (t.playable) onQueueTrack(t); });
  }, [tracks, onPlayTrack, onQueueTrack]);

  const playRelated = useCallback(async (album, e) => {
    e.stopPropagation();
    try {
      const res = await searchSongs(`${decodedArtist} ${album.name} songs`, 10);
      const raw = res?.data;
      const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      const songs = arr.map(s => ({
        ...s,
        id: s.videoId || s.id,
        videoId: s.videoId || s.id,
        cover: s.thumbnail || s.cover || '',
        artist: s.channelTitle || s.artist || decodedArtist,
        source: 'jiosaavn',
        playable: Boolean(s.videoId || s.id),
      })).filter(s => s.playable);
      if (songs.length && onPlayTrack) {
        onPlayTrack(songs[0]);
        if (onQueueTrack) songs.slice(1).forEach(t => onQueueTrack(t));
      }
    } catch { /* silent */ }
  }, [decodedArtist, onPlayTrack, onQueueTrack]);

  /* ── Derived ── */
  const relatedAlbums = allArtistAlbums.filter(
    a => a.name.toLowerCase() !== decodedAlbum.toLowerCase() && a.cover
  ).slice(0, 12);

  const coverUrl = albumData?.cover
    || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=600&q=80';

  /* ── Render ── */
  if (loading) return <SkeletonLoader />;

  if (error) {
    return (
      <div className="adp-page" style={{ padding: '40px' }}>
        <div className="adp-empty">
          <Disc size={72} className="adp-empty-icon" />
          <h3>Couldn't load album</h3>
          <p>{error}</p>
          <button
            onClick={() => navigate(-1)}
            style={{ marginTop: 12, padding: '10px 24px', background: '#1ed760', color: '#000', border: 'none', borderRadius: 24, fontWeight: 700, cursor: 'pointer' }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="adp-page">
      {/* ── Hero ── */}
      <div
        className="adp-hero"
        style={{ backgroundImage: `url(${coverUrl})` }}
      >
        <div className="adp-hero-inner">
          <div className="adp-cover-wrap">
            <img src={coverUrl} alt={decodedAlbum} className="adp-cover" loading="lazy" />
          </div>
          <div className="adp-info">
            <span className="adp-type-badge">{albumData?.type || 'Album'}</span>
            <h1 className="adp-title">{albumData?.name || decodedAlbum}</h1>

            <div
              className="adp-artist-row"
              onClick={() => navigate(`/artist/${encodeURIComponent(rawArtist)}`)}
            >
              <img
                className="adp-artist-avatar"
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(decodedArtist)}&background=1ed760&color=000&size=60`}
                alt={decodedArtist}
              />
              <span className="adp-artist-name">{decodedArtist}</span>
            </div>

            <div className="adp-meta-chips">
              {albumData?.year && <span className="adp-meta-chip">{albumData.year}</span>}
              {albumData?.year && <span className="adp-meta-dot">•</span>}
              <span className="adp-meta-chip">{tracks.length} songs</span>
              {tracks.length > 0 && <><span className="adp-meta-dot">•</span><span className="adp-meta-chip">{sumDuration(tracks)}</span></>}
              {albumData?.genre && <><span className="adp-meta-dot">•</span><span className="adp-meta-chip">{albumData.genre}</span></>}
            </div>
            {albumData?.label && (
              <div className="adp-label-text">{albumData.label}</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Action Bar ── */}
      <div className="adp-action-bar">
        <button className="adp-btn-play" onClick={playAll} title="Play All">
          <Play fill="currentColor" size={28} />
        </button>
        <button className="adp-btn-shuffle" onClick={shufflePlay} title="Shuffle">
          <Shuffle size={20} />
        </button>
        <button
          className={`adp-icon-btn${isLiked ? ' liked' : ''}`}
          onClick={() => setIsLiked(p => !p)}
          title={isLiked ? 'Unlike' : 'Like'}
        >
          <Heart size={28} fill={isLiked ? 'currentColor' : 'none'} />
        </button>
        <button className="adp-icon-btn" title="Share">
          <Share2 size={24} />
        </button>
        <button className="adp-icon-btn" title="More">
          <MoreHorizontal size={24} />
        </button>
      </div>

      {/* ── Tracklist ── */}
      <div className="adp-tracks-section">
        {tracks.length === 0 ? (
          <div className="adp-empty">
            <ListMusic size={80} className="adp-empty-icon" />
            <h3>No tracks found</h3>
            <p>We couldn't find songs for this album. Try searching directly.</p>
          </div>
        ) : (
          <table className="adp-table">
            <thead>
              <tr>
                <th className="center" style={{ width: 44 }}>#</th>
                <th>Title</th>
                <th className="center adp-hide-mobile"><Clock size={14} /></th>
                <th style={{ width: 110 }} />
              </tr>
            </thead>
            <tbody>
              {tracks.map((song, idx) => (
                <TrackRow
                  key={song.id || idx}
                  song={song}
                  idx={idx}
                  isPlaying={activeId === song.id}
                  onPlay={s => playSong(s, idx, tracks)}
                  onQueue={onQueueTrack}
                  onLike={onLikeUpdate}
                  likedIds={likedIds.current}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Related Albums ── */}
      {relatedAlbums.length > 0 && (
        <div className="adp-related-section">
          <h2 className="adp-section-title">More by {decodedArtist}</h2>
          <div className="adp-related-scroll">
            {relatedAlbums.map(album => (
              <RelatedCard
                key={album.id}
                album={album}
                onClick={() => navigate(`/album/${encodeURIComponent(rawArtist)}/${encodeURIComponent(album.name)}`)}
                onPlay={playRelated}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
