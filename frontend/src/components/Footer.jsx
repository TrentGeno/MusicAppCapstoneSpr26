import { NavLink } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{
  background: 'var(--background-secondary)',
  borderTop: '1px solid var(--border)',
  padding: '2rem 0',
}}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Logo + tagline */}
          <div>
            <div style={{
              fontFamily: 'Italiana, serif',
              fontSize: '1.5rem',
              background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '2px',
              marginBottom: '0.25rem'
            }}>
              OffBeat
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 300 }}>
              Your personal music library
            </p>
          </div>

          {/* Nav links */}
          <nav style={{ display: 'flex', gap: '2rem' }}>
            {['/', '/library', '/playlists', '/artists'].map((path, i) => (
              <NavLink
                key={path}
                to={path}
                style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 300, textDecoration: 'none', transition: 'color 0.2s ease' }}
                onMouseOver={e => e.currentTarget.style.color = 'white'}
                onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                {['Home', 'Library', 'Playlists', 'Artists'][i]}
              </NavLink>
            ))}
          </nav>

          {/* Copyright */}
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 300 }}>
            © {new Date().getFullYear()} OffBeat
          </p>

        </div>
      </div>
    </footer>
  );
}