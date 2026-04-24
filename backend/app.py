from flask import Flask, jsonify
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
from urllib.parse import quote
from sqlalchemy import text as sa_text

import sys

# Works in both dev and when packaged with PyInstaller
if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
CORS(app)

@app.route("/home")
def hello():
    return jsonify({"message": "Homepage Template"})

if __name__ == "__main__":
    app.run(debug=True)
