import React from "react";

export default function PlaylistModal({
  playlistData,
  setPlaylistData,
  handleCreatePlaylist,
  closeModal
}) {
  return (
    <div
      className="modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="modal-content">

        <div className="modal-header">
          <h2 className="modal-title">Create Playlist</h2>

          <button
            className="close-modal"
            onClick={closeModal}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleCreatePlaylist}>

          <div className="form-group">
            <label>Playlist Name</label>

            <input
              type="text"
              placeholder="My Awesome Playlist"
              value={playlistData.name}
              onChange={(e) =>
                setPlaylistData({
                  ...playlistData,
                  name: e.target.value
                })
              }
              required
            />
          </div>

          <div className="form-group">
            <label>Description (Optional)</label>

            <input
              type="text"
              placeholder="A collection of my favorite tracks"
              value={playlistData.description}
              onChange={(e) =>
                setPlaylistData({
                  ...playlistData,
                  description: e.target.value
                })
              }
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full-width"
          >
            Create Playlist
          </button>

        </form>

      </div>
    </div>
  );
}