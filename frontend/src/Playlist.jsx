import React from "react";
import "./App.css";

export default function Playlist() {
  return (
    <div className="playlist-page">

      {/* HEADER */}
      <div className="playlist-hero">
        <img
          className="playlist-cover"
          src="https://i.scdn.co/image/ab67616d0000b273ff9ca10b55ce82ae553c8228"
          alt="Playlist Cover"
        />

        <div className="playlist-info">
          <p className="playlist-type">COLLABORATIVE PLAYLIST</p>
          <h1 className="playlist-title">Office</h1>
          <p className="playlist-meta">
            Ankur Thakur • 51 songs, 3 hr 16 min
          </p>
        </div>
      </div>

      {/* PLAY BUTTON BAR */}
      <div className="playlist-controls">
        <button className="play-button">▶</button>
      </div>

      {/* TABLE HEADER */}
      <div className="song-table-header">
        <span>#</span>
        <span>Title</span>
        <span>Album</span>
        <span>Date Added</span>
        <span>⏱</span>
      </div>

      {/* SONG ROWS */}
      <div className="song-row">
        <span>1</span>
        <div className="song-title">
          <img src="https://i.scdn.co/image/ab67616d0000b273ff9ca10b55ce82ae553c8228" />
          <div>
            <p>Head & Heart</p>
            <span>Joel Corry, MNEK</span>
          </div>
        </div>
        <span>Head & Heart</span>
        <span>Sep 15, 2020</span>
        <span>2:46</span>
      </div>

      <div className="song-row">
        <span>2</span>
        <div className="song-title">
          <img src="https://i.scdn.co/image/ab67616d0000b273b8c4cfa8b8aab76d2ee5115e7" />
          <div>
            <p>No Love</p>
            <span>Eminem, Lil Wayne</span>
          </div>
        </div>
        <span>Recovery</span>
        <span>Sep 15, 2020</span>
        <span>4:59</span>
      </div>

    </div>
  );
}