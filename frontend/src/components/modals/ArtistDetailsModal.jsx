import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5000';

export default function ArtistDetailsModal({ artist, onClose }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [discography, setDiscography] = useState([]);
  const [isDiscographyLoading, setIsDiscographyLoading] = useState(false);
  const [discographyError, setDiscographyError] = useState('');
  const [hasLoadedDiscography, setHasLoadedDiscography] = useState(false);

  const loadDiscography = useCallback(() => {
    let active = true;
    setIsDiscographyLoading(true);
    setDiscographyError('');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    void (async () => {
      try {
        const mbid = artist.mbid || 'unknown';
        const pageTitle = artist.wikipedia_title || '';
        const url = `${API_BASE_URL}/artists/${encodeURIComponent(mbid)}/discography?name=${encodeURIComponent(artist.name || '')}&pageTitle=${encodeURIComponent(pageTitle)}`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to load discography (${response.status})`);
        }

        const payload = await response.json();
        if (active) {
          setDiscography(Array.isArray(payload.items) ? payload.items : []);
          setHasLoadedDiscography(true);
        }
      } catch (err) {
        if (active) {
          setDiscography([]);
          setDiscographyError(err.name === 'AbortError' ? 'Discography request timed out. Please try again.' : (err.message || 'Unable to load discography right now.'));
        }
      } finally {
        clearTimeout(timeoutId);
        if (active) {
          setIsDiscographyLoading(false);
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [artist.mbid, artist.name, artist.wikipedia_title]);

  useEffect(() => {
    setDiscography([]);
    setDiscographyError('');
    setIsDiscographyLoading(false);
    setHasLoadedDiscography(false);
  }, [artist.mbid, artist.name, artist.wikipedia_title]);

  useEffect(() => {
    if (activeTab !== 'discography' || hasLoadedDiscography) {
      return undefined;
    }

    return loadDiscography();
  }, [activeTab, hasLoadedDiscography, loadDiscography]);

  const groupedDiscography = useMemo(() => {
    const groups = [];
    const groupMap = new Map();

    discography.forEach((item, index) => {
      const groupName = item.group_name || 'Singles';
      const groupReleaseYear = item.group_release_year ?? item.release_year ?? null;
      const groupKey = groupName;

      if (!groupMap.has(groupKey)) {
        const nextGroup = {
          key: groupKey,
          name: groupName,
          releaseYear: groupReleaseYear,
          items: [],
        };
        groupMap.set(groupKey, nextGroup);
        groups.push(nextGroup);
      }

      const group = groupMap.get(groupKey);
      if (group.releaseYear == null || (groupReleaseYear != null && groupReleaseYear < group.releaseYear)) {
        group.releaseYear = groupReleaseYear;
      }

      group.items.push({
        ...item,
        itemKey: `${item.title}-${index}`,
      });
    });

    return groups;
  }, [discography]);

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
              {artist.bio || 'No biography was found from public artist metadata sources for this artist.'}
            </p>
          </div>
        )}

        {activeTab === 'discography' && (
          <div className="artist-tab-panel">
            {isDiscographyLoading && <p className="library-empty">Loading discography...</p>}
            {!isDiscographyLoading && discographyError && (
              <div className="artist-discography-feedback">
                <p className="library-empty">{discographyError}</p>
                <button type="button" className="artist-retry-btn" onClick={() => {
                  setDiscographyError('');
                  setHasLoadedDiscography(false);
                  loadDiscography();
                }}>
                  Retry
                </button>
              </div>
            )}

            {!isDiscographyLoading && !discographyError && discography.length === 0 && (
              <div className="artist-discography-feedback">
                <p className="library-empty">No discography was found for this artist.</p>
                <button type="button" className="artist-retry-btn" onClick={() => {
                  setHasLoadedDiscography(false);
                  loadDiscography();
                }}>
                  Retry
                </button>
              </div>
            )}

            {!isDiscographyLoading && !discographyError && discography.length > 0 && (
              <div className="discography-groups">
                {groupedDiscography.map((group) => (
                  <section key={group.key} className="discography-group">
                    <div className="discography-group-header">
                      <div className="discography-group-title">{group.name}</div>
                      <div className="discography-group-date">{group.releaseYear || 'Year unknown'}</div>
                    </div>
                    <div className="discography-list">
                      {group.items.map((item) => (
                        <button
                          key={item.itemKey}
                          type="button"
                          className={`discography-item ${item.owned ? 'owned' : 'missing'}`}
                          title={item.owned ? 'In your library' : 'Not in your library'}
                          disabled={!item.owned}
                          onClick={() => {
                            if (!item.owned || !item.track_id) return;
                            navigate(`/library?focusSongId=${encodeURIComponent(item.track_id)}`);
                            onClose();
                          }}
                        >
                          <div className="discography-title">{item.title}</div>
                          <div className="discography-sub">{item.release_year || 'Year unknown'}</div>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
