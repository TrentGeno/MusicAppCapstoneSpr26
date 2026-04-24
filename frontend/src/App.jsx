import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

export default function OffBeat() {
  // State management
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [library, setLibrary] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [playlistData, setPlaylistData] = useState({ name: '', description: '' });
  const [isDragging, setIsDragging] = useState(false);

  // Modal functions
  const openModal = (modalName) => setActiveModal(modalName);
  const closeModal = () => setActiveModal(null);

  const handleSignOut = () => {
    setUser(null);
    setDropdownOpen(false);
    localStorage.removeItem('user');
    if (window.google) window.google.accounts.id.disableAutoSelect();
  };

  const toggleMute = () => {
    if (isMuted) {
      const unmuteVolume = Math.min(volume, 0.75);
      setVolume(unmuteVolume);
      setIsMuted(false);
      library.forEach(song => { song.audio.muted = false; song.audio.volume = unmuteVolume; });
    } else {
      setIsMuted(true);
      library.forEach(song => { song.audio.muted = true; });
    }
  };

  const skipSong = () => {
    const index = library.findIndex(s => s.id === currentSongId);
    const nextIndex = (index + 1) % library.length;
    if (library[nextIndex]) togglePlay(library[nextIndex].id);
  };

  const replaySong = () => {
    const song = library.find(s => s.id === currentSongId);
    const index = library.findIndex(s => s.id === currentSongId);
    if (song && song.audio.currentTime > 2) {
      song.audio.currentTime = 0;
    } else {
      const prevIndex = (index - 1 + library.length) % library.length;
      if (library[prevIndex]) togglePlay(library[prevIndex].id);
    }
  };

  const handleSoundbarPlay = () => {
    if (currentSongId) {
      togglePlay(currentSongId);
    } else if (library.length > 0) {
      togglePlay(library[0].id);
    }
  };

  const changeVolume = (value) => {
    setVolume(value);
    setIsMuted(value === 0);
    library.forEach(song => { song.audio.volume = value; });
  };

  const getFileKey = (file) => `${file.name}-${file.size}-${file.lastModified}`;

  const handleFiles = (files) => {
    const fileArray = Array.from(files).filter(file => file.type.startsWith('audio/'));
    setUploadedFiles(prev => {
      const existingKeys = new Set(prev.map(getFileKey));
      const newFiles = fileArray.filter(file => !existingKeys.has(getFileKey(file)));
      return [...prev, ...newFiles];
    });
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => {
      const next = prev.filter((_, i) => i !== index);
      setUploadProgress(prevProg => {
        const key = getFileKey(prev[index]);
        const nextProg = { ...prevProg };
        delete nextProg[key];
        return nextProg;
      });
      return next;
    });
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); };

  const handleUpload = async () => {
    if (uploadedFiles.length === 0 || isUploading) return;
    const formData = new FormData();
    uploadedFiles.forEach(file => {
      formData.append('music_files', file);
    });

    try {
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      console.log('Upload response:', data);
      
      addSongsToLibrary(uploadedFiles);
      setUploadedFiles([]);
      closeModal();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Server error: Make sure your Flask backend is running on port 5000');
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  const togglePlay = (songId) => {
    setCurrentSongId(songId);
    setLibrary(prev => prev.map(song => {
      if (song.id === songId) {
        if (song.isPlaying) { song.audio.pause(); } else { song.audio.play(); }
        return { ...song, isPlaying: !song.isPlaying };
      }
      if (song.isPlaying) song.audio.pause();
      return { ...song, isPlaying: false };
    }));
  };

  const seek = (songId, percent) => {
    setLibrary(prev =>
      prev.map(song => {
        if (song.id === songId && song.audio.duration) {
          song.audio.currentTime = (percent / 100) * song.audio.duration;
          const mins = Math.floor(song.audio.currentTime / 60);
          const secs = Math.floor(song.audio.currentTime % 60).toString().padStart(2, '0');
          return { ...song, progress: percent, currentTime: `${mins}:${secs}` };
        }
        return song;
      })
    );
  };

  const toggleRepeat = () => {
    setGlobalRepeatMode(prev => {
      switch (prev) {
        case 'none': return 'all';
        case 'all': return 'one';
        case 'one': default: return 'none';
      }
    });
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://127.0.0.1:5000/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playlistData)
      });
      await response.json();
      await fetchPlaylists();
      setPlaylistData({ name: '', description: '' });
      closeModal();
    } catch (error) {
      console.error('Playlist creation error:', error);
      alert('Failed to create playlist. Please try again.');
    }
  };

  const handleCloseSoundbar = () => {
    const song = library.find(s => s.id === currentSongId);
    if (song) song.audio.pause();
    setCurrentSongId(null);
    setLibrary(prev => prev.map(s => ({ ...s, isPlaying: false })));
  };

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="logo">OffBeat</div>
        <nav className="nav">
          <a href="#library" className="nav-link">Library</a>
          <a href="#playlists" className="nav-link">Playlists</a>
          <a href="#artists" className="nav-link">Artists</a>
        </nav>
        <button className="btn btn-signin" onClick={() => openModal('signin')}>
          Sign In
        </button>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Your Personal Music Library</h1>
            <p className="hero-paragraph">
              Upload your downloaded music collection and organize it beautifully. 
              Create playlists, manage your library, and enjoy your favorite tracks offline.
            </p>
            <div className="cta-buttons">
              <button className="btn btn-primary" onClick={() => openModal('upload')}>
                Upload Music
              </button>
              <button className="btn btn-secondary" onClick={() => openModal('playlist')}>
                Create Playlist
              </button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="vinyl-container">
              <div className="vinyl"></div>
              <div className="album-art">🎵</div>
            </div>
          </div>
        </div>
      </section>

      {/* Library Section */}
      <section className="section">
        <div className="section-header">
          <h2>Your Library</h2>
          <a href="#" className="view-all" onClick={(e) => { e.preventDefault(); openModal('upload'); }}>
            Add Songs →
          </a>
        </div>
        <div className="music-grid">
          {library.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <h3>Your library is empty</h3>
              <p className="empty-text">Upload your music files to get started</p>
              <button className="btn btn-primary" onClick={() => openModal('upload')}>
                Upload Now
              </button>
            </div>
          ) : (
            library.map(song => (
              <div key={song.id} className="music-card">
                <div className="card-cover" style={{ background: song.gradient }}>
                  🎵
                </div>
                <div className="card-info">
                  <h3 className="card-title">{song.name}</h3>
                  <p className="card-artist">{song.artist}</p>
                </div>
                <div className="card-meta">
                  <button 
                    className="play-btn" 
                    onClick={(e) => { e.stopPropagation(); togglePlay(song.id); }}
                  >
                    {song.isPlaying ? '⏸' : '▶'}
                  </button>
                  <span className="duration">--:--</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Playlists Section */}
      <section className="section">
        <div className="section-header">
          <h2>Your Playlists</h2>
          <a href="#" className="view-all" onClick={(e) => { e.preventDefault(); openModal('playlist'); }}>
            New Playlist →
          </a>
        </div>
        <div className="music-grid">
          {playlists.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎧</div>
              <h3>No playlists yet</h3>
              <p className="empty-text">Create your first playlist to organize your music</p>
              <button className="btn btn-primary" onClick={() => openModal('playlist')}>
                Create Playlist
              </button>
            </div>
          ) : (
            playlists.map(playlist => (
              <div key={playlist.id} className="music-card">
                <div className="card-cover" style={{ background: 'linear-gradient(135deg, #7b68ee, #05d9ff)' }}>
                  🎧
                </div>
                <div className="card-info">
                  <h3 className="card-title">{playlist.name}</h3>
                  <p className="card-artist">{playlist.description}</p>
                </div>
                <div className="card-meta">
                  <button className="play-btn">▶</button>
                  <span className="duration">{playlist.songCount} songs</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Sign In Modal */}
      {activeModal === 'signin' && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Sign In</h2>
              <button className="close-modal" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSignIn}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={signInData.email}
                  onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={signInData.password}
                  onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full-width">
                Sign In
              </button>
              <p className="signup-text">
                Don't have an account? <a href="#" className="signup-link">Sign up</a>
              </p>
            </form>
          </div>
        </div>
      )}
      {activeModal === "upload" && (
        <UploadModal
          uploadedFiles={uploadedFiles}
          handleFiles={handleFiles}
          removeFile={removeFile}
          handleUpload={handleUpload}
          closeModal={closeModal}
          isDragging={isDragging}
          handleDragOver={handleDragOver}
          handleDragLeave={handleDragLeave}
          handleDrop={handleDrop}
          uploadProgress={uploadProgress}
          isUploading={isUploading}
        />
      )}

      {currentSongId && (
        <Soundbar
          toggleMute={toggleMute}
          isMuted={isMuted}
          volume={volume}
          changeVolume={changeVolume}
          replaySong={replaySong}
          handleSoundbarPlay={handleSoundbarPlay}
          skipSong={skipSong}
          toggleRepeat={toggleRepeat}
          library={library}
          currentSongId={currentSongId}
          globalRepeatMode={globalRepeatMode}
          seek={seek}
          onClose={handleCloseSoundbar}
        />
      )}
      <Footer currentSongId={currentSongId} />
    </div>
  );
}