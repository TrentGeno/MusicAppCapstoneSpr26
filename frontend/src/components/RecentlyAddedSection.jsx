import SongCard from './SongCard';

export default function RecentlyAddedSection({ songs, togglePlay, currentSongId, playlists, fetchLibrary, fetchPlaylists, viewMode }) {
  if (songs.length === 0) return <p className="library-empty">No recently added songs found.</p>;

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
          viewMode={viewMode}
        />
      ))}
    </div>
  );
}