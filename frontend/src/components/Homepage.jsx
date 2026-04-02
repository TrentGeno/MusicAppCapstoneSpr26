import { useNavigate } from 'react-router-dom';

export default function HomePage({ openModal, library, togglePlay }) {
  const navigate = useNavigate();

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
          <a
            href="#"
            className="view-all"
            onClick={(e) => { e.preventDefault(); navigate('/library'); }}
          >
            View All →
          </a>
        </div>
        <div className="music-grid">
          {library.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <h3>Your library is empty</h3>
              <p className="empty-text">Upload your music files to get started</p>
              <button className="btn btn-primary" onClick={() => openModal('upload')}>Upload Now</button>
            </div>
          ) : (
            library.slice(0, 4).map(song => (
              <div key={song.id} className="music-card">
                <div className="card-cover" style={{ background: song.gradient }}>
                  {song.cover
                    ? <img src={song.cover} alt="cover" className="cover-img" />
                    : <span className="cover-initial">{song.name.charAt(0).toUpperCase()}</span>
                  }
                </div>
                <div className="card-info">
                  <h3 className="card-title">{song.name}</h3>
                  <p className="card-artist">{song.artist}</p>
                </div>
                <div className="card-meta">
                  <button className="play-btn" onClick={(e) => { e.stopPropagation(); togglePlay(song.id); }}>
                    {song.isPlaying ? '⏸' : '▶'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}