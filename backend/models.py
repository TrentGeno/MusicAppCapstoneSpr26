# models.py
from database import db
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), nullable=False, unique=True)
    email = db.Column(db.String(100), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Track(db.Model):
    __tablename__ = 'tracks'
    track_id = db.Column(db.Integer, primary_key=True)
    file_path = db.Column(db.String(500), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    artist = db.Column(db.String(200))
    album = db.Column(db.String(200))
    genre = db.Column(db.String(100))
    duration = db.Column(db.Integer)
    bitrate = db.Column(db.Integer)
    year = db.Column(db.Integer)
    cover_art_path = db.Column(db.String(500))