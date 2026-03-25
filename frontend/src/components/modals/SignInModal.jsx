import React, { useEffect } from "react";

export default function SignInModal({ handleGoogleSignIn, closeModal }) {
  useEffect(() => {
    const renderButton = () => {
      if (!window.google) return;

      window.google.accounts.id.initialize({
        client_id: "246868796255-a8bgcc7v21g956ghn2emcreh0ibp51d9.apps.googleusercontent.com",
        callback: handleGoogleSignIn,
      });

      window.google.accounts.id.renderButton(
        document.getElementById("google-signin-btn"),
        {
          theme: "filled_black",
          size: "large",
          shape: "pill",
          width: "340",
          text: "signin_with",
        }
      );
    };

    if (window.google) {
      renderButton();
    } else {
      const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (script) {
        script.addEventListener("load", renderButton);
      } else {
        const newScript = document.createElement("script");
        newScript.src = "https://accounts.google.com/gsi/client";
        newScript.async = true;
        newScript.defer = true;
        newScript.onload = renderButton;
        document.head.appendChild(newScript);
      }
    }
  }, [handleGoogleSignIn]);

  return (
    <div
      className="modal"
      onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Sign In</h2>
          <button className="close-modal" onClick={closeModal}>×</button>
        </div>

        <div className="google-signin-wrapper">
          <div id="google-signin-btn" />
        </div>

        <p className="signup-text">
          Don't have an account?{" "}
          <a href="#" className="signup-link">Sign up</a>
        </p>
      </div>
    </div>
  );
}