import React from "react";

export default function UploadModal({
  uploadedFiles,
  handleFiles,
  removeFile,
  handleUpload,
  closeModal,
  isDragging,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  uploadProgress,
  isUploading
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
          <h2 className="modal-title">Upload Music Files</h2>
          <button
            className="close-modal"
            onClick={closeModal}
          >
            ×
          </button>
        </div>

        <div className="upload-area">
          <div
            className={`drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="upload-icon">📁</div>
            <p>Drag and drop your music files here</p>
            <p>or</p>
            <label className="file-input-label">
              <input
                type="file"
                multiple
                accept="audio/*"
                onChange={(e) => handleFiles(e.target.files)}
                style={{ display: 'none' }}
              />
              <span className="btn btn-secondary">Choose Files</span>
            </label>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="file-list">
              <h3>Files to upload:</h3>
              {uploadedFiles.map((file, index) => {
                const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
                const progress = uploadProgress?.[fileKey] ?? 0;
                return (
                  <div key={fileKey} className="file-item">
                    <div className="file-details">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <button
                      className="remove-file"
                      onClick={() => removeFile(index)}
                      disabled={isUploading}
                    >
                      ×
                    </button>
                    <div className="upload-progress">
                      <progress value={progress} max="100" />
                      <span className="progress-label">{progress}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="modal-actions">
            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={uploadedFiles.length === 0 || isUploading}
            >
              {isUploading ? 'Uploading...' : `Upload ${uploadedFiles.length} File${uploadedFiles.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}