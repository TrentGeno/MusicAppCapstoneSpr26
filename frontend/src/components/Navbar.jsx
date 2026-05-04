import { NavLink } from 'react-router-dom';

export default function Navbar({ onCustomize }) {
  return (
    <header className="header">
      <NavLink to="/" className="logo">OffBeat</NavLink>
      <nav className="nav">
        <NavLink className="nav-link" to="/library">Library</NavLink>
        <NavLink className="nav-link" to="/playlists">Playlists</NavLink>
        <NavLink className="nav-link" to="/artists">Artists</NavLink>
      </nav>
      <div className="auth-section">
        <button className="btn btn-signin" onClick={onCustomize}>
          <span aria-hidden="true" style={{ display: 'inline-flex', marginRight: '0.5rem', verticalAlign: 'middle' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 20h4l10.4-10.4a1.9 1.9 0 0 0 0-2.7L16.1 4.6a1.9 1.9 0 0 0-2.7 0L3 15v5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12.8 5.2l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Customize
        </button>
      </div>
    </header>
  );
}