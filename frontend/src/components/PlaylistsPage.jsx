import { useNavigate } from 'react-router-dom';

export default function PlaylistsPage({ playlists, openModal }) {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '2rem 3rem', color: 'white', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'Italiana, serif', fontSize: '2.5rem', fontWeight: 400, margin: 0 }}>
          Your Playlists
        </h2>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); openModal('playlist'); }}
          style={{ color: 'var(--accent-purple)', textDecoration: 'none', fontSize: '0.95rem' }}
        >
          Create Playlist →
        </a>
      </div>

      {playlists.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem',
          background: 'rgba(255,255,255,0.03)', borderRadius: '20px',
          border: '1px dashed rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>📁</div>
          <h3 style={{ fontFamily: 'Italiana, serif', fontSize: '1.8rem', fontWeight: 400, marginBottom: '0.5rem' }}>
            No playlists yet
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>
            Create your first playlist to organize your music
          </p>
          <button
            onClick={() => openModal('playlist')}
            style={{
              padding: '0.75rem 2rem', borderRadius: '50px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
              color: 'white', fontSize: '1rem', fontFamily: 'Work Sans, sans-serif'
            }}
          >
            Create Playlist
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '1.5rem'
        }}>
          {playlists.map(playlist => (
            <div
              key={playlist.id}
              onClick={() => navigate(`/playlists/${playlist.id}`)}
              style={{
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                transition: 'background 0.2s',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              <div style={{
                width: '100%', aspectRatio: '1', borderRadius: '8px',
                overflow: 'hidden', display: 'grid',
                gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2
              }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  (playlist.coverUrls || [])[i]
                    ? <img key={i} src={playlist.coverUrls[i]} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div key={i} style={{ background: `linear-gradient(135deg, rgba(102,126,234,${0.9 - i * 0.15}), rgba(118,75,162,${0.8 - i * 0.1}))` }} />
                ))}
              </div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'white' }}>
                {playlist.name}
              </p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                {playlist.songCount} songs
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
