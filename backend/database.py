import os
from flask_sqlalchemy import SQLAlchemy
from flask import Flask
from sqlalchemy import event
from sqlalchemy.engine import Engine

db = SQLAlchemy()

def init_db(app: Flask):
    basedir = os.path.abspath(os.path.dirname(__file__))
    instance_dir = os.path.join(basedir, 'instance')
    os.makedirs(instance_dir, exist_ok=True)

    db_path = os.path.join(instance_dir, 'music_app.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    @event.listens_for(Engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    db.init_app(app)

    with app.app_context():
        db.create_all()

        # Ensure existing database schema has required columns (backward compatibility)
        # SQLite ALTER TABLE only supports adding columns.
        conn = db.engine.connect()
        try:
            # Add missing user columns if they don't exist, ignore if already present.
            # We use PRAGMA table_info to inspect current schema.
            user_cols = {r[1] for r in conn.execute(db.text("PRAGMA table_info(users)"))}

            if 'profile_picture' not in user_cols:
                conn.execute(db.text("ALTER TABLE users ADD COLUMN profile_picture VARCHAR(500)"))
                print("✅ Added missing users.profile_picture column")
            if 'oauth_provider' not in user_cols:
                conn.execute(db.text("ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(50)"))
                print("✅ Added missing users.oauth_provider column")

            # Add missing track columns if they don't exist.
            track_cols = {r[1] for r in conn.execute(db.text("PRAGMA table_info(tracks)"))}

            if 'duration' not in track_cols:
                conn.execute(db.text("ALTER TABLE tracks ADD COLUMN duration INTEGER"))
                print("✅ Added missing tracks.duration column")
            if 'bitrate' not in track_cols:
                conn.execute(db.text("ALTER TABLE tracks ADD COLUMN bitrate INTEGER"))
                print("✅ Added missing tracks.bitrate column")
            if 'year' not in track_cols:
                conn.execute(db.text("ALTER TABLE tracks ADD COLUMN year VARCHAR(20)"))
                print("✅ Added missing tracks.year column")
            if 'cover_art_path' not in track_cols:
                conn.execute(db.text("ALTER TABLE tracks ADD COLUMN cover_art_path VARCHAR(500)"))
                print("✅ Added missing tracks.cover_art_path column")
            if 'user_id' not in track_cols:
                conn.execute(db.text("ALTER TABLE tracks ADD COLUMN user_id INTEGER REFERENCES users(user_id)"))
                print("✅ Added missing tracks.user_id column")

        except Exception as e:
            print(f"⚠️ Schema migration check failed: {e}")
        finally:
            conn.close()

        from models import User
        existing = db.session.get(User, 1)
        if not existing:
            dummy = User(
                username="testuser",
                email="test@test.com",
                password_hash="dummyhash123"
            )
            db.session.add(dummy)
            db.session.commit()
            print("✅ Dummy user created (user_id=1)")
        else:
            print("ℹ️ Dummy user already exists")


# ✅ FIXED: Proper SQLAlchemy version
def find_or_create_user(email, name, picture):
    from models import User

    user = User.query.filter_by(email=email).first()

    if user:
        return {
            "user_id": user.user_id,
            "email": user.email,
            "username": user.username,
            "profile_picture": user.profile_picture
        }

    new_user = User(
        username=name or email,
        email=email,
        password_hash="google_oauth",
        profile_picture=picture,
        oauth_provider="google"
    )

    db.session.add(new_user)
    db.session.commit()

    return {
        "user_id": new_user.user_id,
        "email": new_user.email,
        "username": new_user.username,
        "profile_picture": new_user.profile_picture
    }