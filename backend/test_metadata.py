#!/usr/bin/env python3
import os
import sys
sys.path.append(os.path.dirname(__file__))

from app import extract_metadata, fetch_musicbrainz_cover_art

def test_metadata_extraction():
    """Test metadata extraction from the existing audio file"""
    filepath = os.path.join(os.path.dirname(__file__), "uploads", "17 Laugh It Off.mp3")

    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    print(f"Testing metadata extraction for: {filepath}")
    metadata = extract_metadata(filepath)

    if metadata:
        print("Metadata extracted successfully:")
        for key, value in metadata.items():
            print(f"  {key}: {value}")
    else:
        print("Failed to extract metadata")

    # Test MusicBrainz cover art fetching
    if metadata and metadata['title'] and metadata['artist']:
        print(f"\nTesting MusicBrainz cover art fetch for: {metadata['title']} by {metadata['artist']}")
        cover_data = fetch_musicbrainz_cover_art(metadata['title'], metadata['artist'])
        if cover_data:
            print(f"Cover art found! Size: {len(cover_data)} bytes")
        else:
            print("No cover art found")
    else:
        print("Cannot test MusicBrainz - missing title or artist")

if __name__ == "__main__":
    test_metadata_extraction()