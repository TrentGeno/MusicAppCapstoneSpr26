import { useEffect, useState } from 'react';

export default function ArtistDetailsModal({ artist, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [discography, setDiscography] = useState([]);
  const [isDiscographyLoading, setIsDiscographyLoading] = useState(false);
  const [discographyError, setDiscographyError] = useState('');

  useEffect(() => {
    if (activeTab !== 'discography' || discography.length > 0 || isDiscographyLoading) {
      return;
    }

    let active = true;

    const loadDiscography = async () => {
      setIsDiscographyLoading(true);
      setDiscographyError('');

      try {
        const mbid = artist.mbid || 'unknown';
        const url = `http://localhost:5000/artists/${encodeURIComponent(mbid)}/discography?name=${encodeURIComponent(artist.name || '')}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load discography (${response.status})`);
        }

        const payload = await response.json();
        if (active) {
          setDiscography(Array.isArray(payload.items) ? payload.items : []);
        }
      } catch (err) {
        if (active) {
          setDiscographyError(err.message || 'Unable to load discography right now.');
        }
      } finally {
        if (active) {
          setIsDiscographyLoading(false);
        }
      }
    };

    loadDiscography();

    return () => {
      active = false;
    };
  }, [activeTab, artist.mbid, artist.name, discography.length, isDiscographyLoading]);

  return (
    <div className="modal" onClick={onClose}>
      <div className="artist-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="artist-modal-header">
          <div className="artist-modal-identity">
            {artist.image_url ? (
              <img
                src={artist.image_url}
                alt={artist.name}
                className="artist-modal-photo"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="artist-modal-photo artist-modal-photo-fallback">🎤</div>
            )}
            <div>
              <h2>{artist.name}</h2>
              <p>
                {artist.track_count || 0} songs
                {' • '}
                {artist.feature_count || 0} features
              </p>
            </div>
          </div>
          <button className="close-modal" onClick={onClose} aria-label="Close artist details">×</button>
        </div>

        <div className="artist-modal-tabs">
          <button
            type="button"
            className={`artist-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            className={`artist-tab ${activeTab === 'discography' ? 'active' : ''}`}
            onClick={() => setActiveTab('discography')}
          >
            Discography
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="artist-tab-panel">
            <div className="artist-date-list">
              <p><strong>Birth date:</strong> {artist.birth_date || 'Unknown'}</p>
              {artist.death_date && <p><strong>Death date:</strong> {artist.death_date}</p>}
            </div>

            <p className="artist-bio">
              {artist.bio || 'No biography is available from Spotify metadata for this artist.'}
            </p>
          </div>
        )}

        {activeTab === 'discography' && (
          <div className="artist-tab-panel">
            {isDiscographyLoading && <p className="library-empty">Loading discography...</p>}
            {!isDiscographyLoading && discographyError && <p className="library-empty">{discographyError}</p>}

            {!isDiscographyLoading && !discographyError && (
              <div className="discography-list">
                {discography.map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    className={`discography-item ${item.owned ? 'owned' : 'missing'}`}
                    title={item.owned ? 'In your library' : 'Not in your library'}
                  >
                    <div className="discography-title">{item.title}</div>
                    <div className="discography-sub">{item.release || 'Single / Unknown Release'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
