import SongCard from './SongCard';

export default function SongsSection({ songs, togglePlay, currentSongId, playlists, fetchLibrary, focusedSongId }) {
  if (songs.length === 0) return <p className="library-empty">No songs found.</p>;

  return (
    <div className="song-card-grid">
      {songs.map(song => (
        <SongCard
          key={song.id}
          song={song}
          cardId={`library-song-${song.id}`}
          isHighlighted={String(song.id) === String(focusedSongId)}
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