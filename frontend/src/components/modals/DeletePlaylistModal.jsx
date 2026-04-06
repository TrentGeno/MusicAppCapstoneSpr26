export default function DeletePlaylistModal({ playlist, onClose, onDelete }) {
  async function handleDelete() {
    try {
      await fetch(`http://localhost:5000/playlists/${playlist.id}`, { method: 'DELETE' });
      onDelete();
    } catch (err) {
      console.error('Failed to delete playlist:', err);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 16, padding: '2rem',
        minWidth: 320, maxWidth: 400, width: '90%',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0' }}>Delete Playlist</h3>
        <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Are you sure you want to delete "{playlist.name}"? This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button
            className="btn"
            style={{ flex: 1, background: '#ff4d4d', color: 'white', border: 'none' }}
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}