import { useState } from 'react';
import AddToPlaylistModal from './modals/AddToPlaylistModal';

export default function SongCard({ song, togglePlay, viewMode, playlists, onDelete, fetchPlaylists }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [addToPlaylist, setAddToPlaylist] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const isListView = viewMode === 'list'; // ← derive from viewMode

  const renderMenu = () => (
  <div style={{ position: 'relative', flexShrink: 0 }}>
    <button
      onClick={(e) => { e.stopPropagation(); setMenuOpen(m => !m); }}
      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px' }}
    >
      ⋯
    </button>
    {menuOpen && (
      <div
        style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--bg-card)', borderRadius: 8, padding: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', zIndex: 50, minWidth: 160, border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 6 }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          onClick={() => { setAddToPlaylist(true); setMenuOpen(false); }}
        >
          Add to Playlist
        </div>
        <div
          style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 6, color: '#ff4d4d' }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,77,77,0.1)'}
          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          onClick={() => { setDeleteConfirm(true); setMenuOpen(false); }}
        >
          Delete
        </div>
      </div>
    )}
  </div>
);

  return (
    <>
      {isListView ? (
        // ── List layout ──────────────────────────────────────────
        <div
          className="song-card song-card--list"
          onClick={() => togglePlay(song.id)}
          style={{ cursor: 'pointer' }}
        >
          {song.cover
            ? <img src={song.cover} alt="cover" className="song-thumb-sm" />
            : <div className="song-thumb-sm song-thumb-placeholder">{song.name.charAt(0).toUpperCase()}</div>
          }
        <div className="song-info" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span className="song-name">{song.name}</span>
          <span className="song-artist">{song.artist}</span>
        </div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', flexShrink: 0 }}>
            {song.duration}
          </span>
          {renderMenu()}
        </div>
      ) : (
        // ── Grid layout ──────────────────────────────────────────
        <div
          className="music-card"
          onClick={() => togglePlay(song.id)}
          style={{ cursor: 'pointer', padding: '0.75rem 0.75rem 0.5rem 0.75rem', position: 'relative', minWidth: 0 }}
        >
          <div style={{
            width: '100%', aspectRatio: '1', borderRadius: '8px',
            background: song.gradient, display: 'flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: '0.4rem', overflow: 'hidden', flexShrink: 0
          }}>
            {song.cover
              ? <img src={song.cover} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '2rem', color: 'white', fontWeight: 600 }}>{song.name.charAt(0).toUpperCase()}</span>
            }
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4, minWidth: 0 }}>
            <div style={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {song.name}
              </p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {song.artist}
              </p>
            </div>
            {renderMenu()}
          </div>
        </div>
      )}

      {addToPlaylist && (
        <AddToPlaylistModal
          song={song}
          playlists={playlists}
          onClose={() => setAddToPlaylist(false)}
          fetchPlaylists={fetchPlaylists}
        />
      )}

      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '2rem', minWidth: 320, maxWidth: 400, width: '90%', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Delete Song</h3>
            <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Are you sure you want to delete "{song.name}"? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn"
                style={{ flex: 1, background: '#ff4d4d', color: 'var(--text-primary)', border: 'none' }}
                onClick={async () => {
                  try {
                    await fetch(`http://localhost:5000/tracks/${song.id}`, { method: 'DELETE' });
                    setDeleteConfirm(false);
                    if (onDelete) onDelete(song.id);
                  } catch (err) {
                    console.error('Failed to delete track:', err);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}