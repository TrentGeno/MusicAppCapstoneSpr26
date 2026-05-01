import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EditPlaylistModal from './components/modals/EditPlaylistModal';
import DeletePlaylistModal from './components/modals/DeletePlaylistModal';

export default function Playlist({ togglePlay, library, playlistQueueRef, fetchPlaylists }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rowMenuOpen, setRowMenuOpen] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState({ name: '', description: '', cover: null });
  const [shuffled, setShuffled] = useState(false);
  const [highlightedTrackId, setHighlightedTrackId] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [addingTrackId, setAddingTrackId] = useState(null);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const trackRowRefs = useRef({});

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function handleShuffle() {
    if (!playlist?.tracks?.length) return;
    const newShuffled = !shuffled;
    setShuffled(newShuffled);
    const ids = playlist.tracks
      .map(t => library.find(s => s.id === t.track_id)?.id)
      .filter(Boolean);
    const queue = newShuffled ? shuffle(ids) : ids;
    playlistQueueRef.current = queue;
    if (newShuffled && queue.length > 0) togglePlay(queue[0]);
  }

  useEffect(() => {
    fetch(`http://127.0.0.1:5000/playlists/${id}`)
      .then(res => res.json())
      .then(data => { setPlaylist(data); setLoading(false); })
      .catch(err => { console.error('Failed to load playlist:', err); setLoading(false); });
  }, [id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        searchRef.current && !searchRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setSearchFocused(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear highlight after animation
  useEffect(() => {
    if (!highlightedTrackId) return;
    const timer = setTimeout(() => setHighlightedTrackId(null), 2000);
    return () => clearTimeout(timer);
  }, [highlightedTrackId]);

  function scrollToTrack(trackId) {
    const el = trackRowRefs.current[trackId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedTrackId(trackId);
    }
  }

  function handlePlaylistMatchClick(t) {
    // Play the track and scroll to it
    handlePlayTrack(t);
    setSearchQuery('');
    setSearchFocused(false);
    scrollToTrack(t.track_id);
  }

  function removeTrack(trackId) {
    fetch(`http://127.0.0.1:5000/playlists/${id}/remove-track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track_id: trackId })
    })
      .then(res => res.json())
      .then(() => {
        setPlaylist(prev => ({
          ...prev,
          tracks: prev.tracks.filter(t => t.track_id !== trackId),
          track_count: (prev.track_count || 1) - 1
        }));
      })
      .catch(err => console.error('Failed to remove track:', err));
  }

  async function addTrackToPlaylist(trackId) {
    setAddingTrackId(trackId);
    try {
      await fetch(`http://127.0.0.1:5000/playlist/${id}/add-track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_id: trackId })
      });
      const res = await fetch(`http://127.0.0.1:5000/playlists/${id}`);
      const data = await res.json();
      setPlaylist(data);
      setSearchQuery('');
      setSearchFocused(false);
      // Scroll to the newly added track
      setTimeout(() => scrollToTrack(trackId), 100);
    } catch (err) {
      console.error('Failed to add track:', err);
    } finally {
      setAddingTrackId(null);
    }
  }

  function formatDuration(seconds) {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function handlePlayTrack(track) {
    const libraryTrack = library.find(s => s.id === track.track_id);
    if (libraryTrack) {
      const queue = playlist.tracks
        .map(t => library.find(s => s.id === t.track_id)?.id)
        .filter(Boolean);
      playlistQueueRef.current = queue;
      togglePlay(libraryTrack.id);
    }
  }

  function handlePlayAll() {
    if (!playlist?.tracks?.length) return;
    const ids = playlist.tracks
      .map(t => library.find(s => s.id === t.track_id)?.id)
      .filter(Boolean);
    const queue = shuffled ? shuffle(ids) : ids;
    playlistQueueRef.current = queue;
    if (queue.length > 0) togglePlay(queue[0]);
  }

  if (loading) return <div style={{ padding: '2rem', color: 'white' }}>Loading...</div>;
  if (!playlist) return <div style={{ padding: '2rem', color: 'white' }}>Playlist not found.</div>;

  const playlistTrackIds = new Set((playlist.tracks || []).map(t => t.track_id));
  const q = searchQuery.toLowerCase().trim();

  const playlistMatches = q
    ? (playlist.tracks || []).filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.artist?.toLowerCase().includes(q) ||
        t.album?.toLowerCase().includes(q)
      )
    : [];

  const libraryMatches = q
    ? library.filter(s =>
        !playlistTrackIds.has(s.id) && (
          s.name?.toLowerCase().includes(q) ||
          s.artist?.toLowerCase().includes(q) ||
          s.album?.toLowerCase().includes(q)
        )
      )
    : [];

  const showDropdown = searchFocused && q.length > 0;

  const totalDuration = (playlist.tracks || []).reduce((acc, t) => acc + (t.duration || 0), 0);
  const totalMinutes = Math.floor(totalDuration / 60);
  const isAnyPlaying = (playlist.tracks || []).some(t =>
    library.find(s => s.id === t.track_id)?.isPlaying
  );

  return (
    <div className="playlist-page">
      <style>{`
        @keyframes highlightPulse {
          0%   { background: rgba(185,103,255,0.35); }
          60%  { background: rgba(185,103,255,0.18); }
          100% { background: transparent; }
        }
        .track-row-highlight {
          animation: highlightPulse 2s ease forwards;
          border-radius: 8px;
        }
      `}</style>

      <div style={{ padding: '1rem 2rem', position: 'relative', zIndex: 10 }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <div className="playlist-hero container" style={{ position: 'relative', zIndex: 200 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          {/* Cover grid */}
          <div style={{ width: 180, height: 180, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 6, flexShrink: 0 }}>
            {(playlist.tracks || []).slice(0, 4).map((t, i) => (
              t.cover_art_url
                ? <img key={i} src={t.cover_art_url} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                : <div key={i} style={{ background: `linear-gradient(135deg, rgba(var(--accent-purple-rgb),${0.7 - i * 0.12}), rgba(var(--accent-pink-rgb),${0.6 - i * 0.1}))`, borderRadius: 6 }} />
            ))}
            {Array.from({ length: Math.max(0, 4 - (playlist.tracks || []).length) }).map((_, i) => (
              <div key={`empty-${i}`} style={{ background: 'rgba(var(--accent-purple-rgb),0.2)', borderRadius: 6 }} />
            ))}
          </div>

          <div className="playlist-info">
            <div className="playlist-type">PLAYLIST</div>
            <h1 className="playlist-title">{playlist.name}</h1>
            <div className="playlist-meta">{playlist.description}</div>

            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {/* Play */}
              <button
                onClick={handlePlayAll}
                style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
                  border: 'none', color: 'var(--text-primary)', fontSize: '1.2rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 10px 30px var(--glow)', transition: 'transform 0.2s ease'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.08)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {isAnyPlaying ? '⏸' : '▶'}
              </button>

              {/* Shuffle */}
              <button
                onClick={handleShuffle}
                style={{
                  background: 'none', border: 'none',
                  color: shuffled ? 'var(--accent-purple)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '1.3rem',
                  opacity: shuffled ? 1 : 0.6, transition: 'color 0.2s, opacity 0.2s'
                }}
                title={shuffled ? 'Shuffle on' : 'Shuffle off'}
              >⇄</button>

              {/* 3 dot menu */}
              <div style={{ position: 'relative', zIndex: 50 }}>
                <button className="btn btn-secondary" onClick={() => setMenuOpen(m => !m)}>⋯</button>
                {menuOpen && (
                  <div style={{ position: 'absolute', marginTop: 8, background: 'var(--background-secondary)', borderRadius: 8, padding: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', zIndex: 100, minWidth: 160, border: '1px solid var(--border)' }}>
                    <div
                      style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 6 }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => { setEditData({ name: playlist.name, description: playlist.description || '', cover: null }); setEditModalOpen(true); setMenuOpen(false); }}
                    >Edit Details</div>
                    <div
                      style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 6, color: '#ff4d4d' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,77,77,0.1)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => { setDeleteConfirm(true); setMenuOpen(false); }}
                    >Delete Playlist</div>
                  </div>
                )}
              </div>

              {/* Search bar with dropdown */}
              <div style={{ position: 'relative' }} ref={searchRef}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: searchFocused ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)',
                  border: `1px solid ${searchFocused ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: showDropdown ? '20px 20px 0 0' : '50px',
                  padding: '8px 16px',
                  transition: 'all 0.2s ease',
                  width: 320,
                }}>
                  <span style={{ fontSize: '0.9rem', opacity: 0.5, flexShrink: 0 }}>🔍</span>
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    placeholder="Add songs to playlist..."
                    style={{
                      flex: 1, background: 'none', border: 'none', outline: 'none',
                      color: 'white', fontSize: '0.9rem', fontFamily: 'Work Sans, sans-serif',
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(''); setSearchFocused(false); }}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1rem', padding: 0, lineHeight: 1 }}
                    >×</button>
                  )}
                </div>

                {/* Dropdown */}
                {showDropdown && (
                  <div
                    ref={dropdownRef}
                    style={{
                      position: 'absolute', top: '100%', left: 0, width: 320,
                      background: 'var(--background-secondary)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderTop: 'none',
                      borderRadius: '0 0 16px 16px',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                      zIndex: 500,
                      maxHeight: 360,
                      overflowY: 'auto',
                      padding: '8px 0',
                    }}
                  >
                    {playlistMatches.length === 0 && libraryMatches.length === 0 && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                        No results for "{searchQuery}"
                      </p>
                    )}

                    {/* Already in playlist — clicking plays and scrolls */}
                    {playlistMatches.length > 0 && (
                      <>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 14px 2px' }}>In this playlist</p>
                        {playlistMatches.map(t => (
                          <div
                            key={t.track_id}
                            onClick={() => handlePlaylistMatchClick(t)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', cursor: 'pointer', transition: 'background 0.15s' }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(185,103,255,0.12)'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                          >
                            {t.cover_art_url
                              ? <img src={t.cover_art_url} alt="" style={{ width: 34, height: 34, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                              : <div style={{ width: 34, height: 34, borderRadius: 4, background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>{t.title?.charAt(0)}</div>
                            }
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</p>
                              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.artist}</p>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', flexShrink: 0 }}>▶ Play</span>
                          </div>
                        ))}
                      </>
                    )}

                    {/* From library — clicking adds */}
                    {libraryMatches.length > 0 && (
                      <>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 14px 2px' }}>From your library</p>
                        {libraryMatches.map(s => (
                          <div
                            key={s.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', transition: 'background 0.15s' }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                          >
                            {s.cover
                              ? <img src={s.cover} alt="" style={{ width: 34, height: 34, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                              : <div style={{ width: 34, height: 34, borderRadius: 4, background: s.gradient || 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>{s.name?.charAt(0)}</div>
                            }
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</p>
                              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.artist}</p>
                            </div>
                            <button
                              onClick={() => addTrackToPlaylist(s.id)}
                              disabled={addingTrackId === s.id}
                              style={{
                                flexShrink: 0, padding: '4px 12px', borderRadius: 50,
                                border: '1px solid var(--accent-purple)', background: 'transparent',
                                color: 'var(--accent-purple)', cursor: 'pointer', fontSize: '0.78rem',
                                fontWeight: 600, opacity: addingTrackId === s.id ? 0.5 : 1
                              }}
                              onMouseOver={e => { e.currentTarget.style.background = 'var(--accent-purple)'; e.currentTarget.style.color = 'white'; }}
                              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--accent-purple)'; }}
                            >
                              {addingTrackId === s.id ? '...' : '+ Add'}
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>
                {playlist.track_count} songs • {totalMinutes} min
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="song-table-header container">
        <div>#</div>
        <div>TITLE</div>
        <div>ALBUM</div>
        <div>DURATION</div>
        <div></div>
      </div>

      <div className="spotify-table container" style={{ marginTop: 8 }}>
        {(playlist.tracks || []).length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎧</div>
            <h3>No songs in this playlist yet</h3>
          </div>
        ) : (
          (playlist.tracks || []).map((t, globalIndex) => {
            const libraryTrack = library.find(s => s.id === t.track_id);
            const isActive = libraryTrack?.isPlaying;
            const isHighlighted = highlightedTrackId === t.track_id;
            return (
              <div
                key={t.track_id}
                ref={el => trackRowRefs.current[t.track_id] = el}
                className={`song-row${isHighlighted ? ' track-row-highlight' : ''}`}
                onClick={() => handlePlayTrack(t)}
                style={{ display: 'grid', gridTemplateColumns: '40px 3fr 2fr 1fr 40px', alignItems: 'center', cursor: 'pointer' }}
              >
                <div style={{ textAlign: 'center', color: isActive ? 'var(--accent-purple)' : 'inherit' }}>
                  {isActive ? '▶' : globalIndex + 1}
                </div>
                <div className="song-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {t.cover_art_url
                    ? <img src={t.cover_art_url} alt="cover" style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} />
                    : <div style={{ width: 40, height: 40, borderRadius: 4, background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {t.title?.charAt(0).toUpperCase()}
                      </div>
                  }
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: isActive ? 'var(--accent-purple)' : 'inherit' }}>{t.title}</p>
                    <span className="track-sub">{t.artist}</span>
                  </div>
                </div>
                <div style={{ opacity: 0.85 }}>{t.album}</div>
                <div style={{ opacity: 0.7 }}>{formatDuration(t.duration)}</div>
                <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setRowMenuOpen(rowMenuOpen === t.track_id ? null : t.track_id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px' }}
                  >⋯</button>
                  {rowMenuOpen === t.track_id && (
                    <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--background-secondary)', borderRadius: 8, padding: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', zIndex: 100, minWidth: 140, border: '1px solid var(--border)' }}>
                      <div
                        style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 6, color: '#ff4d4d' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,77,77,0.1)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => { removeTrack(t.track_id); setRowMenuOpen(null); }}
                      >Remove</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {editModalOpen && (
        <EditPlaylistModal
          playlist={playlist}
          onClose={() => setEditModalOpen(false)}
          onSave={(updated) => setPlaylist(prev => ({ ...prev, name: updated.name, description: updated.description }))}
        />
      )}
      {deleteConfirm && (
        <DeletePlaylistModal
          playlist={playlist}
          onClose={() => setDeleteConfirm(false)}
          onDelete={() => { fetchPlaylists(); navigate('/playlists'); }}
        />
      )}
    </div>
  );
}
