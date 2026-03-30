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