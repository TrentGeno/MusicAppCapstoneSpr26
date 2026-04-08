import { useState, useMemo } from 'react';
import SongCard from './SongCard';
import SongsSection from './SongsSection';
import ArtistsSection from './ArtistsSection';
import AlbumsSection from './AlbumsSection';
import RecentlyAddedSection from './RecentlyAddedSection';

const FILTERS = ['Songs', 'Artists', 'Albums', 'Recently Added'];

export default function LibraryPage({ library, togglePlay, currentSongId, fetchLibrary }) {
  const [activeFilter, setActiveFilter] = useState('Songs');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null); // { type: 'artist'|'album', item }

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
    const sharedProps = { togglePlay, currentSongId, fetchLibrary };

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
        {!selected && (
          <input
            className="library-search"
            type="text"
            placeholder="Search in library..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
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
            <div className="song-card-grid">
              {drillSongs.map(song => (
                <SongCard
                  key={song.id}
                  song={song}
                  togglePlay={togglePlay}
                  currentSongId={currentSongId}
                  onDelete={fetchLibrary}
                  fetchPlaylists={fetchLibrary}
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

      <style>{`
        .library-page {
          padding: 2rem 2.5rem;
          color: var(--text-primary);
          font-family: 'Segoe UI', sans-serif;
        }
        .library-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .library-title {
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin: 0;
        }
        .back-btn {
          background: rgba(255,255,255,0.1);
          border: none;
          border-radius: 20px;
          color: var(--text-primary);
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          padding: 0.4rem 1rem;
          transition: background 0.2s;
          white-space: nowrap;
        }
        .back-btn:hover { background: rgba(255,255,255,0.2); }
        .library-search {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px;
          padding: 0.5rem 1.1rem;
          color: var(--text-primary);
          font-size: 0.9rem;
          width: 220px;
          outline: none;
          transition: border-color 0.2s;
        }
        .library-search::placeholder { color: var(--text-secondary); }
        .library-search:focus { border-color: var(--btn-border-hover); }
        .library-filters {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.75rem;
          flex-wrap: wrap;
          position: relative;
          z-index: 1;
        }
        .filter-pill {
          background: rgba(255,255,255,0.08);
          border: none;
          border-radius: 20px;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 500;
          padding: 0.45rem 1.1rem;
          transition: background 0.2s, color 0.2s;
        }
        .filter-pill:hover { background: rgba(255,255,255,0.15); color: var(--text-primary); }
        .filter-pill.active { background: var(--accent-purple); color: white; font-weight: 700; }
        .library-empty {
          color: var(--text-secondary);
          font-size: 0.95rem;
          margin-top: 2rem;
        }
        .song-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 1.25rem;
        }
        .group-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 1.25rem;
        }
        .group-card {
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
          padding: 1rem;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
        }
        .group-card:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }
        .group-cover {
          width: 100%;
          aspect-ratio: 1;
          border-radius: 6px;
          object-fit: cover;
          margin-bottom: 0.75rem;
        }
        .group-cover-placeholder {
          width: 100%;
          aspect-ratio: 1;
          border-radius: 6px;
          background: rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          margin-bottom: 0.75rem;
        }
        .group-name {
          font-size: 0.9rem;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .group-sub {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.45);
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .drill-hero {
          display: flex;
          align-items: flex-end;
          gap: 1.5rem;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: rgba(255,255,255,0.04);
          border-radius: 12px;
        }
        .drill-cover {
          width: 120px;
          height: 120px;
          border-radius: 8px;
          object-fit: cover;
          flex-shrink: 0;
        }
        .drill-cover-placeholder {
          width: 120px;
          height: 120px;
          border-radius: 8px;
          background: rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          flex-shrink: 0;
        }
        .drill-info { min-width: 0; }
        .drill-type {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.5);
        }
        .drill-name {
          font-size: 1.75rem;
          font-weight: 800;
          margin: 0.25rem 0 0.5rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .drill-sub {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.5);
          margin: 0 0 0.2rem;
        }
      `}</style>
    </div>
  );
}