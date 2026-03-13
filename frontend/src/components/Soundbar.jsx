import React from "react";

export default function Soundbar({
  toggleMute,
  isMuted,
  volume,
  changeVolume,
  replaySong,
  handleSoundbarPlay,
  skipSong,
  library,
  currentSongId
}) {
  return (
    <div className="soundbar">
      <button className="mute-btn" onClick={toggleMute}>
        {isMuted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
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

      <span className="volume-label">
        {Math.round((isMuted ? 0 : volume) * 100)}%
      </span>

      <div className="playback-controls">
        <button
          className="control-btn"
          onClick={replaySong}
          title="Replay"
        >
          ⏮
        </button>

        <button
          className="control-btn play-pause-btn"
          onClick={handleSoundbarPlay}
          title="Play/Pause"
        >
          {library.find((s) => s.id === currentSongId)?.isPlaying
            ? "⏸"
            : "▶"}
        </button>

        <button
          className="control-btn"
          onClick={skipSong}
          title="Skip"
        >
          ⏭
        </button>
      </div>
    </div>
  );
}