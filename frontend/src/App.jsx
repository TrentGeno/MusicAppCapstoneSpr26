import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './components/Homepage';
import Playlist from './Playlists';
import PlaylistsPage from './components/PlaylistsPage';
import Soundbar from './components/Soundbar';
import SignInModal from './components/modals/SignInModal';
import UploadModal from './components/modals/UploadModal';
import PlaylistModal from './components/modals/PlaylistModal';
import CustomizeModal from './components/modals/CustomizeModal';
import Footer from './components/Footer';
import RecentlyAddedPage from './components/RecentlyAddedPage';
import LibraryPage from './components/LibraryPage';

export default function App() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [library, setLibrary] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [playlistData, setPlaylistData] = useState({ name: '', description: '' });
  const [isDragging, setIsDragging] = useState(false);
  const [globalRepeatMode, setGlobalRepeatMode] = useState('none');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSongId, setCurrentSongId] = useState(null);
  const playlistQueueRef = useRef([]);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('appTheme');
    return saved ? JSON.parse(saved) : {
      main: '#b967ff',
      accent1: '#ff6ec7',
      accent2: '#05d9ff',
      isDarkMode: true,
    };
  });
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const hexToRgb = (hex) => {
    const cleaned = hex.replace('#', '').length === 3
      ? hex.replace('#', '').split('').map((c) => c + c).join('')
      : hex.replace('#', '');
    const num = parseInt(cleaned, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255].join(',');
  };

  const themeStyles = {
    '--main-color': theme.main,
    '--accent-color': theme.accent1,
    '--accent-color-secondary': theme.accent2,
    '--accent-purple': theme.main,
    '--accent-pink': theme.accent1,
    '--accent-blue': theme.accent2,
    '--accent-purple-rgb': hexToRgb(theme.main),
    '--accent-pink-rgb': hexToRgb(theme.accent1),
    '--accent-blue-rgb': hexToRgb(theme.accent2),
    '--glow': `rgba(${hexToRgb(theme.main)}, 0.3)`,
    '--background': theme.isDarkMode ? '#0d0d14' : '#ffffff',
    '--background-secondary': theme.isDarkMode ? '#1a1a1a' : '#f5f5f5',
    '--text-primary': theme.isDarkMode ? '#ffffff' : '#000000',
    '--text-secondary': theme.isDarkMode ? '#b3b3b3' : '#666666',
    '--border': theme.isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    '--seek-bg': theme.isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
    '--hover-bg': theme.isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    '--btn-border': theme.isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
    '--btn-border-hover': theme.isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
    '--progress-bg': theme.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    '--card-border': theme.isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    '--h1-gradient': theme.isDarkMode ? `linear-gradient(135deg, #ffffff, ${theme.main})` : `linear-gradient(135deg, #000000, ${theme.main})`,
    '--bg-alpha': theme.isDarkMode ? '0.08' : '0',
    '--bg-gradient': theme.isDarkMode ? `radial-gradient(circle at 20% 50%, rgba(${hexToRgb(theme.main)}, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(${hexToRgb(theme.accent1)}, 0.06) 0%, transparent 50%), radial-gradient(circle at 40% 20%, rgba(${hexToRgb(theme.accent2)}, 0.05) 0%, transparent 50%)` : 'transparent',
    '--vinyl-color-1': theme.isDarkMode ? '#1a1a2e' : '#d0d0d0',
    '--vinyl-color-2': theme.isDarkMode ? '#15151f' : '#c0c0c0',
  };

  const handleThemeSave = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('appTheme', JSON.stringify(newTheme));
  };

  const fetchPlaylists = useCallback(() => {
    fetch('http://localhost:5000/playlists')
      .then(res => res.json())
      .then(data => {
        setPlaylists(data.map(p => ({
          id: p.playlist_id,
          name: p.name,
          description: p.description,
          songCount: p.track_count,
          coverUrls: p.cover_urls || []
        })));
      })
      .catch(err => console.error('Failed to load playlists:', err));
  }, []);

  const fetchLibrary = useCallback(() => {
    const gradients = [
      `linear-gradient(135deg, ${theme.main}, ${theme.accent1})`,
      `linear-gradient(135deg, ${theme.accent1}, ${theme.accent2})`,
      `linear-gradient(135deg, ${theme.accent2}, ${theme.main})`,
      `linear-gradient(135deg, ${theme.main}, ${theme.accent2})`,
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
            cover: track.cover_art_url,
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

              const queue = playlistQueueRef.current;
              if (queue.length > 0) {
                const currentQueueIndex = queue.indexOf(song.id);
                const nextId = queue[currentQueueIndex + 1];
                if (nextId) {
                  const nextSong = prev.find(s => s.id === nextId);
                  if (nextSong) {
                    setTimeout(() => {
                      nextSong.audio.currentTime = 0;
                      nextSong.audio.play();
                      setCurrentSongId(nextId);
                      setLibrary(l => l.map(s => ({ ...s, isPlaying: s.id === nextId })));
                    }, 100);
                  }
                }
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
  }, [globalRepeatMode, theme]);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

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
    uploadedFiles.forEach(file => formData.append('file', file));
    const initialProgress = uploadedFiles.reduce((acc, file) => { acc[getFileKey(file)] = 0; return acc; }, {});
    setUploadProgress(initialProgress);
    setIsUploading(true);
    try {
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'http://localhost:5000/upload');
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(key => { next[key] = percent; });
            return next;
          });
        };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed with status ${xhr.status}`));
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.onabort = () => reject(new Error('Upload aborted'));
        xhr.send(formData);
      });
      fetchLibrary();
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
      const response = await fetch('http://localhost:5000/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playlistData)
      });
      const data = await response.json();
      const newPlaylist = { id: data.playlist_id, name: data.name, description: playlistData.description || 'No description', songCount: 0 };
      setPlaylists(prev => [...prev, newPlaylist]);
      setPlaylistData({ name: '', description: '' });
      closeModal();
    } catch (error) {
      console.error('Playlist creation error:', error);
      alert('Failed to create playlist. Please try again.');
    }
  };
  };

  const handleCloseSoundbar = () => {
    const song = library.find(s => s.id === currentSongId);
    if (song) song.audio.pause();
    setCurrentSongId(null);
    setLibrary(prev => prev.map(s => ({ ...s, isPlaying: false })));
  };

const fetchPlaylists = useCallback(() => {
  fetch('http://localhost:5000/playlists')
    .then(res => res.json())
    .then(data => {
      setPlaylists(data.map(p => ({
        id: p.playlist_id,
        name: p.name,
        description: p.description,
        songCount: p.track_count,
        coverUrls: p.cover_urls || []
      })));
    })
    .catch(err => console.error('Failed to load playlists:', err));
}, []);
  

const handleCreatePlaylist = async (e) => {
  e.preventDefault();
  try {
    const response = await fetch('http://localhost:5000/playlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playlistData)
    });
    await response.json();
    await fetchPlaylists(); // 👈 fetch fresh from backend instead of building locally
    setPlaylistData({ name: '', description: '' });
    closeModal();
  } catch (error) {
    console.error('Playlist creation error:', error);
    alert('Failed to create playlist. Please try again.');
  }
};

useEffect(() => {
  fetchLibrary();
  fetchPlaylists();
}, [fetchLibrary, fetchPlaylists]);


  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: `hsl(0, 0%, ${theme.isDarkMode ? '5%' : '100%'})`, color: theme.isDarkMode ? '#ffffff' : '#000000', ...themeStyles }}>
      <Navbar user={user} onSignIn={() => openModal('signin')} onSignOut={handleSignOut} onCustomize={() => openModal('customize')} />

      <main style={{ flex: 1, paddingBottom: currentSongId ? '72px' : '0' }}>
      <Routes>
      <Route path="/" element={<HomePage openModal={openModal} library={library} togglePlay={togglePlay} playlists={playlists} fetchLibrary={fetchLibrary} fetchPlaylists={fetchPlaylists} />} />
      <Route path="/playlists" element={<PlaylistsPage playlists={playlists} openModal={openModal} />} />
      <Route path="/artists" element={<div style={{padding: '2rem'}}>Artists coming soon</div>} />
      <Route path="/playlists/:id" element={<Playlist togglePlay={togglePlay} library={library} playlistQueueRef={playlistQueueRef} fetchPlaylists={fetchPlaylists} />} />
      <Route path="/recently-added" element={<RecentlyAddedPage library={library} togglePlay={togglePlay} playlists={playlists} openModal={openModal} fetchLibrary={fetchLibrary} fetchPlaylists={fetchPlaylists} />} />
      <Route path="/library" element={<LibraryPage library={library} playlists={playlists} togglePlay={togglePlay} currentSongId={currentSongId} fetchLibrary={fetchLibrary} fetchPlaylists={fetchPlaylists}/>} />
      </Routes>
        <Routes>
          <Route path="/" element={<HomePage openModal={openModal} library={library} togglePlay={togglePlay} playlists={playlists} fetchLibrary={fetchLibrary} fetchPlaylists={fetchPlaylists} />} />
          <Route path="/playlists" element={<PlaylistsPage playlists={playlists} openModal={openModal} />} />
          <Route path="/artists" element={<div style={{padding: '2rem'}}>Artists coming soon</div>} />
          <Route path="/playlists/:id" element={<Playlist togglePlay={togglePlay} library={library} playlistQueueRef={playlistQueueRef} fetchPlaylists={fetchPlaylists} />} />
          <Route path="/recently-added" element={<RecentlyAddedPage library={library} togglePlay={togglePlay} playlists={playlists} openModal={openModal} fetchLibrary={fetchLibrary} fetchPlaylists={fetchPlaylists} />} />
          <Route path="/library" element={<LibraryPage library={library} playlists={playlists} togglePlay={togglePlay} currentSongId={currentSongId} fetchLibrary={fetchLibrary} />} />
        </Routes>
      </main>

      {activeModal === "playlist" && (
        <PlaylistModal playlistData={playlistData} setPlaylistData={setPlaylistData} handleCreatePlaylist={handleCreatePlaylist} closeModal={closeModal} />
      )}
      {activeModal === "signin" && (
        <SignInModal
          handleGoogleSignIn={(response) => {
            const payload = JSON.parse(atob(response.credential.split(".")[1]));
            const userData = { email: payload.email, name: payload.name, photoURL: payload.picture };
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            closeModal();
          }}
          closeModal={closeModal}
        />
      )}
      {activeModal === 'customize' && (
        <CustomizeModal theme={theme} onSave={handleThemeSave} closeModal={closeModal} />
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
      <Footer />
    </div>
  );