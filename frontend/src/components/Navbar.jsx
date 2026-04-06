import { NavLink } from 'react-router-dom';
import { useState } from 'react';

export default function Navbar({ user, onSignIn, onSignOut }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="header">
      <NavLink to="/" className="logo">OffBeat</NavLink>
      <nav className="nav">
        <NavLink className="nav-link" to="/LibraryPage">Library</NavLink>
        <NavLink className="nav-link" to="/playlists">Playlists</NavLink>
        <NavLink className="nav-link" to="/artists">Artists</NavLink>
      </nav>
      <div className="auth-section">
        {user ? (
          <div className="user-menu">
            <div className="user-info" onClick={() => setDropdownOpen(prev => !prev)}>
              <img
                src={user.photoURL}
                alt="user-avatar"
                referrerPolicy="no-referrer"
                className="user-avatar"
              />
              <span className="user-name">{user.name}</span>
              <span className="dropdown-arrow">▾</span>
            </div>
            {dropdownOpen && (
              <div className="user-dropdown">
                <p className="dropdown-email">{user.email}</p>
                <hr className="dropdown-divider" />
                <button className="dropdown-signout" onClick={onSignOut}>Sign Out</button>
              </div>
            )}
          </div>
        ) : (
          <button className="btn btn-signin" onClick={onSignIn}>Sign In</button>
        )}
      </div>
    </header>
  );
}