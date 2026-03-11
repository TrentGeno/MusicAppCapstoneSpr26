import os
from flask import Flask, request, send_from_directory, jsonify
from database import db, init_db
from models import User, Track
from flask_cors import CORS

app = Flask(__name__)
init_db(app)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER


@app.route('/test-db')
def test_db():
    try:
        db.session.execute(db.text('SELECT 1'))
        return {'status': 'success', 'message': 'Database connected!'}, 200
    except Exception as e:
        return {'status': 'error', 'message': str(e)}, 500


@app.route("/home")
def hello():
    return jsonify({"message": "Homepage Template"})


@app.route("/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    filepath = os.path.join(app.config["UPLOAD_FOLDER"], file.filename)
    file.save(filepath)

    try:
        title = os.path.splitext(file.filename)[0]

        dummy_user = db.session.get(User, 1)
        if not dummy_user:
            return jsonify({"error": "Dummy user not found"}), 500

        track = Track(
            file_path=filepath,
            title=title,
            artist=None,
            album=None,
            genre=None
        )
        db.session.add(track)
        db.session.commit()

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to save track in DB: {e}"}), 500

    return jsonify({"filename": file.filename})


@app.route("/music/<filename>")
def serve_music(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

@app.route("/tracks", methods=["GET"])
def get_tracks():
    tracks = Track.query.all()
    return jsonify([
        {
            "track_id": t.track_id,
            "title": t.title,
            "filename": os.path.basename(t.file_path),
            "file_path": t.file_path,
            "artist": t.artist,
            "album": t.album,
            "genre": t.genre
        }
        for t in tracks
    ]), 200

if __name__ == "__main__":
    app.run(debug=True)