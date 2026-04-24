export default function ArtistsSection({ artists, onSelect }) {
  if (artists.length === 0) return <p className="library-empty">No artists found.</p>;

  return (
    <div className="group-grid">
      {artists.map((item, i) => (
        <div key={i} className="group-card" onClick={() => onSelect({ type: 'artist', item })}>
          {item.cover
            ? <img className="group-cover" src={item.cover} alt={item.name} />
            : <div className="group-cover-placeholder">🎤</div>
          }
          <div className="group-name">{item.name}</div>
          <div className="group-sub">{item.songs.length} songs</div>
        </div>
      ))}
    </div>
  );
}