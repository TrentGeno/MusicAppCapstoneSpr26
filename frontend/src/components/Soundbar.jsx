import React from "react";

export default function Soundbar({
  toggleMute,
  isMuted,
  volume,
  changeVolume,
  replaySong,
  handleSoundbarPlay,
  skipSong,
  toggleRepeat,
  library,
  currentSongId,
  globalRepeatMode,
  seek
}) {
  const currentSong = library.find(s => s.id === currentSongId);
  const repeatMode = currentSong?.repeatMode || globalRepeatMode || 'none';
  const isPlaying = currentSong?.isPlaying || false;
  const progress = currentSong?.progress || 0;
  const currentTime = currentSong?.currentTime || '0:00';
  const duration = currentSong?.duration || '--:--';

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '72px',
      background: '#0d0d14',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 2rem',
      gap: '1.5rem',
      zIndex: 999
    }}>

      {/* Song info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200, flexShrink: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 6, flexShrink: 0,
          background: currentSong?.gradient || 'linear-gradient(135deg, #b967ff, #ff6ec7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 600, fontSize: '1rem', overflow: 'hidden'
        }}>
          {currentSong?.cover
            ? <img src={currentSong.cover} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : currentSong?.name?.charAt(0).toUpperCase()
          }
        </div>
        <div style={{ overflow: 'hidden' }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'white' }}>
            {currentSong?.name || 'No song playing'}
          </p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentSong?.artist || ''}
          </p>
        </div>
      </div>

      {/* Center — controls + seek bar */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        {/* Playback buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={replaySong} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.1rem', opacity: 0.8, transition: 'opacity 0.2s' }}
            onMouseOver={e => e.currentTarget.style.opacity = 1}
            onMouseOut={e => e.currentTarget.style.opacity = 0.8}
          >⏮</button>

          <button
            onClick={handleSoundbarPlay}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'white', border: 'none', color: '#0d0d14',
              cursor: 'pointer', fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <button onClick={skipSong} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.1rem', opacity: 0.8, transition: 'opacity 0.2s' }}
            onMouseOver={e => e.currentTarget.style.opacity = 1}
            onMouseOut={e => e.currentTarget.style.opacity = 0.8}
          >⏭</button>
        </div>

        {/* Seek bar + timestamps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 500 }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{currentTime}</span>
          <div
            style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, cursor: 'pointer', position: 'relative' }}
            onClick={e => {
              if (!currentSongId) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = ((e.clientX - rect.left) / rect.width) * 100;
              seek(currentSongId, pct);
            }}
          >
            <div style={{ width: `${progress}%`, height: '100%', background: 'white', borderRadius: 2, transition: 'width 0.1s linear' }} />
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{duration}</span>
        </div>
      </div>

      {/* Volume controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160, flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 52 }}>
          <button
            className="control-btn"
            onClick={() => toggleRepeat(currentSongId)}
            title={repeatMode === 'one' ? 'Repeat one' : repeatMode === 'all' ? 'Repeat all' : 'No repeat'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            🔁
          </button>
          <span style={{ fontSize: '0.65rem', color: 'white', opacity: 0.85, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {repeatMode === 'all' ? 'All' : repeatMode === 'one' ? 'Current' : 'None'}
          </span>
        </div>
        <button onClick={toggleMute} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', opacity: 0.8 }}>
          {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
        </button>
        <input
          type="range" min="0" max="1" step="0.01"
          value={isMuted ? 0 : volume}
          onChange={e => changeVolume(parseFloat(e.target.value))}
          style={{ width: 80, accentColor: 'white' }}
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', minWidth: 30 }}>
          {Math.round((isMuted ? 0 : volume) * 100)}%
        </span>
      </div>
    </div>
  );
}