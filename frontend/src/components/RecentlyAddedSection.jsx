import SongCard from './SongCard';

export default function RecentlyAddedSection({ songs, togglePlay, currentSongId, playlists, fetchLibrary }) {
  if (songs.length === 0) return <p className="library-empty">No recently added songs found.</p>;

  return (
    <div className="song-card-grid">
      {songs.map(song => (
        <SongCard
          key={song.id}
          song={song}
          togglePlay={togglePlay}
          currentSongId={currentSongId}
          playlists={playlists}
          onDelete={fetchLibrary}
          fetchPlaylists={fetchLibrary}
        />
      ))}
    </div>
  );
}