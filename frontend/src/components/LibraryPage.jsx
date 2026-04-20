import { useEffect, useMemo, useState } from 'react';
import '../App.css';
import { useSearchParams, useNavigate } from 'react-router-dom';
import SongCard from './SongCard';
import SongsSection from './SongsSection';
import ArtistsSection from './ArtistsSection';
import AlbumsSection from './AlbumsSection';
import RecentlyAddedSection from './RecentlyAddedSection';

const FILTERS = ['Songs', 'Artists', 'Albums', 'Recently Added'];

export default function LibraryPage({ library, togglePlay, currentSongId, fetchLibrary, playlists, fetchPlaylists }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('Songs');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const focusedSongId = searchParams.get('focusSongId');
  const focusedSong = useMemo(() => {
    if (!focusedSongId) return null;
    return library.find((song) => String(song.id) === String(focusedSongId)) || null;
  }, [focusedSongId, library]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    switch (activeFilter) {
      case 'Songs':
        return library.filter(s =>
          s.name?.toLowerCase().includes(q) ||
          s.artist?.toLowerCase().includes(q) ||
          s.album?.toLowerCase().includes(q)
        );
      case 'Albums': {
        const map = {};
        library.forEach(s => {
          const key = s.album || 'Unknown Album';
          if (!map[key]) map[key] = { name: key, artist: s.artist, songs: [], cover: s.cover };
          map[key].songs.push(s);
        });
        return Object.values(map).filter(a =>
          a.name.toLowerCase().includes(q) || a.artist?.toLowerCase().includes(q)
        );
      }
      case 'Recently Added':
        return [...library]
          .filter(s => s.name?.toLowerCase().includes(q) || s.artist?.toLowerCase().includes(q))
          .reverse();
      default:
        return library;
    }
  }, [activeFilter, search, library]);

  const drillSongs = useMemo(() => {
    if (!selected) return [];
    if (selected.type === 'album') return library.filter(s => (s.album || 'Unknown Album') === selected.item.name);
    return [];
  }, [selected, library]);

  useEffect(() => {
    if (!focusedSong) return;
    setActiveFilter('Songs');
    setSelected(null);
    setSearch(focusedSong.name || '');
  }, [focusedSong]);

  useEffect(() => {
    if (!focusedSongId) return;
    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(`library-song-${focusedSongId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [focusedSongId, filtered, activeFilter]);

  const handleFilterChange = (f) => {
    if (f === 'Artists') {
      navigate('/artists');
      return;
    }
    setActiveFilter(f);
    setSearch('');
    setSelected(null);
    if (f === 'Artists' || f === 'Albums') setViewMode('grid');
  };

  const renderSection = () => {
    const sharedProps = { togglePlay, currentSongId, fetchLibrary, playlists, fetchPlaylists, viewMode };

    switch (activeFilter) {
      case 'Songs':
        return <SongsSection songs={filtered} focusedSongId={focusedSongId} {...sharedProps} />;
      case 'Artists':
        // ArtistsSection handles its own drill-down internally
        return <ArtistsSection library={library} togglePlay={togglePlay} playlists={playlists} fetchLibrary={fetchLibrary} />;
      case 'Albums':
        return <AlbumsSection albums={filtered} onSelect={setSelected} />;
      case 'Recently Added':
        return <RecentlyAddedSection songs={filtered} {...sharedProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="library-page" style={{ minHeight: 'unset' }}>
      {/* Header */}
      <div className="library-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {selected && (
            <button className="back-btn" onClick={() => setSelected(null)}>
              ← Back
            </button>
          )}
          <h1 className="library-title">
            {selected ? selected.item.name : 'Your Library'}
          </h1>
        </div>

        {!selected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              display: 'flex',
              gap: '0.25rem',
              visibility: (activeFilter === 'Songs' || activeFilter === 'Recently Added') ? 'visible' : 'hidden'
            }}>
              {['grid', 'list'].map(mode => (
                <button
                  key={mode}
                  className={`view-toggle-btn ${viewMode === mode ? 'active' : ''}`}
                  onClick={() => setViewMode(mode)}
                  title={`${mode} view`}
                >
                  {mode === 'grid' ? '⊞' : '☰'}
                </button>
              ))}
            </div>
            <input
              className="library-search"
              type="text"
              placeholder="Search in library..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Filter tabs — hidden when drilled in (only for Albums since Artists handles its own) */}
      {!selected && (
        <div className="library-filters">
          {FILTERS.map(f => (
            <button
              key={f}
              className={`filter-pill ${activeFilter === f ? 'active' : ''}`}
              onClick={() => handleFilterChange(f)}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Drill-down view — only used for Albums now */}
      {selected ? (
        <div>
          <div className="drill-hero">
            {selected.item.cover
              ? <img src={selected.item.cover} alt={selected.item.name} className="drill-cover" />
              : <div className="drill-cover-placeholder">💿</div>
            }
            <div className="drill-info">
              <span className="drill-type">{selected.type}</span>
              <h2 className="drill-name">{selected.item.name}</h2>
              {selected.item.artist && (
                <p className="drill-sub">{selected.item.artist}</p>
              )}
              <p className="drill-sub">{drillSongs.length} songs</p>
            </div>
          </div>

          {drillSongs.length === 0 ? (
            <p className="library-empty">No songs found.</p>
          ) : (
            <div className={viewMode === 'grid' ? 'song-card-grid' : 'song-card-list'}>
              {drillSongs.map(song => (
                <SongCard
                  key={song.id}
                  song={song}
                  cardId={`library-song-${song.id}`}
                  isHighlighted={String(song.id) === String(focusedSongId)}
                  togglePlay={togglePlay}
                  currentSongId={currentSongId}
                  playlists={playlists}
                  onDelete={fetchLibrary}
                  fetchPlaylists={fetchPlaylists}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="library-content">
          {renderSection()}
        </div>
      )}
    </div>
  );
}