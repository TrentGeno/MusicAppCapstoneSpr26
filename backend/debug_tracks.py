#!/usr/bin/env python3
import os
import sys
sys.path.append(os.path.dirname(__file__))

from app import app, db, Track

def debug_tracks():
    """Debug track database entries"""
    with app.app_context():
        tracks = Track.query.all()
        print(f"Total tracks in database: {len(tracks)}")
        print()

        for i, t in enumerate(tracks, 1):
            exists = os.path.exists(t.file_path)
            print(f"Track {i}:")
            print(f"  ID: {t.track_id}")
            print(f"  Title: {t.title}")
            print(f"  Artist: {t.artist}")
            print(f"  File path: {t.file_path}")
            print(f"  File exists: {exists}")
            if not exists:
                print(f"  ❌ FILE MISSING")
            else:
                print(f"  ✅ FILE EXISTS")
            print()

if __name__ == "__main__":
    debug_tracks()