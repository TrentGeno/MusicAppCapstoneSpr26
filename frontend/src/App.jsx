import React, { useState, useEffect } from 'react';
import './App.css';
import JsMediaTags from 'jsmediatags/dist/jsmediatags.min.js';
import Soundbar from "./components/Soundbar";
import PlaylistModal from "./components/modals/PlaylistModal";
import SignInModal from "./components/modals/SignInModal";
import UploadModal from "./components/modals/UploadModal";

export default function App(){
  // State management
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [library, setLibrary] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [playlistData, setPlaylistData] = useState({ name: '', description: '' });
  const [isDragging, setIsDragging] = useState(false);
  const [globalRepeatMode, setGlobalRepeatMode] = useState('none');
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSongId, setCurrentSongId] = useState(null);
  
    // Fetch all tracks from backend and wire up Audio objects
  const fetchLibrary = () => {
    const gradients = [
      'linear-gradient(135deg, #a855f7, #ec4899)',
      'linear-gradient(135deg, #ff6ec7, #ff9a56)',
      'linear-gradient(135deg, #05d9ff, #7b68ee)',
      'linear-gradient(135deg, #ffd700, #ff6347)',
    ];

    fetch('http://localhost:5000/tracks')
      .then(res => res.json())
      .then(tracks => {
        const loadedSongs = tracks.map(track => {
          const url = `http://localhost:5000/music/${track.filename}`;
          const audio = new Audio(url);

          const song = {
            id: track.track_id,
            name: track.title,
            artist: track.artist || 'Unknown Artist',
            gradient: gradients[Math.floor(Math.random() * gradients.length)],
            isPlaying: false,
            url,
            audio,
            duration: '--:--',
            currentTime: '0:00',
            progress: 0,
            cover: null,
            repeatMode: 'none',
          };

          audio.addEventListener('loadedmetadata', () => {
            const minutes = Math.floor(audio.duration / 60);
            const seconds = Math.floor(audio.duration % 60).toString().padStart(2, '0');
            setLibrary(prev =>
              prev.map(s => s.id === song.id ? { ...s, duration: `${minutes}:${seconds}` } : s)
            );
          });

          audio.addEventListener('timeupdate', () => {
            if (audio.duration) {
              const pct = (audio.currentTime / audio.duration) * 100;
              const mins = Math.floor(audio.currentTime / 60);
              const secs = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
              setLibrary(prev =>
                prev.map(s =>
                  s.id === song.id ? { ...s, progress: pct, currentTime: `${mins}:${secs}` } : s
                )
              );
            }
          });

          audio.addEventListener('ended', () => {
            setLibrary(prev => {
              const index = prev.findIndex(s => s.id === song.id);
              if (index === -1) return prev;
              const current = prev[index];
              const mode = globalRepeatMode !== 'none' ? globalRepeatMode : current.repeatMode;

              if (mode === 'one') {
                current.audio.currentTime = 0;
                current.audio.play();
                const copy = [...prev];
                copy[index] = { ...current, isPlaying: true, progress: 0, currentTime: '0:00' };
                return copy;
              }

              if (mode === 'all') {
                const nextIndex = (index + 1) % prev.length;
                return prev.map((s, i) => {
                  if (i === index) return { ...s, isPlaying: false, progress: 0, currentTime: '0:00' };
                  if (i === nextIndex) {
                    s.audio.currentTime = 0;
                    s.audio.play();
                    return { ...s, isPlaying: true };
                  }
                  return { ...s, isPlaying: false };
                });
              }

              return prev.map(s =>
                s.id === song.id ? { ...s, isPlaying: false, progress: 0, currentTime: '0:00' } : s
              );
            });
          });

          return song;
        });

        setLibrary(loadedSongs);
      })
      .catch(err => console.error('Failed to load tracks:', err));
  };

  useEffect(() => { fetchLibrary(); }, []);

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
    const skipSong = () => {
      const index = library.findIndex(s => s.id === currentSongId);
      const nextIndex = (index + 1) % library.length;
      if (library[nextIndex]) togglePlay(library[nextIndex].id);
    };

    const replaySong = () => {
      const song = library.find(s => s.id === currentSongId);
      if (song) {
        song.audio.currentTime = 0;
        if (!song.isPlaying) togglePlay(song.id);
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
        currentTime: '0:00',
        progress: 0,
        cover: null,
        repeatMode: 'none',
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
        setLibrary(prev => {
          const index = prev.findIndex(s => s.id === song.id);
          if (index === -1) return prev;

          const current = prev[index];
          const mode = globalRepeatMode !== 'none' ? globalRepeatMode : current.repeatMode;

          if (mode === 'one') {
            // restart same track
            current.audio.currentTime = 0;
            current.audio.play();
            const copy = [...prev];
            copy[index] = { ...current, isPlaying: true, progress: 0, currentTime: '0:00' };
            return copy;
          }

          if (mode === 'all') {
            // move to next track (wrap around)
            const nextIndex = (index + 1) % prev.length;
            const copy = prev.map((s, i) => {
              if (i === index) {
                return { ...s, isPlaying: false, progress: 0, currentTime: '0:00' };
              }
              if (i === nextIndex) {
                s.audio.currentTime = 0;
                s.audio.play();
                return { ...s, isPlaying: true, progress: 0, currentTime: '0:00', repeatMode: mode };
              }
              return { ...s, isPlaying: false, repeatMode: 'none' };
            });
            return copy;
          }

          // no repeat
          return prev.map(s =>
            s.id === song.id
              ? { ...s, isPlaying: false, progress: 0, currentTime: '0:00' }
              : s
          );
        });
      });

      // update progress and elapsed time as the track plays
      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          const pct = (audio.currentTime / audio.duration) * 100;
          const mins = Math.floor(audio.currentTime / 60);
          const secs = Math.floor(audio.currentTime % 60)
            .toString()
            .padStart(2, '0');
          setLibrary(prev =>
            prev.map(s =>
              s.id === song.id
                ? { ...s, progress: pct, currentTime: `${mins}:${secs}` }
                : s
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
    setCurrentSongId(songId);
    setLibrary(prev => prev.map(song => {
      if (song.id === songId) {
        if (song.isPlaying) {
          song.audio.pause();
        } else {
          song.audio.play();
        }
        return { ...song, isPlaying: !song.isPlaying };
      }
      if (song.isPlaying) song.audio.pause();
      return { ...song, isPlaying: false };
    }));
  };

  // seek within a track when progress bar clicked
  const seek = (songId, percent) => {
    setLibrary(prev =>
      prev.map(song => {
        if (song.id === songId && song.audio.duration) {
          song.audio.currentTime = (percent / 100) * song.audio.duration;
          const mins = Math.floor(song.audio.currentTime / 60);
          const secs = Math.floor(song.audio.currentTime % 60)
            .toString()
            .padStart(2, '0');
          return { ...song, progress: percent, currentTime: `${mins}:${secs}` };
        }
        return song;
      })
    );
  };

  // Toggle repeat mode: none -> all -> one -> none
  const toggleRepeat = (songId) => {
    setLibrary(prev =>
      prev.map(song => {
        if (song.id === songId) {
          let nextMode = 'none';
          if (song.repeatMode === 'none') nextMode = 'all';
          else if (song.repeatMode === 'all') nextMode = 'one';
          setGlobalRepeatMode(nextMode);
          return { ...song, repeatMode: nextMode };
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

  const formData = new FormData();
  uploadedFiles.forEach(file => formData.append('file', file));

  try {
    const response = await fetch('http://localhost:5000/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Upload failed');

    fetchLibrary();
    setUploadedFiles([]);
    closeModal();
  } catch (error) {
    console.error('Upload error:', error);
    alert('Server error: Make sure your Flask backend is running on port 5000');
  }
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

                  {song.isPlaying && (
                    <>
                      <div className="player-controls">
                        <div className="time-group">
                          <span className="elapsed">{song.currentTime}</span>
                          <span className="time-separator">/</span>
                          <span className="duration">{song.duration}</span>
                        </div>
                        <button 
                          className={`repeat-btn repeat-${song.repeatMode}`}
                          onClick={(e) => { e.stopPropagation(); toggleRepeat(song.id); }}
                          title={`Repeat: ${song.repeatMode}`}
                        >
                          ↻
                          {song.repeatMode === 'one' && <span className="repeat-badge">1</span>}
                        </button>
                      </div>
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
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

        {/* Modals */}
     {activeModal === "playlist" && (
    <PlaylistModal
    playlistData={playlistData}
    setPlaylistData={setPlaylistData}
    handleCreatePlaylist={handleCreatePlaylist}
    closeModal={closeModal}
    />)}

      {activeModal === "signin" && (
  <SignInModal
    signInData={signInData}
    setSignInData={setSignInData}
    handleSignIn={handleSignIn}
    closeModal={closeModal}
    />)}

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
  />)}

    </div>
  );
}