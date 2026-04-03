import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function Playlist({ togglePlay, library, playlistQueueRef }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch(`http://localhost:5000/playlists/${id}`)
      .then(res => res.json())
      .then(data => {
        setPlaylist(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load playlist:', err);
        setLoading(false);
      });
  }, [id]);

  function removeTrack(trackId) {
    fetch(`http://localhost:5000/playlists/${id}/remove-track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track_id: trackId })
    })
      .then(res => res.json())
      .then(() => {
        setPlaylist(prev => ({
          ...prev,
          tracks: prev.tracks.filter(t => t.track_id !== trackId)
        }));
      })
      .catch(err => console.error('Failed to remove track:', err));
  }

  function formatDuration(seconds) {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function handlePlayTrack(track) {
    const libraryTrack = library.find(s => s.id === track.track_id);
    if (libraryTrack) {
      const queue = playlist.tracks
        .map(t => library.find(s => s.id === t.track_id)?.id)
        .filter(Boolean);
      playlistQueueRef.current = queue;
      togglePlay(libraryTrack.id);
    }
  }

  function handlePlayAll() {
    if (!playlist?.tracks?.length) return;
    const queue = playlist.tracks
      .map(t => library.find(s => s.id === t.track_id)?.id)
      .filter(Boolean);
    playlistQueueRef.current = queue;
    if (queue.length > 0) togglePlay(queue[0]);
  }

  if (loading) return <div style={{ padding: '2rem', color: 'white' }}>Loading...</div>;
  if (!playlist) return <div style={{ padding: '2rem', color: 'white' }}>Playlist not found.</div>;

  const filtered = (playlist.tracks || []).filter(t => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      t.title?.toLowerCase().includes(q) ||
      t.artist?.toLowerCase().includes(q) ||
      t.album?.toLowerCase().includes(q)
    );
  });

  const totalDuration = (playlist.tracks || []).reduce((acc, t) => acc + (t.duration || 0), 0);
  const totalMinutes = Math.floor(totalDuration / 60);

  const isAnyPlaying = (playlist.tracks || []).some(t =>
    library.find(s => s.id === t.track_id)?.isPlaying
  );

  return (
    <div className="playlist-page">
      <div style={{ padding: '1rem 2rem', position: 'relative', zIndex: 10 }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <div className="playlist-hero container">
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ width: 180, height: 180, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 6, flexShrink: 0 }}>
            {(playlist.tracks || []).slice(0, 4).map((t, i) => (
              t.cover_art_url
                ? <img key={i} src={t.cover_art_url} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                : <div key={i} style={{ background: `linear-gradient(135deg, rgba(185,103,255,${0.7 - i * 0.12}), rgba(255,110,199,${0.6 - i * 0.1}))`, borderRadius: 6 }} />
            ))}
            {Array.from({ length: Math.max(0, 4 - (playlist.tracks || []).length) }).map((_, i) => (
              <div key={`empty-${i}`} style={{ background: 'rgba(185,103,255,0.2)', borderRadius: 6 }} />
            ))}
          </div>

          <div className="playlist-info">
            <div className="playlist-type">PLAYLIST</div>
            <h1 className="playlist-title">{playlist.name}</h1>
            <div className="playlist-meta">{playlist.description}</div>

            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={handlePlayAll}
                style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
                  border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 10px 30px var(--glow)', transition: 'transform 0.2s ease'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.08)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {isAnyPlaying ? '⏸' : '▶'}
              </button>

              <div style={{ position: 'relative' }}>
                <button className="btn btn-secondary" onClick={() => setMenuOpen(m => !m)}>⋯</button>
                {menuOpen && (
                  <div style={{ position: 'absolute', marginTop: 8, background: 'var(--bg-card)', borderRadius: 8, padding: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', zIndex: 40 }}>
                    <div style={{ padding: '8px 12px', cursor: 'pointer' }}>Edit Details</div>
                    <div style={{ padding: '8px 12px', cursor: 'pointer', color: '#ff4d4d' }}>Delete Playlist</div>
                  </div>
                )}
              </div>

              <input
                placeholder="Filter"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: 'var(--text-primary)' }}
              />

              <div style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>
                {playlist.track_count} songs • {totalMinutes} min
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="song-table-header container">
        <div>#</div>
        <div>TITLE</div>
        <div>ALBUM</div>
        <div>DURATION</div>
        <div></div>
      </div>

      <div className="spotify-table container" style={{ marginTop: 8 }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎧</div>
            <h3>{filter ? 'No songs match your filter' : 'No songs in this playlist yet'}</h3>
          </div>
        ) : (
          filtered.map((t, i) => {
            const globalIndex = playlist.tracks.indexOf(t);
            const libraryTrack = library.find(s => s.id === t.track_id);
            const isActive = libraryTrack?.isPlaying;
            return (
              <div
                key={t.track_id}
                className="song-row"
                style={{ display: 'grid', gridTemplateColumns: '40px 3fr 2fr 1fr 60px', alignItems: 'center' }}
              >
                <div style={{ textAlign: 'center', color: isActive ? 'var(--accent-purple)' : 'inherit' }}>
                  {globalIndex + 1}
                </div>

                <div className="song-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {t.cover_art_url
                    ? <img src={t.cover_art_url} alt="cover" style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} />
                    : <div style={{ width: 40, height: 40, borderRadius: 4, background: 'linear-gradient(135deg, #b967ff, #ff6ec7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>
                        {t.title?.charAt(0).toUpperCase()}
                      </div>
                  }
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: isActive ? 'var(--accent-purple)' : 'inherit' }}>{t.title}</p>
                    <span className="track-sub">{t.artist}</span>
                  </div>
                </div>

                <div style={{ opacity: 0.85 }}>{t.album}</div>
                <div style={{ opacity: 0.7 }}>{formatDuration(t.duration)}</div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="remove-btn" onClick={() => removeTrack(t.track_id)}>✕</button>
                  <button className="play-btn" onClick={() => handlePlayTrack(t)}>
                    {isActive ? '❚❚' : '▶'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}