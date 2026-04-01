import sys
sys.path.append('.')
from app import extract_metadata
import os

# Check metadata for the uploaded files
uploads_dir = 'uploads'
for filename in os.listdir(uploads_dir):
    if filename.endswith('.mp3'):
        filepath = os.path.join(uploads_dir, filename)
        print(f'Checking {filename}:')
        metadata = extract_metadata(filepath)
        if metadata:
            print(f'  Title: {metadata.get("title")}')
            print(f'  Artist: {metadata.get("artist")}')
            print(f'  Album: {metadata.get("album")}')
        else:
            print('  No metadata found')
        print()