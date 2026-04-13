import { useState, useMemo } from 'react';
import '../App.css';
import SongCard from './SongCard';
import SongsSection from './SongsSection';
import ArtistsSection from './ArtistsSection';
import AlbumsSection from './AlbumsSection';
import RecentlyAddedSection from './RecentlyAddedSection';

const FILTERS = ['Songs', 'Artists', 'Albums', 'Recently Added'];

export default function LibraryPage({ library, togglePlay, currentSongId, fetchLibrary, playlists, fetchPlaylists }) {
  const [activeFilter, setActiveFilter] = useState('Songs');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // ← moved up here

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    switch (activeFilter) {
      case 'Songs':
        return library.filter(s =>
          s.name?.toLowerCase().includes(q) ||
          s.artist?.toLowerCase().includes(q) ||
          s.album?.toLowerCase().includes(q)
        );
      case 'Artists': {
        const map = {};
        library.forEach(s => {
          const key = s.artist || 'Unknown Artist';
          if (!map[key]) map[key] = { name: key, songs: [], cover: s.cover };
          map[key].songs.push(s);
        });
        return Object.values(map).filter(a => a.name.toLowerCase().includes(q));
      }
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
    if (selected.type === 'artist') return library.filter(s => (s.artist || 'Unknown Artist') === selected.item.name);
    if (selected.type === 'album') return library.filter(s => (s.album || 'Unknown Album') === selected.item.name);
    return [];
  }, [selected, library]);

  const handleFilterChange = (f) => {
    setActiveFilter(f);
    setSearch('');
    setSelected(null);
  };

  const renderSection = () => {
    const sharedProps = { togglePlay, currentSongId, fetchLibrary, playlists, fetchPlaylists, viewMode };

    switch (activeFilter) {
      case 'Songs':
        return <SongsSection songs={filtered} {...sharedProps} />;
      case 'Artists':
        return <ArtistsSection artists={filtered} onSelect={setSelected} />;
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

        {/* Search + view toggle — hidden when drilled in */}
        {!selected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              className="library-search"
              type="text"
              placeholder="Search in library..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              ⊞
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              ☰
            </button>
          </div>
        )}
      </div>

      {/* Filter tabs — hidden when drilled in */}
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

      {/* Drill-down view */}
      {selected ? (
        <div>
          <div className="drill-hero">
            {selected.item.cover
              ? <img src={selected.item.cover} alt={selected.item.name} className="drill-cover" />
              : <div className="drill-cover-placeholder">
                  {selected.type === 'artist' ? '🎤' : '💿'}
                </div>
            }
            <div className="drill-info">
              <span className="drill-type">{selected.type}</span>
              <h2 className="drill-name">{selected.item.name}</h2>
              {selected.type === 'album' && selected.item.artist && (
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
                  togglePlay={togglePlay}
                  currentSongId={currentSongId}
                  playlists={playlists}
                  onDelete={fetchLibrary}
                  fetchPlaylists={fetchPlaylists}
                  viewMode={viewMode}  // ← also pass here for drill-down
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