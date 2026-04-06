import { useState } from 'react';

export default function EditPlaylistModal({ playlist, onClose, onSave }) {
  const [editData, setEditData] = useState({
    name: playlist.name,
    description: playlist.description || '',
    cover: null
  });

  async function handleSave() {
    try {
      const formData = new FormData();
      formData.append('name', editData.name);
      formData.append('description', editData.description);
      if (editData.cover) formData.append('cover', editData.cover);

      const res = await fetch(`http://localhost:5000/playlists/${playlist.playlist_id}`, {
        method: 'PUT',
        body: formData
      });
      const updated = await res.json();
      onSave(updated);
      onClose();
    } catch (err) {
      console.error('Failed to update playlist:', err);
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
          <h2 style={{ margin: 0 }}>Edit Playlist</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Cover Photo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 8, overflow: 'hidden',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              {editData.cover
                ? <img src={URL.createObjectURL(editData.cover)} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '2rem' }}>📋</span>
              }
            </div>
            <label style={{ cursor: 'pointer' }}>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setEditData(prev => ({ ...prev, cover: e.target.files[0] }))} />
              <span className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>Upload Photo</span>
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Name</label>
          <input
            type="text"
            value={editData.name}
            onChange={e => setEditData(prev => ({ ...prev, name: e.target.value }))}
            style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'white', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Description</label>
          <input
            type="text"
            value={editData.description}
            onChange={e => setEditData(prev => ({ ...prev, description: e.target.value }))}
            style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'white', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}