import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EditPlaylistModal from './components/modals/EditPlaylistModal';
import DeletePlaylistModal from './components/modals/DeletePlaylistModal';

export default function Playlist({ togglePlay, library, playlistQueueRef, fetchPlaylists }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [rowMenuOpen, setRowMenuOpen] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState({ name: '', description: '', cover: null });
  const [shuffled, setShuffled] = useState(false);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function handleShuffle() {
  if (!playlist?.tracks?.length) return;
  const newShuffled = !shuffled;
  setShuffled(newShuffled);

  const ids = playlist.tracks
    .map(t => library.find(s => s.id === t.track_id)?.id)
    .filter(Boolean);

  const queue = newShuffled ? shuffle(ids) : ids;
  playlistQueueRef.current = queue;

  if (queue.length > 0) togglePlay(queue[0]);
}

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
  const ids = playlist.tracks
    .map(t => library.find(s => s.id === t.track_id)?.id)
    .filter(Boolean);
  const queue = shuffled ? shuffle(ids) : ids;
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
console.log(playlist);
return (
    <div className="playlist-page">
      <div style={{ padding: '1rem 2rem', position: 'relative', zIndex: 10 }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <div className="playlist-hero container" style={{ position: 'relative', zIndex: 200 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ width: 180, height: 180, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 6, flexShrink: 0 }}>
            {(playlist.tracks || []).slice(0, 4).map((t, i) => (
              t.cover_art_url
                ? <img key={i} src={t.cover_art_url} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                : <div key={i} style={{ background: `linear-gradient(135deg, rgba(var(--accent-purple-rgb),${0.7 - i * 0.12}), rgba(var(--accent-pink-rgb),${0.6 - i * 0.1}))`, borderRadius: 6 }} />
            ))}
            {Array.from({ length: Math.max(0, 4 - (playlist.tracks || []).length) }).map((_, i) => (
              <div key={`empty-${i}`} style={{ background: 'rgba(var(--accent-purple-rgb),0.2)', borderRadius: 6 }} />
            ))}
          </div>

          <div className="playlist-info">
            <div className="playlist-type">PLAYLIST</div>
            <h1 className="playlist-title">{playlist.name}</h1>
            <div className="playlist-meta">{playlist.description}</div>

            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {/* Play button */}
              <button
                onClick={handlePlayAll}
                style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
                  border: 'none', color: 'var(--text-primary)', fontSize: '1.2rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 10px 30px var(--glow)', transition: 'transform 0.2s ease'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.08)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {isAnyPlaying ? '⏸' : '▶'}
              </button>

              {/* Shuffle placeholder */}
              <button
                onClick={handleShuffle}
                style={{
                  background: 'none',
                  border: 'none',
                  color: shuffled ? 'var(--accent-purple)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '1.3rem',
                  opacity: shuffled ? 1 : 0.6,
                  transition: 'color 0.2s, opacity 0.2s'
                }}
                title={shuffled ? 'Shuffle on' : 'Shuffle off'}
              >
                ⇄
              </button>

              {/* 3 dot menu */}
              <div style={{ position: 'relative', zIndex: 50 }}>
                <button className="btn btn-secondary" onClick={() => setMenuOpen(m => !m)}>⋯</button>
                {menuOpen && (
                  <div style={{ position: 'absolute', marginTop: 8, background: 'var(--background-secondary)', borderRadius: 8, padding: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', zIndex: 100, minWidth: 160, border: '1px solid var(--border)' }}>
                    <div
                      style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 6 }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => {setEditData({ name: playlist.name, description: playlist.description || '', cover: null }); setEditModalOpen(true); setMenuOpen(false); }}
                    >
                      Edit Details
                    </div>
                    <div
                      style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 6, color: '#ff4d4d' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,77,77,0.1)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => { setDeleteConfirm(true); setMenuOpen(false); }}
                    >
                      Delete Playlist
                    </div>
                  </div>
                )}
              </div>

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
              onClick={() => handlePlayTrack(t)}
              style={{ display: 'grid', gridTemplateColumns: '40px 3fr 2fr 1fr 40px', alignItems: 'center', cursor: 'pointer' }}
            >
              <div style={{ textAlign: 'center', color: isActive ? 'var(--accent-purple)' : 'inherit' }}>
                {isActive ? '▶' : globalIndex + 1}
              </div>

              <div className="song-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {t.cover_art_url
                  ? <img src={t.cover_art_url} alt="cover" style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} />
                  : <div style={{ width: 40, height: 40, borderRadius: 4, background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', fontWeight: 600 }}>
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

              <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setRowMenuOpen(rowMenuOpen === t.track_id ? null : t.track_id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px' }}
                >
                  ⋯
                </button>
                {rowMenuOpen === t.track_id && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--background-secondary)', borderRadius: 8, padding: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', zIndex: 100, minWidth: 140, border: '1px solid var(--border)' }}>
                    <div
                      style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 6, color: '#ff4d4d' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,77,77,0.1)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => { removeTrack(t.track_id); setRowMenuOpen(null); }}
                    >
                      Remove
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })
        )}
      </div>
      {editModalOpen && (<EditPlaylistModal playlist={playlist}onClose={() => setEditModalOpen(false)}onSave={(updated) => setPlaylist(prev => ({ ...prev, name: updated.name, description: updated.description }))}/>)}
      
      {deleteConfirm && (<DeletePlaylistModal playlist={playlist}onClose={() => setDeleteConfirm(false)}onDelete={() => {fetchPlaylists();navigate('/playlists');}}/>)}
    </div>
    
  );
}