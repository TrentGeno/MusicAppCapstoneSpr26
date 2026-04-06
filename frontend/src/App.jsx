import React, { useState, useEffect, useCallback, useRef } from 'react';import './App.css';
import JsMediaTags from 'jsmediatags/dist/jsmediatags.min.js';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './components/Homepage';
import Playlist from './Playlists';
import PlaylistsPage from './components/PlaylistsPage';
import Soundbar from './components/Soundbar';
import SignInModal from './components/modals/SignInModal';
import UploadModal from './components/modals/UploadModal';
import PlaylistModal from './components/modals/PlaylistModal';
import Footer from './components/Footer';
import RecentlyAddedPage from './components/RecentlyAddedPage';
import LibraryPage from './components/LibraryPage';


export default function App() {
  // State management
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
  const [user, setUser] = useState(() => {
  const saved = localStorage.getItem('user');
  return saved ? JSON.parse(saved) : null;
});
  
    // Fetch all tracks from backend and wire up Audio objects
  const fetchLibrary = useCallback(() => {
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
            cover: track.cover_art_url,  // Use cover art from backend
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

                      // Playlist queue auto-advance
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
                              setLibrary(l => l.map(s => ({
                                ...s,
                                isPlaying: s.id === nextId
                              })));
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
  }, [globalRepeatMode]);

useEffect(() => {
  fetchPlaylists();
}, []);

useEffect(() => {
  fetchLibrary();
}, []);

  // Modal functions
  const openModal = (modalName) => setActiveModal(modalName);
  const closeModal = () => setActiveModal(null);



  const handleSignOut = () => {
    setUser(null);
    setDropdownOpen(false);
    localStorage.removeItem('user');
    if (window.google) {
      window.google.accounts.id.disableAutoSelect();
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
      library.forEach(song => {
        song.audio.muted = true;
      });
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

  if (song && song.audio.currentTime > 10) {
    // More than 10 seconds in — restart the current song
    song.audio.currentTime = 0;
  } else {
    // Within first 10 seconds — go to previous song
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
    library.forEach(song => {
      song.audio.volume = value;
    });
  };

  // File handling
  const getFileKey = (file) => `${file.name}-${file.size}-${file.lastModified}`;

  const handleFiles = (files) => {
    const fileArray = Array.from(files).filter(file => file.type.startsWith('audio/'));
    setUploadedFiles(prev => {
      const existingKeys = new Set(prev.map(getFileKey));
      const newFiles = fileArray.filter(file => !existingKeys.has(getFileKey(file)));
      if (newFiles.length < fileArray.length) {
        // Duplicate items are ignored
        console.warn('Skipped duplicate upload candidates');
      }
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

    const newPlaylist = {
      id: data.playlist_id,  // ← use the real ID from the backend
      name: data.name,
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
  
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      <Navbar user={user} onSignIn={() => openModal('signin')} onSignOut={handleSignOut}/>

      <main style={{ flex: 1 }}>
      <Routes>
      <Route path="/" element={<HomePage openModal={openModal} library={library} togglePlay={togglePlay} playlists={playlists} fetchLibrary={fetchLibrary} fetchPlaylists={fetchPlaylists} />} />
      <Route path="/playlists" element={<PlaylistsPage playlists={playlists} openModal={openModal} />} />
      <Route path="/artists" element={<div style={{padding: '2rem'}}>Artists coming soon</div>} />
      <Route path="/playlists/:id" element={<Playlist togglePlay={togglePlay} library={library} playlistQueueRef={playlistQueueRef} />} />
      <Route path="/recently-added" element={<RecentlyAddedPage library={library} togglePlay={togglePlay} playlists={playlists} openModal={openModal} fetchLibrary={fetchLibrary} fetchPlaylists={fetchPlaylists} />} />
      <Route path="/LibraryPage" element={<LibraryPage library={library} playlists={playlists} togglePlay={togglePlay} currentSongId={currentSongId}  fetchLibrary={fetchLibrary}/>}/>
      </Routes>
      </main>
     {activeModal === "playlist" && (
      <PlaylistModal
      playlistData={playlistData}
      setPlaylistData={setPlaylistData}
      handleCreatePlaylist={handleCreatePlaylist}
      closeModal={closeModal}
      />)}

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
    />)}

    {/* Soundbar - only visible when there's a current song */}
    {currentSongId && (
      <Soundbar
        toggleMute={toggleMute}
        isMuted={isMuted}
        volume={volume}
        changeVolume={changeVolume}
        replaySong={replaySong}
        handleSoundbarPlay={handleSoundbarPlay}
        skipSong={skipSong}
        library={library}
        currentSongId={currentSongId}
        seek={seek}
      />
    )}
    <Footer />
    </div>
  );
}