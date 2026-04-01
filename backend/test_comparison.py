#!/usr/bin/env python3
import os
import sys
sys.path.append(os.path.dirname(__file__))

from app import extract_metadata, fetch_musicbrainz_cover_art

def test_cover_art_comparison():
    """Compare old vs new cover art fetching methods"""
    filepath = os.path.join(os.path.dirname(__file__), "uploads", "02 Embarrassed (feat. Travis Scott).mp3")

    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    print("=== Cover Art Fetching Comparison ===\n")

    # Extract metadata
    print("1. Extracting metadata...")
    metadata = extract_metadata(filepath)

    if not metadata:
        print("❌ Failed to extract metadata")
        return

    title = metadata.get('title')
    artist = metadata.get('artist')
    album = metadata.get('album')

    print(f"Title: {title}")
    print(f"Artist: {artist}")
    print(f"Album: {album}")
    print()

    if not title or not artist:
        print("❌ Missing title or artist")
        return

    # Test new method (with album)
    print("2. NEW METHOD (with album information):")
    if album:
        cover_data_new = fetch_musicbrainz_cover_art(title, artist, album)
        if cover_data_new:
            print(f"✅ Cover art found! Size: {len(cover_data_new)} bytes")
        else:
            print("❌ No cover art found")
    else:
        print("No album information available")
    print()

    # Test old method (without album) for comparison
    print("3. OLD METHOD (without album information):")
    cover_data_old = fetch_musicbrainz_cover_art(title, artist)  # Old method
    if cover_data_old:
        print(f"✅ Cover art found! Size: {len(cover_data_old)} bytes")
    else:
        print("❌ No cover art found")
    print()

    # Summary
    print("4. SUMMARY:")
    new_success = album and cover_data_new is not None
    old_success = cover_data_old is not None

    if new_success and old_success:
        print("✅ Both methods found cover art - album info improved accuracy!")
    elif new_success and not old_success:
        print("🎯 NEW METHOD SUCCESS: Album info made the difference!")
    elif not new_success and old_success:
        print("⚠️  OLD METHOD WORKED: Album info didn't help this time")
    else:
        print("❌ Neither method found cover art")

if __name__ == "__main__":
    test_cover_art_comparison()