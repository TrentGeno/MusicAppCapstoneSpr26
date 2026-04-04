import { useNavigate } from 'react-router-dom';


export default function PlaylistsPage({ playlists, openModal }) {
  const navigate = useNavigate();
  return (
    <div className="container" style={{ padding: '0 3rem' }}>
    <section id="playlists" className="section">
      <div className="section-header">
        <h2>Your Playlists</h2>
        <a
          href="#"
          className="view-all"
          onClick={(e) => { e.preventDefault(); openModal('playlist'); }}
        >
          Create Playlist →
        </a>
      </div>
      <div className="music-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', padding: '0 1rem' }}>
        {playlists.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h3>No playlists yet</h3>
            <p className="empty-text">Create your first playlist to organize your music</p>
            <button className="btn btn-primary" onClick={() => openModal('playlist')}>
              Create Playlist
            </button>
          </div>
        ) : (
          playlists.map(playlist => {
            console.log(playlist.coverUrls);
            return (
              <div
                key={playlist.id}
                className="music-card"
                onClick={() => navigate(`/playlists/${playlist.id}`)}
                style={{ cursor: 'pointer', padding: '0.75rem 0.75rem 0.5rem 0.75rem' }}>
                <div style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  marginBottom: '0.4rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gridTemplateRows: '1fr 1fr',
                  gap: 2
                }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    (playlist.coverUrls || [])[i]
                      ? <img key={i} src={playlist.coverUrls[i]} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div key={i} style={{ background: `linear-gradient(135deg, rgba(102,126,234,${0.9 - i * 0.15}), rgba(118,75,162,${0.8 - i * 0.1}))` }} />
                  ))}
                </div>
                <p style={{
                  margin: 0,
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {playlist.name}
                </p>
              </div>
            );
          })
        )}
      </div>
    </section>
    </div>
  );
}