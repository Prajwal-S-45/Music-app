import { useRef, useState } from 'react';
import {
  Album, Bell, ChevronDown, Clock3, Crown, Download, Heart, History, Home,
  LibraryBig, ListMusic, Maximize2, Mic2, MoreHorizontal, Music2, Pause,
  Play, Radio, Repeat2, Search, Shuffle, SkipBack, SkipForward,
  SlidersHorizontal, TrendingUp, UsersRound, Volume2,
} from 'lucide-react';
import '../styles/DesktopView.css';

const covers = [
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1501612780327-45045538702b?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80',
];

const recentTracks = [
  ['Ye Dilwalo Ki Basti Hai', 'Arman Yadav', '5:06'], ['Kesariya', 'Pritam, Arijit Singh', '4:28'],
  ['Naanga Naachu', 'Tamil Hits', '3:20'], ['Kasam Khake', '90s Hits', '5:49'],
  ['Reel', 'R Nait', '4:48'], ['Ucha Lambada', 'Times Music', '3:47'], ['Dilbar', 'T-Series', '3:12'],
].map(([title, artist, duration], index) => ({ title, artist, duration, cover: covers[index] }));

const madeForYou = [
  ['Daily Mix 1', 'Hindi pop and indie'], ['Daily Mix 2', 'Your repeat artists'],
  ['Chill Vibes', 'Easy listening'], ['Workout Hits', 'High energy'],
  ['Romantic Hits', 'Love songs'], ['Party Mix', 'Weekend anthems'], ['Late Night', 'After-hours listening'],
].map(([title, subtitle], index) => ({ title, subtitle, cover: covers[(index + 3) % covers.length] }));

const queueTracks = [
  recentTracks[1],
  { title: 'Haan Ke Haan', artist: 'Pritam, Arijit Singh', duration: '4:24', cover: covers[2] },
  { title: 'Tere Vaaste', artist: 'Varun Jain', duration: '4:16', cover: covers[3] },
  { title: 'People', artist: 'Libianca', duration: '3:01', cover: covers[4] },
  { title: 'Sunflower', artist: 'Post Malone, Swae Lee', duration: '2:38', cover: covers[5] },
  { title: 'Blinding Lights', artist: 'The Weeknd', duration: '3:20', cover: covers[6] },
  { title: 'One Love', artist: 'Shubh', duration: '3:15', cover: covers[0] },
];

const browseItems = [
  ['New Releases', TrendingUp], ['Top Charts', TrendingUp], ['Top Playlists', ListMusic],
  ['Podcasts', Mic2], ['Top Artists', UsersRound], ['Radio', Radio],
];
const libraryItems = [
  ['Liked Songs', Heart], ['Playlists', ListMusic],
  ['Albums', Album], ['Artists', UsersRound], ['Downloads', Download],
];

function DesktopView({ user, onLogout }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const recentRef = useRef(null);
  const mixesRef = useRef(null);
  const userName = user?.name || 'Listener';
  const scrollRow = (ref, direction) => ref.current?.scrollBy({ left: direction * 520, behavior: 'smooth' });

  return (
    <div className="desktop-view">
      <DesktopHeader userName={userName} onLogout={onLogout} />
      <DesktopSidebar />
      <main className="desktop-view__main">
        <section className="desktop-view__hero">
          <div className="desktop-view__hero-copy">
            <span>Premium Streaming</span><h1>Made for {userName}</h1>
            <p>Dive back into your favorite tracks or discover something new. Tailored specifically to your taste with premium audio quality.</p>
            <div className="desktop-view__hero-actions">
              <button type="button" className="desktop-view__play-now" onClick={() => setIsPlaying(true)}><Play size={18} fill="currentColor" />Play Now</button>
              <button type="button" aria-label="Like featured mix"><Heart size={19} /></button>
              <button type="button" aria-label="More featured actions"><MoreHorizontal size={20} /></button>
            </div>
          </div>
          <div className="desktop-view__hero-art"><span aria-hidden="true" /><img src={covers[0]} alt="Featured playlist artwork" /></div>
          <div className="desktop-view__stats">
            <Stat icon={TrendingUp} value="29" label="Songs" /><Stat icon={UsersRound} value="32" label="Artists" />
            <Stat icon={ListMusic} value="8.5K" label="Playlists" /><Stat icon={Clock3} value="Weekly" label="Discover" />
          </div>
        </section>
        <MediaSection title="Recently Played" subtitle="Quick access to the songs you loved most." rowRef={recentRef} onScroll={scrollRow}>
          {recentTracks.map((track) => <TrackCard key={track.title} track={track} onPlay={() => setIsPlaying(true)} />)}
        </MediaSection>
        <MediaSection title="Made For You" subtitle="Custom playlists based on your listening habits." rowRef={mixesRef} onScroll={scrollRow}>
          {madeForYou.map((mix) => <MixCard key={mix.title} mix={mix} />)}
        </MediaSection>
      </main>
      <DesktopQueue />
      <DesktopPlayer isPlaying={isPlaying} setIsPlaying={setIsPlaying} />
      <DesktopBottomNav />
    </div>
  );
}

