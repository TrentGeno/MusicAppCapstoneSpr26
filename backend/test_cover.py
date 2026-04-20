#!/usr/bin/env python3
import requests

def test_cover_art():
    """Test that cover art can be served"""
    try:
        response = requests.get('http://127.0.0.1:5000/covers/cover_3.jpg')
        print(f'Status: {response.status_code}')
        if response.status_code == 200:
            print(f'Cover art served successfully! Size: {len(response.content)} bytes')
            content_type = response.headers.get('content-type')
            print(f'Content-Type: {content_type}')
        else:
            print(f'Error: {response.text}')
    except Exception as e:
        print(f'Error: {e}')

if __name__ == "__main__":
    test_cover_art()