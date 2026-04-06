import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddToPlaylistModal from './modals/AddToPlaylistModal';
import SongCard from './SongCard';

export default function HomePage({ openModal, library, togglePlay, seek, playlists, fetchLibrary }) {
  const navigate = useNavigate();
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

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
          <a href="#" className="view-all" onClick={(e) => { e.preventDefault(); navigate('/recently-added'); }}>
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
              <SongCard
                key={song.id}
                song={song}
                togglePlay={togglePlay}
                playlists={playlists}
                onDelete={fetchLibrary}
              />
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