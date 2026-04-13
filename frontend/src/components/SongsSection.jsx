import SongCard from './SongCard';

export default function SongsSection({ songs, togglePlay, currentSongId, playlists, fetchLibrary, fetchPlaylists, viewMode }) {
  if (songs.length === 0) return <p className="library-empty">No songs found.</p>;

  return (
    <div className={viewMode === 'grid' ? 'song-card-grid' : 'song-card-list'}>
      {songs.map(song => (
        <SongCard
          key={song.id}
          song={song}
          togglePlay={togglePlay}
          currentSongId={currentSongId}
          playlists={playlists}
          onDelete={fetchLibrary}
          fetchPlaylists={fetchPlaylists}
          viewMode={viewMode}   // ← pass to card for layout changes
        />
      ))}
    </div>
  );
}