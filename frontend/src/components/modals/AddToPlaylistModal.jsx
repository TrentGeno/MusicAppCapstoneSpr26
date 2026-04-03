import { useState } from 'react';

export default function AddToPlaylistModal({ song, playlists, onClose }) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(null);

  async function handleAdd(playlistId) {
    setAdding(true);
    try {
      await fetch(`http://localhost:5000/playlist/${playlistId}/add-track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_id: song.id })
      });
      setAdded(playlistId);
    } catch (err) {
      console.error('Failed to add track:', err);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 16, padding: '2rem',
        minWidth: 360, maxWidth: 480, width: '90%',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Add to Playlist</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 6, background: song.gradient || 'linear-gradient(135deg, #b967ff, #ff6ec7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, flexShrink: 0 }}>
            {song.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>{song.name}</p>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{song.artist}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
          {(playlists || []).length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No playlists yet — create one first!</p>
          ) : (
            (playlists || []).map(playlist => (
              <div
                key={playlist.id}
                onClick={() => !adding && handleAdd(playlist.id)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem 1rem', borderRadius: 10,
                  background: added === playlist.id ? 'rgba(185,103,255,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${added === playlist.id ? 'var(--accent-purple)' : 'rgba(255,255,255,0.06)'}`,
                  cursor: adding ? 'wait' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 500 }}>{playlist.name}</p>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{playlist.songCount} songs</span>
                </div>
                <span style={{ color: added === playlist.id ? 'var(--accent-purple)' : 'var(--text-secondary)', fontSize: '1.2rem' }}>
                  {added === playlist.id ? '✓' : '+'}
                </span>
              </div>
            ))
          )}
        </div>

        <button className="btn btn-primary" onClick={onClose} style={{ width: '100%', marginTop: '1.5rem' }}>
          Done
        </button>
      </div>
    </div>
  );
}