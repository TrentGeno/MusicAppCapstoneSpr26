from database import db
from datetime import datetime

playlist_tracks = db.Table('playlist_tracks',
    db.Column('playlist_id', db.Integer, db.ForeignKey('playlists.playlist_id'), primary_key=True),
    db.Column('track_id', db.Integer, db.ForeignKey('tracks.track_id'), primary_key=True)
)

class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), nullable=False, unique=True)
    email = db.Column(db.String(100), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    profile_picture = db.Column(db.String(500))
    oauth_provider = db.Column(db.String(50))

    tracks = db.relationship('Track', backref='user', lazy=True)
    playlists = db.relationship('Playlist', backref='user', lazy=True)


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
    year = db.Column(db.String(20))
    cover_art_path = db.Column(db.String(500))

    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)


class Playlist(db.Model):
    __tablename__ = 'playlists'
    playlist_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255))

    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)

    tracks = db.relationship('Track', secondary=playlist_tracks, backref='playlists')