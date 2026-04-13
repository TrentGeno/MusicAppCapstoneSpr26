from app import fetch_wikipedia_discography_entries
import app as _app
from collections import Counter

_app._artist_discography_cache.clear()

entries = fetch_wikipedia_discography_entries('Don Toliver discography')
print(f'Total entries: {len(entries)}')

groups = Counter(e['group_name'] for e in entries)
for grp, cnt in sorted(groups.items(), key=lambda x: -x[1]):
    print(f'  {cnt:3d}  {grp}')

print()
seen_groups = set()
for e in entries:
    g = e['group_name']
    if g not in seen_groups:
        seen_groups.add(g)
        yr = e.get('release_year', '?')
        title = e['title']
        print(f'  [{g}] first: {title} ({yr})')
