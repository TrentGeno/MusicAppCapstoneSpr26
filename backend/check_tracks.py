from database import db, init_db
from models import Track
from flask import Flask

app = Flask(__name__)
init_db(app)

with app.app_context():
    tracks = Track.query.all()
    print(f'Total tracks: {len(tracks)}')
    for t in tracks:
        print(f'{t.track_id}: {t.title} by {t.artist} - cover: {t.cover_art_path}')