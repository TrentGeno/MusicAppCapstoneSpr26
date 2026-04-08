export default function AlbumsSection({ albums, onSelect }) {
  if (albums.length === 0) return <p className="library-empty">No albums found.</p>;

  return (
    <div className="group-grid">
      {albums.map((item, i) => (
        <div key={i} className="group-card" onClick={() => onSelect({ type: 'album', item })}>
          {item.cover
            ? <img className="group-cover" src={item.cover} alt={item.name} />
            : <div className="group-cover-placeholder">💿</div>
          }
          <div className="group-name">{item.name}</div>
          <div className="group-sub">{item.artist} · {item.songs.length} songs</div>
        </div>
      ))}
    </div>
  );
}