function DesktopHeader({ userName, onLogout }) {
  return <header className="desktop-view__header">
    <div className="desktop-view__brand"><span>M</span><p><strong>Music App</strong><small>Premium Streaming</small></p></div>
    <nav><button type="button" className="active"><Music2 size={17} />Music</button><button type="button"><Mic2 size={17} />Podcasts</button><button type="button"><Radio size={17} />Radio</button></nav>
    <label className="desktop-view__search"><Search size={19} /><input type="search" placeholder="Search songs, artists, albums, podcasts..." /></label>
    <div className="desktop-view__account"><button type="button" className="premium"><Crown size={17} />Upgrade to Premium</button><button type="button" aria-label="Notifications"><Bell size={18} /></button><button type="button" className="profile" onDoubleClick={onLogout} title="Double-click to log out"><span>{userName.charAt(0).toUpperCase()}</span>{userName}<ChevronDown size={16} /></button></div>
  </header>;
}

function DesktopSidebar() {
  return <aside className="desktop-view__sidebar">
    <nav className="desktop-view__primary-nav"><button type="button" className="active"><Home size={18} />Home</button><button type="button"><Search size={18} />Search</button><button type="button"><LibraryBig size={18} />Your Library</button></nav>
    <NavSection title="Browse" items={browseItems} /><NavSection title="Your Library" items={libraryItems} />
  </aside>;
}

function NavSection({ title, items }) {
  return <div className="desktop-view__nav-section"><p>{title}</p>{items.map(([label, Icon]) => <button type="button" key={label}><Icon size={17} />{label}</button>)}</div>;
}

function Stat({ icon: Icon, value, label }) {
  return <div><Icon size={19} /><span><strong>{value}</strong><small>{label}</small></span></div>;
}

function MediaSection({ title, subtitle, rowRef, onScroll, children }) {
  return (
    <section className="desktop-view__media-section">
      <div className="desktop-view__section-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="desktop-view__section-nav">
          <button type="button" aria-label="Previous" onClick={() => onScroll(rowRef, -1)}>&lt;</button>
          <button type="button" aria-label="Next" onClick={() => onScroll(rowRef, 1)}>&gt;</button>
          <button type="button" className="view-all">View All</button>
        </div>
      </div>
      <div className="desktop-view__media-row" ref={rowRef}>
        {children}
      </div>
    </section>
  );
}

function TrackCard({ track, onPlay }) {
  return (
    <div className="desktop-view__track-card group">
      <div className="desktop-view__card-img-wrapper">
        <img src={track.cover} alt={track.title} />
        <button type="button" className="desktop-view__play-btn" onClick={onPlay}>
          <Play size={24} fill="currentColor" />
        </button>
      </div>
      <h3>{track.title}</h3>
      <p>{track.artist}</p>
      <span>{track.duration}</span>
    </div>
  );
}

function MixCard({ mix }) {
  return (
    <div className="desktop-view__mix-card group">
      <div className="desktop-view__card-img-wrapper">
        <img src={mix.cover} alt={mix.title} />
        <button type="button" className="desktop-view__play-btn">
          <Play size={24} fill="currentColor" />
        </button>
      </div>
      <h3>{mix.title}</h3>
      <p>{mix.subtitle}</p>
    </div>
  );
}

function DesktopQueue() {
  return (
    <aside className="desktop-view__queue">
      <div className="desktop-view__queue-header">
        <h2>Up Next</h2>
        <button type="button">Clear</button>
      </div>
      <div className="desktop-view__queue-list">
        {queueTracks.map((track, i) => (
          <div key={i} className="desktop-view__queue-item">
            <img src={track.cover} alt={track.title} />
            <div className="desktop-view__queue-info">
              <h4>{track.title}</h4>
              <p>{track.artist}</p>
            </div>
            <span className="desktop-view__queue-time">{track.duration}</span>
            <button type="button"><MoreHorizontal size={16} /></button>
          </div>
        ))}
      </div>
      <button type="button" className="desktop-view__view-queue-btn">View Full Queue (32)</button>
    </aside>
  );
}

function DesktopPlayer({ isPlaying, setIsPlaying }) {
  return (
    <footer className="desktop-view__player">
      <div className="desktop-view__player-left">
        <img src={recentTracks[0].cover} alt="Now playing" />
        <div>
          <h4>{recentTracks[0].title}</h4>
          <p>{recentTracks[0].artist}</p>
        </div>
        <button type="button"><Heart size={16} /></button>
      </div>
      <div className="desktop-view__player-center">
        <div className="desktop-view__player-controls">
          <button type="button"><Shuffle size={16} /></button>
          <button type="button"><SkipBack size={20} fill="currentColor" /></button>
          <button type="button" className="play-pause" onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button type="button"><SkipForward size={20} fill="currentColor" /></button>
          <button type="button"><Repeat2 size={16} /></button>
        </div>
        <div className="desktop-view__player-progress">
          <span>1:28</span>
          <div className="progress-bar"><div className="progress" style={{ width: '30%' }}></div></div>
          <span>5:06</span>
        </div>
      </div>
      <div className="desktop-view__player-right">
        <button type="button"><Mic2 size={16} /></button>
        <button type="button"><ListMusic size={16} /></button>
        <button type="button"><Volume2 size={16} /></button>
        <div className="volume-bar"><div className="volume" style={{ width: '70%' }}></div></div>
        <button type="button"><Maximize2 size={16} /></button>
      </div>
    </footer>
  );
}

export default DesktopView;

function DesktopBottomNav() {
  return (
    <nav className="desktop-view__bottom-nav">
      <button type="button" className="active">
        <Home size={24} />
        <span>Home</span>
      </button>
      <button type="button">
        <Search size={24} />
        <span>Search</span>
      </button>
      <button type="button">
        <LibraryBig size={24} />
        <span>Library</span>
      </button>
      <button type="button">
        <Crown size={24} />
        <span>Premium</span>
      </button>
    </nav>
  );
}