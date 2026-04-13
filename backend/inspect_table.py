import requests
import re
from html import unescape

UA = 'MusicApp/1.0'

def strip_tags(html):
    return re.sub(r'<[^>]+>', '', html)

def get_section_html(page, section_index):
    resp = requests.get('https://en.wikipedia.org/w/api.php', params={
        'action': 'parse', 'page': page, 'prop': 'text',
        'section': str(section_index), 'format': 'json',
    }, timeout=15, headers={'User-Agent': UA})
    return resp.json().get('parse', {}).get('text', {}).get('*', '')

# Inspect sections 8 (As lead artist) and 9 (As featured artist) for Don Toliver discography
for section_idx in [8, 9]:
    html = get_section_html('Don Toliver discography', section_idx)

    # Find all wikitables
    tables = re.findall(r'<table[^>]*wikitable[^>]*>(.*?)</table>', html, re.DOTALL | re.IGNORECASE)
    print(f"\n=== SECTION {section_idx} — {len(tables)} table(s) ===")

    for tbl_idx, tbl_html in enumerate(tables[:1]):  # just first table
        rows = re.findall(r'<tr[^>]*>(.*?)</tr>', tbl_html, re.DOTALL | re.IGNORECASE)
        print(f"\n  Table {tbl_idx}: {len(rows)} rows")

        for row_i, row in enumerate(rows[:4]):
            cells = re.findall(r'<(t[hd])([^>]*)>(.*?)</t[hd]>', row, re.DOTALL | re.IGNORECASE)
            print(f"  Row {row_i}:")
            col_pos = 0
            for tag, attrs_raw, inner in cells:
                cs_m = re.search(r'colspan=["\'](\d+)', attrs_raw)
                sc_m = re.search(r'scope=["\'](\w+)', attrs_raw)
                colspan = int(cs_m.group(1)) if cs_m else 1
                scope = sc_m.group(1) if sc_m else ''
                text = unescape(strip_tags(inner)).strip()[:50]
                print(f"    col_pos={col_pos} tag={tag} scope={scope!r} colspan={colspan} text={text!r}")
                col_pos += colspan
