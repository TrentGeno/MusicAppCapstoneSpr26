import React, { useState, useRef, useEffect } from 'react';

// Playlist.jsx
// Updated to match a Spotify-like playlist layout using your provided App.css
// Drop this file into your project (e.g. src/components/Playlist.jsx)

export default function Playlist({ initialTracks }) {
  const [tracks, setTracks] = useState(initialTracks || demoTracks());
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const audioRef = useRef(new Audio());

  // sync audio src when current changes
  useEffect(() => {
    const audio = audioRef.current;
    audio.src = tracks[current]?.src || '';
    audio.pause();
    if (isPlaying && audio.src) audio.play().catch(() => {});
  }, [current, tracks]);

  useEffect(() => {
    if (!audioRef.current.src) return;
    if (isPlaying) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [isPlaying]);

  function togglePlay() {
    if (!tracks.length) return;
    setIsPlaying(p => !p);
  }

  function playAt(i) {
    if (i === current) return setIsPlaying(true);
    setCurrent(i);
    setIsPlaying(true);
  }

  function removeTrack(i) {
    setTracks(t => {
      const copy = [...t];
      copy.splice(i, 1);
      return copy;
    });
  }

  const filtered = tracks.filter(t => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return t.title.toLowerCase().includes(q) || (t.artist || '').toLowerCase().includes(q) || (t.album || '').toLowerCase().includes(q);
  });

  return (
    <div className="playlist-page">
      {/* Header / Hero */}
      <div className="playlist-hero container">
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          {/* Collage-style cover to mimic Spotify */}
          <div style={{ width: 180, height: 180, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 6 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ background: `linear-gradient(135deg, rgba(185,103,255,${0.7 - i*0.12}), rgba(255,110,199,${0.6 - i*0.1}))`, borderRadius: 6 }} />
            ))}
          </div>

          <div className="playlist-info">
            <div className="playlist-type">PLAYLIST</div>
            <h1 className="playlist-title">Driving</h1>
            <div className="playlist-meta">Pop jams for the car</div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="spotify-play" onClick={togglePlay} aria-label="Play playlist">{isPlaying ? '❚❚' : '▶'}</button>
              <button className="spotify-add btn-secondary" onClick={() => alert('Add to your library')}>...</button>
              <div style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>Created by <strong>Ari Vaniderstine</strong> • 28 songs, 1 hr 38 min</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls / Filter */}
      <div className="playlist-controls container" style={{ paddingTop: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="play-button" onClick={togglePlay}>{isPlaying ? '❚❚' : '▶'}</button>
            <button className="btn-secondary" onClick={() => setMenuOpen(m => !m)}>⋯</button>
            {menuOpen && (
              <div style={{ position: 'absolute', marginTop: 40, background: 'var(--bg-card)', borderRadius: 8, padding: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', zIndex: 40 }}>
                <div style={{ padding: '8px 12px', cursor: 'pointer' }}>Go to Playlist Radio</div>
                <div style={{ padding: '8px 12px', cursor: 'pointer' }}>Collaborative Playlist</div>
                <div style={{ padding: '8px 12px', cursor: 'pointer' }}>Make Secret</div>
                <div style={{ padding: '8px 12px', cursor: 'pointer' }}>Edit Details</div>
                <div style={{ padding: '8px 12px', cursor: 'pointer' }}>Delete</div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input placeholder="Filter" value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: 'var(--text-primary)' }} />
            <div style={{ color: 'var(--text-secondary)' }}>Followers <strong style={{ marginLeft: 8 }}>0</strong></div>
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="song-table-header container">
        <div>#</div>
        <div>TITLE</div>
        <div>ALBUM</div>
        <div>DATE ADDED</div>
        <div>⏱</div>
      </div>

      {/* Tracks */}
      <div className="spotify-table container" style={{ marginTop: 8 }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎧</div>
            <h3>No songs match your filter</h3>
          </div>
        ) : (
          filtered.map((t, i) => {
            const globalIndex = tracks.indexOf(t);
            const isActive = globalIndex === current && isPlaying;
            return (
              <div key={t.id} className={`song-row`} style={{ display: 'grid', gridTemplateColumns: '40px 3fr 2fr 1fr 60px', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>{globalIndex + 1}</div>

                <div className="song-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src={t.cover || placeholderCover(t)} alt="cover" style={{ width: 40, height: 40, borderRadius: 4 }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{t.title}</p>
                    <span className="track-sub">{t.artist}</span>
                  </div>
                </div>

                <div style={{ opacity: 0.85 }}>{t.album}</div>
                <div style={{ opacity: 0.7 }}>{t.added}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                  <div className="duration">{t.duration}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="remove-btn" onClick={() => removeTrack(globalIndex)}>✕</button>
                    <button className="play-btn" onClick={() => playAt(globalIndex)}>{isActive ? '❚❚' : '▶'}</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}

// ---------- Demo Data & Helpers ----------
function demoTracks() {
  const base = [
    ['Shut Up and Dance', 'WALK THE MOON', 'TALKING IS HARD', '2015-08-09', '3:19'],
    ['Cough Syrup', 'Young the Giant', 'Young the Giant (Special Edit...)', '2015-08-09', '4:10'],
    ['Pumped Up Kicks', 'Foster the People', 'Torches', '2015-08-09', '4:00'],
    ['Take a Walk', 'Passion Pit', 'Gossamer', '2015-08-09', '4:24'],
    ['Work This Body', 'Walk the Moon', 'TALKING IS HARD', '2015-08-09', '2:56'],
    ['Radioactive', 'Imagine Dragons', 'Night Visions', '2015-08-09', '3:07'],
    ['Everybody Talks', 'Neon Trees', 'Picture Show (Deluxe Edition)', '2015-08-09', '2:57'],
    ['Little Talks', 'Of Monsters and Men', 'My Head Is An Animal', '2015-08-09', '4:27'],
    ['Little Lion Man', 'Mumford & Sons', 'Sigh No More', '2015-08-09', '4:05'],
    ['Geronimo', 'Sheppard', 'Bombs Away', '2015-08-09', '3:38'],
    ['I Will Wait', 'Mumford & Sons', 'Babel', '2015-08-09', '4:37']
  ];

  return base.map((b, i) => ({
    id: `t-${i + 1}`,
    title: b[0],
    artist: b[1],
    album: b[2],
    added: b[3],
    duration: b[4],
    cover: '',
    src: ''
  }));
}

function placeholderCover(track) {
  const title = (track?.title || 'PP').slice(0, 2);
  const svg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0' stop-color='%23ff6ec7'/><stop offset='1' stop-color='%23b967ff'/></linearGradient></defs><rect width='100%' height='100%' fill='url(%23g)' rx='8'/><text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' font-family='Work Sans, sans-serif' font-size='48' fill='white'>${encodeURIComponent(title)}</text></svg>`;
  return svg;
}
