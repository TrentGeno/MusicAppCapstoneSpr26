import { useState } from 'react';
import SongCard from './SongCard';

export default function ArtistsSection({ library, togglePlay, playlists, fetchLibrary }) {
  const [selectedArtist, setSelectedArtist] = useState(null);

  // Build artist map from library
  const artistMap = {};
  library.forEach(s => {
    const key = s.artist || 'Unknown Artist';
    if (!artistMap[key]) artistMap[key] = { name: key, songs: [], cover: s.cover };
    artistMap[key].songs.push(s);
  });
  const artists = Object.values(artistMap);

  if (selectedArtist) {
    const songs = library.filter(s => (s.artist || 'Unknown Artist') === selectedArtist.name);
    return (
      <div style={{ padding: '2rem 2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>
          {selectedArtist.cover
            ? <img src={selectedArtist.cover} alt={selectedArtist.name} style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            : <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', flexShrink: 0 }}>🎤</div>
          }
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Artist</div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.25rem 0 0.5rem' }}>{selectedArtist.name}</h2>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>{songs.length} songs</p>
          </div>
        </div>

        <button
          onClick={() => setSelectedArtist(null)}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '20px', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, padding: '0.4rem 1rem', marginBottom: '1.5rem' }}
        >
          ← Back to Artists
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.25rem' }}>
          {songs.map(song => (
            <SongCard key={song.id} song={song} togglePlay={togglePlay} playlists={playlists} onDelete={fetchLibrary} fetchPlaylists={fetchLibrary} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem 2.5rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1.5rem' }}>Artists</h1>
      {artists.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>No artists found.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.25rem' }}>
          {artists.map((artist, i) => (
            <div
              key={i}
              onClick={() => setSelectedArtist(artist)}
              style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '1rem', cursor: 'pointer' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              {artist.cover
                ? <img src={artist.cover} alt={artist.name} style={{ width: '100%', aspectRatio: '1', borderRadius: '50%', objectFit: 'cover', marginBottom: '0.75rem' }} />
                : <div style={{ width: '100%', aspectRatio: '1', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎤</div>
              }
              <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artist.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{artist.songs.length} songs</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}