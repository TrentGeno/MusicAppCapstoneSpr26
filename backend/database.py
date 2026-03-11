# database.py
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
        try:
            db.session.execute(db.text('SELECT 1'))
            print("✅ SQLite database connected successfully!")
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            raise
        
        db.create_all()

        # Create dummy user inside the same app context
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