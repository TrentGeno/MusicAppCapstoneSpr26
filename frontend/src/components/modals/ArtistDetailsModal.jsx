import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://127.0.0.1:5000';
const MBID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toValidMbid(value) {
  return typeof value === 'string' && MBID_REGEX.test(value) ? value : 'unknown';
}

function AlbumRow({ item, artistMbid, artistName, onTrackNavigate }) {
  const [tracks, setTracks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coverError, setCoverError] = useState(false);
  const fetchedRef = useRef(false);

  const loadTracks = useCallback(async () => {
    if (!item.release_group_id) {
      setTracks([]);
      setError('Tracklist unavailable for this album.');
      return;
    }
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    setError('');
    try {
      const url = `${API_BASE_URL}/artists/${encodeURIComponent(artistMbid)}/release-group/${encodeURIComponent(item.release_group_id)}/tracks?name=${encodeURIComponent(artistName)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTracks(Array.isArray(data.tracks) ? data.tracks : []);
    } catch (e) {
      const msg = e?.message ? `Failed to load tracks (${e.message})` : 'Failed to load tracks.';
      setError(msg);
      fetchedRef.current = false;
    } finally {
      setLoading(false);
    }
  }, [artistMbid, artistName, item.release_group_id]);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  const ownedCount = tracks ? tracks.filter(t => t.owned).length : null;
  const coverUrl = !coverError ? item.cover_art_url : '';
  const coverInitial = (item.title || '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <div className={`album-row ${item.owned ? 'owned' : 'missing'}`}>
      <div className="album-row-header-static">
        <div className="album-row-left">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={`${item.title} cover`}
              className="album-cover-image"
              loading="lazy"
              onError={() => setCoverError(true)}
            />
          ) : (
            <div className="album-cover-fallback" aria-hidden="true">{coverInitial}</div>
          )}
          <div className="album-row-meta">
            <span className="album-row-title">{item.title}</span>
            <div className="album-row-subline">
              {item.primary_type && item.primary_type !== 'Album' && (
                <span className="album-row-type">{item.primary_type}</span>
              )}
              <span className="album-row-year">{item.release_year || '—'}</span>
            </div>
          </div>
        </div>
        <div className="album-row-right">
          {tracks !== null && tracks.length > 0 && (
            <span className="album-owned-count">{ownedCount}/{tracks.length} owned</span>
          )}
        </div>
      </div>

      <div className="album-tracklist">
        {loading && <p className="tracklist-loading">Loading tracks…</p>}
        {error && <p className="tracklist-error">{error}</p>}
        {!loading && !error && tracks && tracks.length === 0 && (
          <p className="tracklist-loading">No tracks found.</p>
        )}
        {!loading && !error && tracks && tracks.map((track, i) => (
          <button
            key={`${track.title}-${i}`}
            type="button"
            className={`track-row ${track.owned ? 'owned' : 'missing'}`}
            disabled={!track.owned}
            title={track.owned ? 'In your library' : 'Not in your library'}
            onClick={() => {
              if (!track.owned || !track.track_id) return;
              onTrackNavigate(track.track_id);
            }}
          >
            <span className="track-number">{track.number}</span>
            <span className="track-title">{track.title}</span>
            <span className="track-duration">{track.duration || '—'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ArtistDetailsModal({ artist, onClose }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [discographyGroups, setDiscographyGroups] = useState([]);
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
        const mbid = toValidMbid(artist.mbid);
        const url = `${API_BASE_URL}/artists/${encodeURIComponent(mbid)}/discography?name=${encodeURIComponent(artist.name || '')}`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to load discography (${response.status})`);
        }

        const payload = await response.json();
        if (active) {
          const raw = Array.isArray(payload.groups) ? payload.groups : [];
          setDiscographyGroups(raw.map((group, gi) => ({
            key: `${group.type || 'group'}-${gi}`,
            type: group.type,
            name: group.name || 'Unknown',
            releaseYear: group.release_year ?? null,
            items: (group.items || []).map((item, ii) => ({
              ...item,
              itemKey: `${item.title || 'track'}-${gi}-${ii}`,
            })),
          })));          setHasLoadedDiscography(true);
        }
      } catch (err) {
        if (active) {
          setDiscographyGroups([]);
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
    setDiscographyGroups([]);
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

            {!isDiscographyLoading && !discographyError && discographyGroups.length === 0 && (
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

            {!isDiscographyLoading && !discographyError && discographyGroups.length > 0 && (
              <div className="discography-groups">
                {discographyGroups.map((group) => (
                  <section key={group.key} className="discography-group">
                    <div className="discography-group-header">
                      <div className="discography-group-title">{group.name}</div>
                    </div>

                    {group.type === 'album' ? (
                      <div className="album-list">
                        {group.items.map((item, ii) => (
                          <AlbumRow
                            key={`${item.title}-${ii}`}
                            item={item}
                            artistMbid={toValidMbid(artist.mbid)}
                            artistName={artist.name || ''}
                            onTrackNavigate={(trackId) => {
                              navigate(`/library?focusSongId=${encodeURIComponent(trackId)}`);
                              onClose();
                            }}
                          />
                        ))}
                      </div>
                    ) : (
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
                    )}
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
