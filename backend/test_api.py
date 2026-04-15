#!/usr/bin/env python3
import requests

def test_tracks_api():
    """Test the tracks API to see current tracks and cover art"""
    try:
        response = requests.get('http://localhost:5000/tracks')
        if response.status_code == 200:
            tracks = response.json()
            print(f'Found {len(tracks)} tracks:')
            for track in tracks:
                cover_status = "HAS COVER" if track.get("cover_art_url") else "NO COVER"
                print(f'  {track["title"]} by {track["artist"]} - {cover_status}')
                print(f'    Album: {track.get("album", "NOT IN RESPONSE")}')  
                if track.get("cover_art_url"):
                    print(f'    Cover URL: {track["cover_art_url"]}')
        else:
            print(f'Error: {response.status_code} - {response.text}')
    except Exception as e:
        print(f'Error connecting to API: {e}')

if __name__ == "__main__":
    test_tracks_api()