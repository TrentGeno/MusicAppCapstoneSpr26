import React from "react";

export default function SignInModal({
  signInData,
  setSignInData,
  handleSignIn,
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
          <h2 className="modal-title">Sign In</h2>

          <button
            className="close-modal"
            onClick={closeModal}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSignIn}>

          <div className="form-group">
            <label>Email</label>

            <input
              type="email"
              placeholder="your@email.com"
              value={signInData.email}
              onChange={(e) =>
                setSignInData({
                  ...signInData,
                  email: e.target.value
                })
              }
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              placeholder="••••••••"
              value={signInData.password}
              onChange={(e) =>
                setSignInData({
                  ...signInData,
                  password: e.target.value
                })
              }
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full-width"
          >
            Sign In
          </button>

          <p className="signup-text">
            Don't have an account?{" "}
            <a href="#" className="signup-link">
              Sign up
            </a>
          </p>

        </form>

      </div>
    </div>
  );
}