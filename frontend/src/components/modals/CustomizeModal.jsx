import React, { useState } from 'react';

export default function CustomizeModal({ theme, onSave, closeModal }) {
  const [mainColor, setMainColor] = useState(theme.main);
  const [accent1, setAccent1] = useState(theme.accent1);
  const [accent2, setAccent2] = useState(theme.accent2);

  return (
    <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Customize App</h2>
          <button className="close-modal" onClick={closeModal}>×</button>
        </div>

        <p className="customize-note">
          Pick a main brand color and two accent colors. These values update the whole app theme instantly.
        </p>

        <div className="customize-grid">
          <div className="form-group">
            <label>Main Color</label>
            <div className="color-input-row">
              <input
                type="color"
                value={mainColor}
                onChange={(e) => setMainColor(e.target.value)}
              />
              <input
                type="text"
                value={mainColor}
                onChange={(e) => setMainColor(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Accent Color</label>
            <div className="color-input-row">
              <input
                type="color"
                value={accent1}
                onChange={(e) => setAccent1(e.target.value)}
              />
              <input
                type="text"
                value={accent1}
                onChange={(e) => setAccent1(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Secondary Accent</label>
            <div className="color-input-row">
              <input
                type="color"
                value={accent2}
                onChange={(e) => setAccent2(e.target.value)}
              />
              <input
                type="text"
                value={accent2}
                onChange={(e) => setAccent2(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="theme-preview" style={{ background: `linear-gradient(135deg, ${mainColor}, ${accent1}, ${accent2})` }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Preview</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>These colors will influence the whole app theme.</p>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => {
              onSave({ main: mainColor, accent1, accent2 });
              closeModal();
            }}
          >
            Apply Theme
          </button>
        </div>
      </div>
    </div>
  );
}
