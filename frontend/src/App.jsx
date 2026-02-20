import React, { useState } from 'react';
import './App.css';

export default function OffBeat() {
  // State management
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [library, setLibrary] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [playlistData, setPlaylistData] = useState({ name: '', description: '' });
  const [isDragging, setIsDragging] = useState(false);

  // Modal functions
  const openModal = (modalName) => setActiveModal(modalName);
  const closeModal = () => setActiveModal(null);

  // Sign In Handler
  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signInData)
      });
      const data = await response.json();
      console.log('Sign in response:', data);
      closeModal();
      setSignInData({ email: '', password: '' });
    } catch (error) {
      console.error('Sign in error:', error);
      alert('Sign in failed. Please check your credentials.');
    }
  };

  // File handling
  const handleFiles = (files) => {
    const fileArray = Array.from(files).filter(file => file.type.startsWith('audio/'));
    setUploadedFiles(fileArray);
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    const formData = new FormData();
    uploadedFiles.forEach(file => {
      formData.append('file', file);
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
      alert('Upload failed. Please try again.');
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // Add songs to library
  const addSongsToLibrary = (files) => {
    const gradients = [
      'linear-gradient(135deg, #a855f7, #ec4899)',
      'linear-gradient(135deg, #ff6ec7, #ff9a56)',
      'linear-gradient(135deg, #05d9ff, #7b68ee)',
      'linear-gradient(135deg, #ffd700, #ff6347)',
    ];

    const newSongs = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name.replace(/\.[^/.]+$/, ""),
      artist: 'Unknown Artist',
      gradient: gradients[Math.floor(Math.random() * gradients.length)],
      isPlaying: false
    }));

    setLibrary(prev => [...prev, ...newSongs]);
  };

  // Toggle play/pause
  const togglePlay = (songId) => {
    setLibrary(prev => prev.map(song => 
      song.id === songId ? { ...song, isPlaying: !song.isPlaying } : song
    ));
  };

  // Create playlist
  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playlistData)
      });
      const data = await response.json();
      console.log('Playlist created:', data);
      
      const newPlaylist = {
        id: Date.now(),
        name: playlistData.name,
        description: playlistData.description || 'No description',
        songCount: 0
      };
      
      setPlaylists(prev => [...prev, newPlaylist]);
      setPlaylistData({ name: '', description: '' });
      closeModal();
    } catch (error) {
      console.error('Playlist creation error:', error);
      alert('Failed to create playlist. Please try again.');
    }
  };

  // File input click handler
  const triggerFileInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.multiple = true;
    input.onchange = (e) => handleFiles(e.target.files);
    input.click();
  };

document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("fileInput");
    const audioPlayer = document.getElementById("audioPlayer");

    fileInput.addEventListener("change", async (event) => {
        try {
            const file = event.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("http://127.0.0.1:5000/upload", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (data.filename) {
                audioPlayer.src = `/music/${data.filename}`;
                await audioPlayer.play();
            }
        } catch (err) {
            console.error("Upload failed:", err);
        }
    });
});


  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="logo">OffBeat</div>
        <nav className="nav">
          <a href="#library" className="nav-link">Library</a>
          <a href="playlist.html" className="nav-link">Playlists</a>
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

      {/* Upload Modal */}
      {activeModal === 'upload' && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Upload Music</h2>
              <button className="close-modal" onClick={closeModal}>×</button>
            </div>
            <div
              className={`upload-area ${isDragging ? 'dragover' : ''}`}
              onClick={triggerFileInput}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="upload-icon">📁</div>
              <h3 className="upload-title">Drop your music files here</h3>
              <p className="upload-subtext">or click to browse</p>
              <p className="upload-formats">
                Supported formats: MP3, WAV, FLAC, M4A
              </p>
            </div>
            <div className="file-list">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="file-item">
                  <span>🎵 {file.name}</span>
                  <button className="remove-file" onClick={() => removeFile(index)}>×</button>
                </div>
              ))}
            </div>
            <button
              className="btn btn-primary btn-full-width"
              style={{ marginTop: '1rem', opacity: uploadedFiles.length === 0 ? 0.5 : 1 }}
              onClick={handleUpload}
              disabled={uploadedFiles.length === 0}
            >
              Upload Files
            </button>
          </div>
        </div>
      )}

      {/* Create Playlist Modal */}
      {activeModal === 'playlist' && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Create Playlist</h2>
              <button className="close-modal" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleCreatePlaylist}>
              <div className="form-group">
                <label>Playlist Name</label>
                <input
                  type="text"
                  placeholder="My Awesome Playlist"
                  value={playlistData.name}
                  onChange={(e) => setPlaylistData({ ...playlistData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <input
                  type="text"
                  placeholder="A collection of my favorite tracks"
                  value={playlistData.description}
                  onChange={(e) => setPlaylistData({ ...playlistData, description: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full-width">
                Create Playlist
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}