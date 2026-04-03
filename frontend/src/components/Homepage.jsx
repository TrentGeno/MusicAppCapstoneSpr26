import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddToPlaylistModal from './modals/AddToPlaylistModal';

export default function HomePage({ openModal, library, togglePlay, playlists }) {
  const navigate = useNavigate();
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState(null);

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Your Personal Music Library</h1>
            <p className="hero-paragraph">
              Upload your downloaded music collection and organize it beautifully.
              Create playlists, manage your library, and enjoy your favorite tracks offline.
            </p>
            <div className="cta-buttons">
              <button className="btn btn-primary" onClick={() => openModal('upload')}>Upload Music</button>
              <button className="btn btn-secondary" onClick={() => openModal('playlist')}>Create Playlist</button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="vinyl-container">
              <div className="vinyl"></div>
              <div className="album-art">🎵</div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Songs Preview */}
      <section className="section">
        <div className="section-header">
          <h2>Recently Added</h2>
          <a href="#" className="view-all" onClick={(e) => { e.preventDefault(); navigate('/library'); }}>
            View All →
          </a>
        </div>
        <div className="music-grid" style={{ 
          gridTemplateColumns: 'repeat(5, 1fr)',
          alignItems: 'start'
        }}>
          {library.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <h3>Your library is empty</h3>
              <p className="empty-text">Upload your music files to get started</p>
              <button className="btn btn-primary" onClick={() => openModal('upload')}>Upload Now</button>
            </div>
          ) : (
            library.slice(0, 5).map(song => (
              <div
                key={song.id}
                className="music-card"
                onClick={() => togglePlay(song.id)}
                style={{ cursor: 'pointer', padding: '0.75rem 0.75rem 0.5rem 0.75rem', position: 'relative', minWidth: 0 }}
              >
                {/* Cover */}
                <div style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: '8px',
                  background: song.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.4rem',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                {song.cover
                  ? <img src={song.cover} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '2rem', color: 'white', fontWeight: 600 }}>{song.name.charAt(0).toUpperCase()}</span>
                }
              </div>

                {/* Info + 3 dot menu */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4, minWidth: 0 }}>
                  <div style={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
                    <p style={{
                      margin: 0,
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {song.name}
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {song.artist}
                    </p>
                  </div>

                  {/* 3 dot menu */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === song.id ? null : song.id); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px' }}
                    >
                      ⋯
                    </button>
                    {menuOpenId === song.id && (
                      <div
                        style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--bg-card)', borderRadius: 8, padding: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', zIndex: 50, minWidth: 160, border: '1px solid rgba(255,255,255,0.08)' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <div
                          style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 6, transition: 'background 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                          onClick={() => { setAddToPlaylistSong(song); setMenuOpenId(null); }}
                        >
                          Add to Playlist
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {addToPlaylistSong && (
        <AddToPlaylistModal
          song={addToPlaylistSong}
          playlists={playlists}
          onClose={() => setAddToPlaylistSong(null)}
        />
      )}
    </div>
  );
}