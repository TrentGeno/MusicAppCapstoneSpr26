import { useState } from 'react';
import AddToPlaylistModal from './modals/AddToPlaylistModal';
import SongCard from './SongCard';

export default function RecentlyAddedPage({ library, togglePlay, playlists, openModal, fetchLibrary }) {
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  return (
    <div className="container" style={{ padding: '0 3rem' }}>
      <section className="section">
        <div className="section-header">
          <h2>Recently Added</h2>
          <a
            href="#"
            className="view-all"
            onClick={(e) => { e.preventDefault(); openModal('upload'); }}
            >
            Upload Music →
          </a>
        </div>

        <div className="music-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', padding: '0 1rem' }}>
          {library.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <h3>Your library is empty</h3>
              <p className="empty-text">Upload your music files to get started</p>
              <button className="btn btn-primary" onClick={() => openModal('upload')}>Upload Now</button>
            </div>
          ) : (
            library.slice(0, 5).map(song => (
            <SongCard key={song.id}song={song}togglePlay={togglePlay}playlists={playlists}onDelete={fetchLibrary}/>)
            ))}
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