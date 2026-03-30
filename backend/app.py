import os
import uuid
from flask import Flask, request, send_from_directory, jsonify
from flask_cors import CORS
from database import db, init_db, find_or_create_user
from models import User, Track, Playlist
from flask_cors import CORS
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

app = Flask(__name__)
init_db(app)
CORS(app, origins=["http://localhost:5000", "http://localhost:5173"])

UPLOAD_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER




GOOGLE_CLIENT_ID = "246868796255-a8bgcc7v21g956ghn2emcreh0ibp51d9.apps.googleusercontent.com"

@app.route("/api/auth/google", methods=["POST"])
def google_signin():
    token = request.json.get("token")

    try:
        payload = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )

        email = payload["email"]
        name = payload.get("name")
        picture = payload.get("picture")

        user = find_or_create_user(email, name, picture)

        return jsonify({"user": user})

    except ValueError:
        return jsonify({"error": "Invalid token"}), 401


@app.route('/test-db')
def test_db():
    try:
        db.session.execute(db.text('SELECT 1'))
        return {'status': 'success', 'message': 'Database connected!'}, 200
    except Exception as e:
        return {'status': 'error', 'message': str(e)}, 500


@app.route("/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    unique_name = f"{uuid.uuid4()}_{file.filename}"
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], unique_name)
    file.save(filepath)

    try:
        title = os.path.splitext(file.filename)[0]

        track = Track(
            file_path=filepath,
            title=title,
            user_id=1  # replace later with logged-in user
        )
        db.session.add(track)
        db.session.commit()

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

    return jsonify({"filename": unique_name})


@app.route("/music/<filename>")
def serve_music(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

@app.route("/tracks", methods=["GET"])
def get_tracks():
    tracks = Track.query.filter_by(user_id=1).all()

    return jsonify([
        {
            "track_id": t.track_id,
            "title": t.title,
            "filename": os.path.basename(t.file_path),
            "artist": t.artist,
            "album": t.album,
            "genre": t.genre
        }
        for t in tracks
    ])

@app.route("/playlist", methods=["POST"])
def create_playlist():
    data = request.get_json()

    if not data or "name" not in data:
        return jsonify({"error": "Invalid request"}), 400

    try:
        playlist = Playlist(
            name=data["name"],
            description=data.get("description"),
            user_id=1
        )

        db.session.add(playlist)
        db.session.commit()

        return jsonify({
            "playlist_id": playlist.playlist_id,
            "name": playlist.name
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/playlists", methods=["GET"])
def get_playlists():
    playlists = Playlist.query.filter_by(user_id=1).all()

    return jsonify([
        {
            "playlist_id": p.playlist_id,
            "name": p.name,
            "description": p.description,
            "track_count": len(p.tracks)
        }
        for p in playlists
    ])

@app.route("/playlist/<int:playlist_id>/add-track", methods=["POST"])
def add_track_to_playlist(playlist_id):
    data = request.get_json()
    track_id = data.get("track_id")

    playlist = db.session.get(Playlist, playlist_id)
    track = db.session.get(Track, track_id)

    if not playlist or not track:
        return jsonify({"error": "Playlist or Track not found"}), 404

    if track not in playlist.tracks:
        playlist.tracks.append(track)

    db.session.commit()

    return jsonify({"message": "Track added to playlist"})

if __name__ == "__main__":
    app.run(debug=True)