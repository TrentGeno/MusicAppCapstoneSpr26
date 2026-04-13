import { useEffect, useMemo, useState } from 'react';
import ArtistDetailsModal from './modals/ArtistDetailsModal';

export default function ArtistsPage() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedArtist, setSelectedArtist] = useState(null);

  useEffect(() => {
    let active = true;

    const loadArtists = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('http://localhost:5000/artists');
        if (!response.ok) {
          throw new Error(`Failed to load artists (${response.status})`);
        }
        const payload = await response.json();
        if (active) {
          setArtists(Array.isArray(payload) ? payload : []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load artists right now.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadArtists();

    return () => {
      active = false;
    };
  }, []);

  const filteredArtists = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return artists;

    return artists.filter((artist) => {
      return (
        (artist.name || '').toLowerCase().includes(q) ||
        (artist.bio || '').toLowerCase().includes(q)
      );
    });
  }, [artists, search]);

  return (
    <div className="library-page artists-page">
      <div className="library-header">
        <h1 className="library-title">Artists</h1>
        <input
          className="library-search"
          type="text"
          placeholder="Search artists..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && <p className="library-empty">Loading artist cards...</p>}
      {!loading && error && <p className="library-empty">{error}</p>}

      {!loading && !error && (
        <div className="artist-cards-grid">
          {filteredArtists.map((artist) => (
            <button
              key={artist.mbid || artist.name}
              type="button"
              className="artist-card"
              onClick={() => setSelectedArtist(artist)}
            >
              <div className="artist-card-image-wrap">
                {artist.image_url ? (
                  <img
                    className="artist-card-image"
                    src={artist.image_url}
                    alt={artist.name}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="artist-card-fallback">🎤</div>
                )}
              </div>

              <div className="artist-card-name">{artist.name}</div>
              <div className="artist-card-meta">
                <span>{artist.track_count || 0} songs</span>
                <span>{artist.feature_count || 0} features</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && !error && filteredArtists.length === 0 && (
        <p className="library-empty">No artists matched your search.</p>
      )}

      {selectedArtist && (
        <ArtistDetailsModal
          artist={selectedArtist}
          onClose={() => setSelectedArtist(null)}
        />
      )}
    </div>
  );
}
