#!/usr/bin/env python3
import os
import sys
sys.path.append(os.path.dirname(__file__))

from app import extract_metadata, fetch_musicbrainz_cover_art

def test_improved_cover_art():
    """Test the improved cover art fetching with album information"""
    filepath = os.path.join(os.path.dirname(__file__), "uploads", "01 No Pole.mp3")

    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    print("=== Testing Improved Cover Art Fetching ===\n")

    # Extract metadata
    print("1. Extracting metadata...")
    metadata = extract_metadata(filepath)

    if metadata:
        print("Metadata extracted:")
        for key, value in metadata.items():
            print(f"  {key}: {value}")
        print()

        # Test cover art fetching with album information
        title = metadata.get('title')
        artist = metadata.get('artist')
        album = metadata.get('album')

        if title and artist:
            print("2. Testing cover art fetching...")

            # Test with album information
            if album:
                print(f"Fetching with album: '{title}' by {artist} from '{album}'")
                cover_data = fetch_musicbrainz_cover_art(title, artist, album)
            else:
                print(f"Fetching without album: '{title}' by {artist}")
                cover_data = fetch_musicbrainz_cover_art(title, artist)

            if cover_data:
                print(f"✅ Cover art found! Size: {len(cover_data)} bytes")
            else:
                print("❌ No cover art found")
        else:
            print("❌ Missing title or artist for cover art search")
    else:
        print("❌ Failed to extract metadata")

if __name__ == "__main__":
    test_improved_cover_art()