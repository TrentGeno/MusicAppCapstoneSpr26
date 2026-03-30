import os
import uuid
from flask import Flask, request, send_from_directory, jsonify
from database import db, init_db, find_or_create_user
from models import User, Track, Playlist
from flask_cors import CORS
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import mutagen
from mutagen.mp3 import MP3
from mutagen.flac import FLAC
from mutagen.oggvorbis import OggVorbis
from mutagen.wave import WAVE
import musicbrainzngs
import requests

app = Flask(__name__)
init_db(app)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), "uploads")
COVER_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), "covers")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(COVER_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["COVER_FOLDER"] = COVER_FOLDER

# Initialize MusicBrainz
musicbrainzngs.set_useragent("MusicApp", "1.0", "https://github.com/yourusername/musicapp")

def extract_metadata(filepath):
    """Extract metadata from audio file using mutagen"""
    try:
        # Determine file type and load metadata
        if filepath.lower().endswith('.mp3'):
            audio = MP3(filepath)
        elif filepath.lower().endswith('.flac'):
            audio = FLAC(filepath)
        elif filepath.lower().endswith('.ogg'):
            audio = OggVorbis(filepath)
        elif filepath.lower().endswith('.wav'):
            audio = WAVE(filepath)
        else:
            return None

        metadata = {
            'title': None,
            'artist': None,
            'album': None,
            'genre': None,
            'duration': int(audio.info.length) if hasattr(audio.info, 'length') else None,
            'bitrate': getattr(audio.info, 'bitrate', None),
            'year': None
        }

        # Extract metadata based on file type
        if hasattr(audio, 'tags') and audio.tags:
            if filepath.lower().endswith('.mp3'):
                metadata['title'] = audio.tags.get('TIT2', [None])[0]
                metadata['artist'] = audio.tags.get('TPE1', [None])[0]
                metadata['album'] = audio.tags.get('TALB', [None])[0]
                metadata['genre'] = audio.tags.get('TCON', [None])[0]
                year_tag = audio.tags.get('TDRC', [None])[0]
                metadata['year'] = str(year_tag) if year_tag else None
            else:
                # For other formats (FLAC, OGG, etc.)
                metadata['title'] = audio.tags.get('title', [None])[0]
                metadata['artist'] = audio.tags.get('artist', [None])[0]
                metadata['album'] = audio.tags.get('album', [None])[0]
                metadata['genre'] = audio.tags.get('genre', [None])[0]
                metadata['year'] = audio.tags.get('date', [None])[0]

        return metadata
    except Exception as e:
        print(f"Error extracting metadata from {filepath}: {e}")
        return None

def fetch_musicbrainz_cover_art(title, artist, album=None):
    """Fetch cover art from MusicBrainz API"""
    if not title or not artist:
        return None

    try:
        release_mbid = None

        # Strategy 1: If we have album information, search for releases directly
        if album:
            print(f"Searching for release: '{album}' by {artist}")
            release_result = musicbrainzngs.search_releases(
                album,
                artist=artist.split(',')[0].strip(),  # Use main artist
                limit=10  # Get more results
            )

            if release_result['release-list']:
                # Try each release until we find one with cover art
                for release in release_result['release-list']:
                    release_mbid = release['id']
                    release_title = release.get('title', 'Unknown')
                    print(f"Testing release: {release_title}")
                    
                    # Test if this release has cover art
                    cover_art_url = f"https://coverartarchive.org/release/{release_mbid}/front-500"
                    try:
                        test_response = requests.head(cover_art_url, timeout=5, allow_redirects=True)
                        if test_response.status_code == 200:
                            print(f"Found cover art for release: {release_title}")
                            break
                        else:
                            print(f"No cover art for release: {release_title}")
                            release_mbid = None
                    except:
                        print(f"Error testing release: {release_title}")
                        release_mbid = None

                if not release_mbid:
                    print("No releases with cover art found")

        # Strategy 2: Fallback - Search for recordings if no album-specific search worked
        if not release_mbid:
            print(f"Searching for recording: '{title}' by {artist}")
            result = musicbrainzngs.search_recordings(
                title,
                artist=artist.split(',')[0].strip(),  # Use main artist
                limit=5  # Get more results
            )

            if result['recording-list']:
                # Try each recording until we find one with cover art
                for recording in result['recording-list']:
                    # Try to get release MBID from the recording
                    if 'release-list' in recording and recording['release-list']:
                        for release in recording['release-list'][:3]:  # Try up to 3 releases per recording
                            release_mbid = release['id']
                            release_title = release.get('title', 'Unknown')
                            print(f"Testing release from recording: {release_title}")

                            # Test if this release has cover art
                            cover_art_url = f"https://coverartarchive.org/release/{release_mbid}/front-500"
                            try:
                                test_response = requests.head(cover_art_url, timeout=5, allow_redirects=True)
                                if test_response.status_code == 200:
                                    print(f"Found cover art for release: {release_title}")
                                    break
                                else:
                                    release_mbid = None
                            except:
                                release_mbid = None

                    if release_mbid:
                        break

                if not release_mbid:
                    print("No recordings with cover art found")

        if not release_mbid:
            print("No suitable release found")
            return None

        # Get cover art from Cover Art Archive
        cover_art_url = f"https://coverartarchive.org/release/{release_mbid}/front-500"
        print(f"Fetching cover art from: {cover_art_url}")
        response = requests.get(cover_art_url, timeout=10, allow_redirects=True)

        if response.status_code == 200:
            print(f"Cover art retrieved successfully ({len(response.content)} bytes)")
            return response.content
        else:
            print(f"Cover art not found for release {release_mbid} (status: {response.status_code})")
            return None

    except Exception as e:
        print(f"Error fetching cover art from MusicBrainz: {e}")
        return None

def save_cover_art(cover_data, artist, album):
    """Save cover art image and return the file path"""
    if not cover_data:
        return None

    try:
        # Create a unique filename based on album (preferred) or artist
        if album:
            safe_key = "".join(c for c in album if c.isalnum() or c in (' ', '-', '_')).rstrip()
            cover_filename = f"cover_album_{safe_key}.jpg"
        elif artist:
            # Extract main artist (before comma if featured artists)
            main_artist = artist.split(',')[0].strip()
            safe_key = "".join(c for c in main_artist if c.isalnum() or c in (' ', '-', '_')).rstrip()
            cover_filename = f"cover_artist_{safe_key}.jpg"
        else:
            return None

        cover_path = os.path.join(app.config["COVER_FOLDER"], cover_filename)

        # Save the image data directly (assuming it's already JPEG)
        with open(cover_path, 'wb') as f:
            f.write(cover_data)

        return cover_filename

    except Exception as e:
        print(f"Error saving cover art: {e}")
        return None

GOOGLE_CLIENT_ID = "YOUR_CLIENT_ID_HERE"

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

    # Check if this file already exists in the database
    existing_track = Track.query.filter_by(file_path=filepath).first()
    if existing_track:
        # First, save the newly uploaded file (in case it was deleted)
        file.save(filepath)
        print(f"Saved uploaded file to {filepath}")
        
        # File path exists in database - re-process it for metadata and cover art
        # Re-extract metadata from the newly uploaded file
        metadata = extract_metadata(filepath)
        if metadata:
            # Update track metadata
            existing_track.title = metadata['title'] or existing_track.title
            existing_track.artist = metadata['artist'] or existing_track.artist
            existing_track.album = metadata['album'] or existing_track.album
            existing_track.genre = metadata['genre'] or existing_track.genre
            existing_track.duration = metadata['duration'] or existing_track.duration
            existing_track.bitrate = metadata['bitrate'] or existing_track.bitrate
            existing_track.year = metadata['year'] or existing_track.year

            # Try to fetch cover art
            title = existing_track.title
            artist = existing_track.artist
            album = existing_track.album

            cover_art_path = None
            if title and artist:
                print(f"Fetching cover art for: '{title}' by {artist}" + (f" from album '{album}'" if album else ""))
                cover_data = fetch_musicbrainz_cover_art(title, artist, album)
                if cover_data:
                    cover_art_path = save_cover_art(cover_data, artist, album)
                    if cover_art_path:
                        # Update ALL tracks with the same album (or same main artist if no album)
                        if album:
                            tracks_to_update = Track.query.filter_by(album=album).all()
                        else:
                            main_artist = artist.split(',')[0].strip()
                            tracks_to_update = Track.query.filter(Track.artist.like(f"{main_artist}%")).all()
                        for track in tracks_to_update:
                            track.cover_art_path = cover_art_path
                        db.session.commit()
                        print(f"Cover art updated for {len(tracks_to_update)} tracks with album '{album}'" if album else f"Cover art updated for {len(tracks_to_update)} tracks by artist '{main_artist}'")
                else:
                    print(f"No cover art found for '{title}' by {artist}")

            db.session.commit()

        return jsonify({
            "message": "File re-processed for metadata and cover art",
            "filename": file.filename,
            "track_id": existing_track.track_id
        }), 200

    # New file - save it and process
    file.save(filepath)

    try:
        # Extract metadata from the audio file
        metadata = extract_metadata(filepath)

        # Use metadata if available, otherwise fall back to filename
        title = metadata['title'] if metadata and metadata['title'] else os.path.splitext(file.filename)[0]
        artist = metadata['artist'] if metadata and metadata['artist'] else None
        album = metadata['album'] if metadata and metadata['album'] else None
        genre = metadata['genre'] if metadata and metadata['genre'] else None
        duration = metadata['duration'] if metadata and metadata['duration'] else None
        bitrate = metadata['bitrate'] if metadata and metadata['bitrate'] else None
        year = metadata['year'] if metadata and metadata['year'] else None

        # Create track record
        track = Track(
            file_path=filepath,
            title=title,
            artist=artist,
            album=album,
            genre=genre,
            duration=duration,
            bitrate=bitrate,
            year=year,
            cover_art_path=None,  # Will be set after fetching
            user_id=1  # replace later with logged-in user
        )
        db.session.add(track)
        db.session.commit()

        # Fetch cover art from MusicBrainz if we have title and artist
        cover_art_path = None
        if title and artist:
            print(f"Fetching cover art for: '{title}' by {artist}" + (f" from album '{album}'" if album else ""))
            cover_data = fetch_musicbrainz_cover_art(title, artist, album)
            if cover_data:
                cover_art_path = save_cover_art(cover_data, artist, album)
                if cover_art_path:
                    # Update ALL tracks with the same album (or same main artist if no album)
                    if album:
                        tracks_to_update = Track.query.filter_by(album=album).all()
                    else:
                        main_artist = artist.split(',')[0].strip()
                        tracks_to_update = Track.query.filter(Track.artist.like(f"{main_artist}%")).all()
                    for track in tracks_to_update:
                        track.cover_art_path = cover_art_path
                    db.session.commit()
                    print(f"Cover art updated for {len(tracks_to_update)} tracks with album '{album}'" if album else f"Cover art updated for {len(tracks_to_update)} tracks by artist '{main_artist}'")
            else:
                print(f"No cover art found for '{title}' by {artist}")

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

    return jsonify({"filename": unique_name})


@app.route("/music/<filename>")
def serve_music(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

@app.route("/covers/<filename>")
def serve_cover(filename):
    response = send_from_directory(app.config["COVER_FOLDER"], filename)
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route("/tracks", methods=["GET"])
def get_tracks():
    tracks = Track.query.filter_by(user_id=1).all()
    # Filter tracks to only include those whose files actually exist
    # and remove duplicates based on file path
    valid_tracks = []
    seen_paths = set()

    for t in tracks:
        if os.path.exists(t.file_path) and t.file_path not in seen_paths:
            seen_paths.add(t.file_path)
            
            # Check if cover art file actually exists
            cover_art_url = None
            if t.cover_art_path:
                cover_art_full_path = os.path.join(app.config["COVER_FOLDER"], t.cover_art_path)
                if os.path.exists(cover_art_full_path):
                    cover_art_url = f"http://localhost:5000/covers/{t.cover_art_path}"
                else:
                    # Cover art file is missing - clear the path in database
                    print(f"Cover art file missing for track {t.track_id}, clearing database reference")
                    t.cover_art_path = None
                    db.session.commit()
            
            valid_tracks.append({
                "track_id": t.track_id,
                "title": t.title,
                "filename": os.path.basename(t.file_path),
                "file_path": t.file_path,
                "artist": t.artist,
                "album": t.album,
                "genre": t.genre,
                "duration": t.duration,
                "bitrate": t.bitrate,
                "year": t.year,
                "cover_art_url": cover_art_url
            })
        elif not os.path.exists(t.file_path):
            # Clean up orphaned database entries and associated cover art
            print(f"Removing orphaned track from database: {t.title} (file: {t.file_path})")
            
            # Check if cover art is still used by other tracks before deleting
            if t.cover_art_path:
                # Count tracks that share the same cover art file
                other_tracks_using_cover = Track.query.filter_by(cover_art_path=t.cover_art_path).count()
                if other_tracks_using_cover <= 1:  # Only this track uses it
                    cover_art_full_path = os.path.join(app.config["COVER_FOLDER"], t.cover_art_path)
                    if os.path.exists(cover_art_full_path):
                        try:
                            os.remove(cover_art_full_path)
                            print(f"Deleted cover art file: {t.cover_art_path}")
                        except Exception as e:
                            print(f"Error deleting cover art file {t.cover_art_path}: {e}")
            
            # Remove the track from database
            db.session.delete(t)
            db.session.commit()
        # If file exists but path already seen, this is a duplicate - skip it
    return jsonify(valid_tracks), 200
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