import musicbrainzngs
import requests

# Initialize
musicbrainzngs.set_useragent('MusicApp', '1.0', 'https://github.com/yourusername/musicapp')

# Search for releases by just 'Don Toliver'
print('Searching for releases by Don Toliver...')
result = musicbrainzngs.search_releases(
    'Love Sick',
    artist='Don Toliver',
    limit=10
)

print(f'Found {len(result["release-list"])} releases')
for i, release in enumerate(result['release-list'][:5]):
    mbid = release['id']
    title = release.get('title', 'Unknown')
    print(f'{i+1}. {title} - {mbid}')
    
    # Test cover art
    cover_url = f'https://coverartarchive.org/release/{mbid}/front-500'
    try:
        response = requests.head(cover_url, timeout=5, allow_redirects=True)
        if response.status_code == 200:
            print(f'   ✅ Has cover art!')
            print(f'   Final URL: {response.url}')
            break
        else:
            print(f'   ❌ No cover art ({response.status_code})')
    except Exception as e:
        print(f'   Error: {e}')