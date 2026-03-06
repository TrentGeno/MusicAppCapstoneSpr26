import React, { useState } from 'react';
import './App.css';
import JsMediaTags from 'jsmediatags/dist/jsmediatags.min.js';

export default function OffBeat() {
  // State management
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [library, setLibrary] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [playlistData, setPlaylistData] = useState({ name: '', description: '' });
  const [isDragging, setIsDragging] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  

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

  // Volume control
    const toggleMute = () => {
      if (isMuted) {
        const unmuteVolume = Math.min(volume, 0.75);
        setVolume(unmuteVolume);
        setIsMuted(false);
        library.forEach(song => {
          song.audio.muted = false;
          song.audio.volume = unmuteVolume;
        });
      } else {
        setIsMuted(true);
        library.forEach(song => { song.audio.muted = true; });
      }
    };





    const changeVolume = (value) => {
      setVolume(value);
      setIsMuted(value === 0);
      library.forEach(song => { song.audio.volume = value; });
    };

  // File handling
  const handleFiles = (files) => {
    const fileArray = Array.from(files).filter(file => file.type.startsWith('audio/'));
    setUploadedFiles(fileArray);
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
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

  // Add songs to library and prepare audio elements for playback
  const addSongsToLibrary = (files) => {
    const gradients = [
      'linear-gradient(135deg, #a855f7, #ec4899)',
      'linear-gradient(135deg, #ff6ec7, #ff9a56)',
      'linear-gradient(135deg, #05d9ff, #7b68ee)',
      'linear-gradient(135deg, #ffd700, #ff6347)',
    ];

    const newSongs = files.map(file => {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);

      const song = {
        id: Date.now() + Math.random(),
        name: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Unknown Artist',
        gradient: gradients[Math.floor(Math.random() * gradients.length)],
        isPlaying: false,
        url,
        audio,
        duration: '--:--',
        progress: 0,
        cover: null,
      };

      // populate duration once metadata is loaded
      audio.addEventListener('loadedmetadata', () => {
        const minutes = Math.floor(audio.duration / 60);
        const seconds = Math.floor(audio.duration % 60)
          .toString()
          .padStart(2, '0');
        setLibrary(prev =>
          prev.map(s =>
            s.id === song.id ? { ...s, duration: `${minutes}:${seconds}` } : s
          )
        );
      });
      
      // attempt to read metadata (cover art + artist) from file
      JsMediaTags.read(file, {
        onSuccess: (tag) => {
          // update cover art if available
          const picture = tag.tags.picture;
          if (picture) {
            let base64String = '';
            const byteArray = picture.data;
            for (let i = 0; i < byteArray.length; i++) {
              base64String += String.fromCharCode(byteArray[i]);
            }
            const imageUrl = `data:${picture.format};base64,${btoa(base64String)}`;

            setLibrary(prev =>
              prev.map(s =>
                s.id === song.id ? { ...s, cover: imageUrl } : s
              )
            );
          }

          // update artist if metadata contains it
          const artistTag = tag.tags.artist;
          if (artistTag) {
            setLibrary(prev =>
              prev.map(s =>
                s.id === song.id ? { ...s, artist: artistTag } : s
              )
            );
          }
        },
        onError: (error) => {
          console.warn('jsmediatags error', error);
        }
      });

      audio.addEventListener('ended', () => {
        setLibrary(prev =>
          prev.map(s =>
            s.id === song.id ? { ...s, isPlaying: false, progress: 0 } : s
          )
        );
      });

      // update progress as the track plays
      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          const pct = (audio.currentTime / audio.duration) * 100;
          setLibrary(prev =>
            prev.map(s =>
              s.id === song.id ? { ...s, progress: pct } : s
            )
          );
        }
      });

      return song;
    });

    setLibrary(prev => [...prev, ...newSongs]);
  };

  // Toggle play/pause and ensure only one track plays at a time
  const togglePlay = (songId) => {
    setLibrary(prev =>
      prev.map(song => {
        if (song.id === songId) {
          if (song.isPlaying) {
            song.audio.pause();
          } else {
            song.audio.play();
          }
          return { ...song, isPlaying: !song.isPlaying };
        }
        // pause any other track that might be playing
        if (song.isPlaying) {
          song.audio.pause();
        }
        return { ...song, isPlaying: false };
      })
    );
  };

  // seek within a track when progress bar clicked
  const seek = (songId, percent) => {
    setLibrary(prev =>
      prev.map(song => {
        if (song.id === songId && song.audio.duration) {
          song.audio.currentTime = (percent / 100) * song.audio.duration;
          return { ...song, progress: percent };
        }
        return song;
      })
    );
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


    



    const handleUpload = async () => {
      if (uploadedFiles.length === 0) return;

      // send files to backend for storage
      const formData = new FormData();
      uploadedFiles.forEach(file => {
        formData.append('file', file); // key matches Flask endpoint
      });

      try {
        const response = await fetch('http://localhost:5000/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        // we could use data.filename if backend returns it, but we
        // still generate objectURLs for immediate playback

        addSongsToLibrary(uploadedFiles);
        setUploadedFiles([]);
        closeModal();
        alert('Upload successful!');
      } catch (error) {
        console.error('Upload error:', error);
        alert('Server error: Make sure your Flask/Express backend is running on port 5000');
      }
    };
    //old handle upload function for reference
    // const handleUpload = async () => {
    //   if (uploadedFiles.length === 0) return;

    //   const formData = new FormData();
    //   uploadedFiles.forEach(file => {
    //     formData.append('file', file); // file has to match backends expected key
    //   });

    //   try {
    //     const response = await fetch('http://localhost:5000/upload', {
    //       method: 'POST',
    //       body: formData,
          
    //     });

    //     if (!response.ok) throw new Error('Upload failed');

    //     const data = await response.json();
    
    //     // Add to local library state so the UI updates immediately
    //     addSongsToLibrary(uploadedFiles);
    //     setUploadedFiles([]);
    //     closeModal();
    //     alert('Upload successful!');
    //   } catch (error) {
    //     console.error('Upload error:', error);
    //     alert('Server error: Make sure your Flask/Express backend is running on port 5000');
    //   }
    // };

  
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
                  {song.cover ? (
                    <img src={song.cover} alt="cover" className="cover-img" />
                  ) : (
                    <span className="cover-initial">
                      {song.name.charAt(0).toUpperCase()}
                    </span>
                  )}
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
                  <span className="duration">{song.duration}</span>
                  <div
                    className="progress-bar"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const pct = (x / rect.width) * 100;
                      seek(song.id, pct);
                    }}
                  >
                    <div
                      className="progress-filled"
                      style={{ width: `${song.progress}%` }}
                    />
                  </div>
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
      
      <div className="soundbar">
        <button className="mute-btn" onClick={toggleMute}>
          {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={(e) => changeVolume(parseFloat(e.target.value))}
          className="volume-slider"
        />
        <span className="volume-label">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
        </div>

      {/* Upload Modal */}
      {activeModal === 'upload' && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Upload Music</h2>
              <button className="close-modal" onClick={closeModal}>×</button>
            </div>
              
            <label
              className={`upload-area ${isDragging ? 'dragover' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                style={{ opacity: 0.5 }}
                accept="audio/*"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
              />
              <div className="upload-icon">📁</div>
              <h3 className="upload-title">Drop your music files here</h3>
              <p className="upload-subtext">or click to browse</p>
              <p className="upload-formats">Supported formats: MP3, WAV, FLAC, M4A</p>
              </label>

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