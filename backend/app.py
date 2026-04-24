# app.py
# -*- coding: utf-8 -*-
import os
import uuid
import re
import time
from html import unescape
from datetime import date
from flask import Flask, request, send_from_directory, jsonify
from database import db, init_db, find_or_create_user
from models import User, Track, Playlist
from flask_cors import CORS
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import mutagen
from mutagen.mp3 import MP3
from mutagen.flac import FLAC
from mutagen.oggvorbis import OggVorbis
from mutagen.wave import WAVE
import musicbrainzngs
import requests
from urllib.parse import quote
from sqlalchemy import text as sa_text

import sys

# Works in both dev and when packaged with PyInstaller
if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
init_db(app, base_dir=BASE_DIR)  # pass BASE_DIR here
CORS(app, origins="o")

UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
COVER_FOLDER = os.path.join(BASE_DIR, "covers")



os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(COVER_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["COVER_FOLDER"] = COVER_FOLDER

# Initialize MusicBrainz
musicbrainzngs.set_useragent("MusicApp", "1.0", "https://github.com/yourusername/musicapp")

MUSICBRAINZ_BASE_URL = "https://musicbrainz.org/ws/2"
MUSICBRAINZ_USER_AGENT = "MusicApp/1.0 (https://github.com/yourusername/musicapp)"
_artist_profile_cache = {}
_artist_discography_cache = {}


def _cache_get(cache, key):
    entry = cache.get(key)
    if not entry:
        return None
    if time.time() >= entry.get("expires_at", 0):
        cache.pop(key, None)
        return None
    return entry.get("value")


def _cache_set(cache, key, value, ttl_seconds=3600):
    cache[key] = {
        "value": value,
        "expires_at": time.time() + ttl_seconds,
    }


def musicbrainz_get_json(path, params=None, timeout=6):
    query = {"fmt": "json"}
    if params:
        query.update(params)

    try:
        response = requests.get(
            f"{MUSICBRAINZ_BASE_URL}{path}",
            params=query,
            headers={"User-Agent": MUSICBRAINZ_USER_AGENT},
            timeout=timeout,
        )
        if response.status_code != 200:
            return None
        return response.json()
    except requests.RequestException:
        return None


def wikipedia_get_json(params, timeout=6):
    query = {
        "format": "json",
        "origin": "*",
    }
    query.update(params)

    try:
        response = requests.get(
            "https://en.wikipedia.org/w/api.php",
            params=query,
            headers={"User-Agent": MUSICBRAINZ_USER_AGENT},
            timeout=timeout,
        )
        if response.status_code != 200:
            return None
        return response.json()
    except requests.RequestException:
        return None


def fetch_wikidata_entity(entity_id, timeout=6):
    if not entity_id:
        return None

    try:
        response = requests.get(
            f"https://www.wikidata.org/wiki/Special:EntityData/{quote(entity_id)}.json",
            headers={"User-Agent": MUSICBRAINZ_USER_AGENT},
            timeout=timeout,
        )
        if response.status_code != 200:
            return None
        return response.json()
    except requests.RequestException:
        return None


def extract_wikidata_date(entity, claim_id):
    if not entity:
        return None
    claims = ((entity.get("claims") or {}).get(claim_id) or [])
    if not claims:
        return None

    try:
        time_value = claims[0]["mainsnak"]["datavalue"]["value"]["time"]
        cleaned = str(time_value).lstrip("+").split("T", 1)[0]
        return cleaned if cleaned else None
    except Exception:
        return None


def strip_html_text(text):
    cleaned = re.sub(r"<sup[^>]*>.*?</sup>", "", text, flags=re.IGNORECASE | re.DOTALL)
    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
    cleaned = unescape(cleaned)
    cleaned = re.sub(r"\[[^\]]*\]", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def choose_best_wikipedia_artist_result(artist_name, results):
    normalized_artist = normalize_artist_name(artist_name).lower()
    best = None
    best_score = float("-inf")

    for result in results[:5]:
        title = (result.get("title") or "").strip()
        snippet = strip_html_text(result.get("snippet") or "").lower()
        title_lower = title.lower()
        score = 0

        if title_lower == normalized_artist:
            score += 10
        elif normalized_artist in title_lower:
            score += 5

        for keyword in ["musician", "singer", "rapper", "band", "artist", "songwriter", "record producer"]:
            if keyword in snippet:
                score += 4

        for bad_keyword in ["album", "song", "soundtrack", "single", "tour", "film"]:
            if bad_keyword in title_lower:
                score -= 8
            if bad_keyword in snippet:
                score -= 4

        if "may refer to" in snippet:
            score -= 10

        if score > best_score:
            best = result
            best_score = score

    return best or (results[0] if results else None)

def extract_metadata(filepath):
    """Extract metadata from audio file using mutagen"""
    try:
        # Determine file type and load metadata
        if filepath.lower().endswith('.mp3'):
            audio = MP3(filepath)
        elif filepath.lower().endswith('.flac'):
            audio = FLAC(filepath)
        elif filepath.lower().endswith('.ogg'):
            audio = OggVorbis(filepath)
        elif filepath.lower().endswith('.wav'):
            audio = WAVE(filepath)
        else:
            return None

        metadata = {
            'title': None,
            'artist': None,
            'album': None,
            'genre': None,
            'duration': int(audio.info.length) if hasattr(audio.info, 'length') else None,
            'bitrate': getattr(audio.info, 'bitrate', None),
            'year': None
        }

        # Extract metadata based on file type
        if hasattr(audio, 'tags') and audio.tags:
            if filepath.lower().endswith('.mp3'):
                metadata['title'] = audio.tags.get('TIT2', [None])[0]
                metadata['artist'] = audio.tags.get('TPE1', [None])[0]
                metadata['album'] = audio.tags.get('TALB', [None])[0]
                metadata['genre'] = audio.tags.get('TCON', [None])[0]
                year_tag = audio.tags.get('TDRC', [None])[0]
                metadata['year'] = str(year_tag) if year_tag else None
            else:
                # For other formats (FLAC, OGG, etc.)
                metadata['title'] = audio.tags.get('title', [None])[0]
                metadata['artist'] = audio.tags.get('artist', [None])[0]
                metadata['album'] = audio.tags.get('album', [None])[0]
                metadata['genre'] = audio.tags.get('genre', [None])[0]
                metadata['year'] = audio.tags.get('date', [None])[0]

        return metadata
    except Exception as e:
        print(f"Error extracting metadata from {filepath}: {e}")
        return None

def fetch_musicbrainz_cover_art(title, artist, album=None):
    """Fetch cover art from MusicBrainz API"""
    if not title or not artist:
        return None

    try:
        release_mbid = None

        # Strategy 1: If we have album information, search for releases directly
        if album:
            print(f"Searching for release: '{album}' by {artist}")
            release_result = musicbrainzngs.search_releases(
                album,
                artist=artist.split(',')[0].strip(),  # Use main artist
                limit=10  # Get more results
            )

            if release_result['release-list']:
                # Try each release until we find one with cover art
                for release in release_result['release-list']:
                    release_mbid = release['id']
                    release_title = release.get('title', 'Unknown')
                    print(f"Testing release: {release_title}")
                    
                    # Test if this release has cover art
                    cover_art_url = f"https://coverartarchive.org/release/{release_mbid}/front-500"
                    try:
                        test_response = requests.head(cover_art_url, timeout=5, allow_redirects=True)
                        if test_response.status_code == 200:
                            print(f"Found cover art for release: {release_title}")
                            break
                        else:
                            print(f"No cover art for release: {release_title}")
                            release_mbid = None
                    except:
                        print(f"Error testing release: {release_title}")
                        release_mbid = None

                if not release_mbid:
                    print("No releases with cover art found")

        # Strategy 2: Fallback - Search for recordings if no album-specific search worked
        if not release_mbid:
            print(f"Searching for recording: '{title}' by {artist}")
            result = musicbrainzngs.search_recordings(
                title,
                artist=artist.split(',')[0].strip(),  # Use main artist
                limit=5  # Get more results
            )

            if result['recording-list']:
                # Try each recording until we find one with cover art
                for recording in result['recording-list']:
                    # Try to get release MBID from the recording
                    if 'release-list' in recording and recording['release-list']:
                        for release in recording['release-list'][:3]:  # Try up to 3 releases per recording
                            release_mbid = release['id']
                            release_title = release.get('title', 'Unknown')
                            print(f"Testing release from recording: {release_title}")

                            # Test if this release has cover art
                            cover_art_url = f"https://coverartarchive.org/release/{release_mbid}/front-500"
                            try:
                                test_response = requests.head(cover_art_url, timeout=5, allow_redirects=True)
                                if test_response.status_code == 200:
                                    print(f"Found cover art for release: {release_title}")
                                    break
                                else:
                                    release_mbid = None
                            except:
                                release_mbid = None

                    if release_mbid:
                        break

                if not release_mbid:
                    print("No recordings with cover art found")

        if not release_mbid:
            print("No suitable release found")
            return None

        # Get cover art from Cover Art Archive
        cover_art_url = f"https://coverartarchive.org/release/{release_mbid}/front-500"
        print(f"Fetching cover art from: {cover_art_url}")
        response = requests.get(cover_art_url, timeout=10, allow_redirects=True)

        if response.status_code == 200:
            print(f"Cover art retrieved successfully ({len(response.content)} bytes)")
            return response.content
        else:
            print(f"Cover art not found for release {release_mbid} (status: {response.status_code})")
            return None

    except Exception as e:
        print(f"Error fetching cover art from MusicBrainz: {e}")
        return None

def save_cover_art(cover_data, artist, album):
    """Save cover art image and return the file path"""
    if not cover_data:
        return None

    try:
        # Create a unique filename based on album (preferred) or artist
        if album:
            safe_key = "".join(c for c in album if c.isalnum() or c in (' ', '-', '_')).rstrip()
            cover_filename = f"cover_album_{safe_key}.jpg"
        elif artist:
            # Extract main artist (before comma if featured artists)
            main_artist = artist.split(',')[0].strip()
            safe_key = "".join(c for c in main_artist if c.isalnum() or c in (' ', '-', '_')).rstrip()
            cover_filename = f"cover_artist_{safe_key}.jpg"
        else:
            return None

        cover_path = os.path.join(app.config["COVER_FOLDER"], cover_filename)

        # Save the image data directly (assuming it's already JPEG)
        with open(cover_path, 'wb') as f:
            f.write(cover_data)

        return cover_filename

    except Exception as e:
        print(f"Error saving cover art: {e}")
        return None


def normalize_artist_name(name):
    if not name:
        return "Unknown Artist"
    text = str(name)
    for token in [",", " feat.", " ft.", " featuring ", " & ", " x "]:
        if token in text:
            text = text.split(token)[0]
            break
    text = text.strip()
    return text or "Unknown Artist"


def normalize_title_for_match(title):
    if not title:
        return ""
    return "".join(ch.lower() for ch in str(title) if ch.isalnum())


def title_match_keys(title):
    """
    Build normalized title aliases so single and album versions map consistently.
    """
    if not title:
        return []

    raw = str(title).strip().lower()
    if not raw:
        return []

    keys = []
    seen = set()

    def add_key(text):
        key = normalize_title_for_match(text)
        if key and key not in seen:
            seen.add(key)
            keys.append(key)

    add_key(raw)

    no_paren = re.sub(r"[\(\[\{].*?[\)\]\}]", " ", raw)
    no_paren = re.sub(r"\s+", " ", no_paren).strip()
    add_key(no_paren)

    for source in [raw, no_paren]:
        for sep in [" - ", " – ", " — ", " / "]:
            if sep in source:
                add_key(source.split(sep, 1)[0])

    no_feat = re.sub(r"\b(feat\.?|ft\.?|featuring|with)\b.*$", "", no_paren).strip()
    add_key(no_feat)

    return keys


def lookup_owned_by_title(title, owned_by_title):
    for key in title_match_keys(title):
        meta = owned_by_title.get(key)
        if meta:
            return meta
    return None


def normalize_track_field(value):
    return normalize_title_for_match(value or "")


def build_track_signature(title, artist=None, album=None, duration=None):
    normalized_duration = int(duration or 0)
    return (
        normalize_track_field(title),
        normalize_track_field(artist),
        normalize_track_field(album),
        normalized_duration,
    )


def is_duplicate_track(existing_track, title, artist=None, album=None, duration=None):
    existing_signature = build_track_signature(
        existing_track.title,
        existing_track.artist,
        existing_track.album,
        existing_track.duration,
    )
    candidate_signature = build_track_signature(title, artist, album, duration)

    if existing_signature[:3] != candidate_signature[:3]:
        return False

    existing_duration = existing_signature[3]
    candidate_duration = candidate_signature[3]
    if existing_duration and candidate_duration:
        return abs(existing_duration - candidate_duration) <= 2

    return True


def find_duplicate_track(user_id, title, artist=None, album=None, duration=None):
    if not title:
        return None

    candidates = Track.query.filter_by(user_id=user_id, title=title).all()
    for candidate in candidates:
        if is_duplicate_track(candidate, title, artist, album, duration):
            return candidate

    # Fallback for inconsistent title formatting in metadata.
    normalized_title = normalize_track_field(title)
    additional_candidates = Track.query.filter_by(user_id=user_id).all()
    for candidate in additional_candidates:
        if normalize_track_field(candidate.title) != normalized_title:
            continue
        if is_duplicate_track(candidate, title, artist, album, duration):
            return candidate

    return None


def split_artist_credits(artist_text):
    if not artist_text:
        return []

    parts = re.split(r"\s*(?:,|feat\.|ft\.|featuring|&| x )\s*", str(artist_text), flags=re.IGNORECASE)
    cleaned = [normalize_artist_name(p) for p in parts if p and p.strip()]

    seen = set()
    unique = []
    for name in cleaned:
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(name)

    return unique


def compute_age(life_span):
    begin = (life_span or {}).get("begin")
    end = (life_span or {}).get("end")
    if not begin or len(begin) < 4:
        return None
    try:
        birth_year = int(begin[:4])
    except ValueError:
        return None

    try:
        end_year = int(end[:4]) if end and len(end) >= 4 else date.today().year
    except ValueError:
        end_year = date.today().year

    age = end_year - birth_year
    return age if age >= 0 else None


def fetch_wikipedia_profile(wikipedia_url):
    if not wikipedia_url:
        return {"bio": None, "image_url": None}

    try:
        page_title = wikipedia_url.rsplit("/", 1)[-1]
        summary_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{quote(page_title)}"
        response = requests.get(summary_url, timeout=8)
        if response.status_code != 200:
            return {"bio": None, "image_url": None}
        payload = response.json()
        return {
            "bio": payload.get("extract"),
            "image_url": (payload.get("thumbnail") or {}).get("source"),
        }
    except Exception:
        return {"bio": None, "image_url": None}


def fetch_wikipedia_profile_by_name(artist_name):
    if not artist_name:
        return {"bio": None, "image_url": None}

    try:
        search_response = requests.get(
            "https://en.wikipedia.org/w/api.php",
            params={
                "action": "query",
                "list": "search",
                "srsearch": f"{artist_name} musician",
                "format": "json",
                "utf8": 1,
                "srlimit": 1,
            },
            timeout=8,
        )
        if search_response.status_code != 200:
            return {"bio": None, "image_url": None}

        search_payload = search_response.json() or {}
        matches = ((search_payload.get("query") or {}).get("search") or [])
        if not matches:
            return {"bio": None, "image_url": None}

        page_title = matches[0].get("title")
        if not page_title:
            return {"bio": None, "image_url": None}

        summary_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{quote(page_title)}"
        summary_response = requests.get(summary_url, timeout=8)
        if summary_response.status_code != 200:
            return {"bio": None, "image_url": None}

        summary_payload = summary_response.json() or {}
        image = (summary_payload.get("originalimage") or {}).get("source")
        if not image:
            image = (summary_payload.get("thumbnail") or {}).get("source")

        return {
            "bio": summary_payload.get("extract"),
            "image_url": image,
        }
    except Exception:
        return {"bio": None, "image_url": None}


def fetch_artist_profile_from_musicbrainz(artist_name):
    # Keyless artist profile lookup using Wikipedia + Wikidata.
    try:
        cache_key = normalize_artist_name(artist_name).lower()
        cached = _cache_get(_artist_profile_cache, cache_key)
        if cached is not None:
            return cached

        search = wikipedia_get_json(
            {
                "action": "query",
                "list": "search",
                "srsearch": f'"{normalize_artist_name(artist_name)}" musician',
                "srlimit": 5,
            },
            timeout=6,
        )
        results = ((search or {}).get("query") or {}).get("search") or []
        if not results:
            return None

        selected_result = choose_best_wikipedia_artist_result(artist_name, results)
        page_title = (selected_result or {}).get("title")
        if not page_title:
            return None

        summary_response = requests.get(
            f"https://en.wikipedia.org/api/rest_v1/page/summary/{quote(page_title)}",
            headers={"User-Agent": MUSICBRAINZ_USER_AGENT},
            timeout=6,
        )
        if summary_response.status_code != 200:
            return None
        summary = summary_response.json() or {}

        page_info = wikipedia_get_json(
            {
                "action": "query",
                "prop": "pageprops",
                "titles": page_title,
            },
            timeout=6,
        )
        pages = ((page_info or {}).get("query") or {}).get("pages") or {}
        page = next(iter(pages.values()), {}) if pages else {}
        wikidata_id = ((page.get("pageprops") or {}).get("wikibase_item"))
        entity_payload = fetch_wikidata_entity(wikidata_id, timeout=6)
        entity = ((entity_payload or {}).get("entities") or {}).get(wikidata_id) if wikidata_id else None

        birth_date = extract_wikidata_date(entity, "P569")
        death_date = extract_wikidata_date(entity, "P570")
        age = compute_age({"begin": birth_date, "end": death_date})

        image_url = (summary.get("originalimage") or {}).get("source")
        if not image_url:
            image_url = (summary.get("thumbnail") or {}).get("source")

        tags = []
        description = summary.get("description")
        if description:
            tags.append(description)

        profile = {
            "mbid": fetch_musicbrainz_artist_mbid(artist_name),
            "wikipedia_title": page_title,
            "name": summary.get("title") or page_title or artist_name,
            "age": age,
            "bio": summary.get("extract"),
            "image_url": image_url,
            "country": None,
            "type": None,
            "disambiguation": description,
            "begin_date": birth_date,
            "end_date": death_date,
            "tags": tags,
        }
        _cache_set(_artist_profile_cache, cache_key, profile, ttl_seconds=3600)
        return profile
    except Exception as e:
        print(f"Wikipedia artist lookup failed for '{artist_name}': {e}")
        return None


def fetch_musicbrainz_release_groups(artist_mbid):
    """
    Fetch all release groups for an artist from MusicBrainz.
    Returns a list of dicts: {id, title, primary_type, secondary_types, release_year}.
    Results are cached for 1 hour.
    """
    cache_key = f"mb_rg::{artist_mbid}"
    cached = _cache_get(_artist_discography_cache, cache_key)
    if cached is not None:
        return cached

    all_groups = []
    limit = 100
    offset = 0
    first_page = True

    while True:
        if not first_page:
            time.sleep(1.0)  # respect MusicBrainz 1 req/sec rate limit
        first_page = False

        data = musicbrainz_get_json(
            "/release-group",
            params={"artist": artist_mbid, "limit": limit, "offset": offset},
        )
        if not data:
            break

        page = data.get("release-groups") or []
        total = data.get("release-group-count", 0)

        for rg in page:
            title = (rg.get("title") or "").strip()
            if not title:
                continue
            pt = rg.get("primary-type") or ""
            secondary = [s.lower() for s in (rg.get("secondary-types") or [])]
            first_date = rg.get("first-release-date") or ""
            release_year = None
            if len(first_date) >= 4:
                try:
                    release_year = int(first_date[:4])
                except ValueError:
                    pass
            all_groups.append({
                "id": rg.get("id") or "",
                "title": title,
                "primary_type": pt,
                "secondary_types": secondary,
                "release_year": release_year,
            })

        offset += len(page)
        if offset >= total or not page:
            break

    _cache_set(_artist_discography_cache, cache_key, all_groups, ttl_seconds=3600)
    return all_groups


def fetch_musicbrainz_artist_mbid(artist_name):
    """
    Resolve an artist name to a MusicBrainz artist MBID.
    Returns None if no suitable match is found.
    """
    normalized_name = normalize_artist_name(artist_name)
    if not normalized_name:
        return None

    cache_key = f"mb_artist::{normalized_name.lower()}"
    cached = _cache_get(_artist_profile_cache, cache_key)
    if cached is not None:
        return cached

    data = musicbrainz_get_json(
        "/artist",
        params={"query": f'artist:"{normalized_name}"', "limit": 5},
        timeout=8,
    )
    candidates = (data or {}).get("artists") or []
    if not candidates:
        _cache_set(_artist_profile_cache, cache_key, None, ttl_seconds=3600)
        return None

    normalized_lower = normalized_name.lower()

    def score_candidate(candidate):
        try:
            base_score = int(candidate.get("score") or 0)
        except (TypeError, ValueError):
            base_score = 0
        candidate_name = normalize_artist_name(candidate.get("name") or "").lower()
        exact_bonus = 50 if candidate_name == normalized_lower else 0
        return base_score + exact_bonus

    best = max(candidates, key=score_candidate)
    mbid = best.get("id")
    _cache_set(_artist_profile_cache, cache_key, mbid, ttl_seconds=3600)
    return mbid


GOOGLE_CLIENT_ID = "246868796255-a8bgcc7v21g956ghn2emcreh0ibp51d9.apps.googleusercontent.com"

@app.route("/api/auth/google", methods=["POST"])
def google_signin():
    token = request.json.get("token")

    try:
        payload = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )

        email = payload["email"]
        name = payload.get("name")
        picture = payload.get("picture")

        user = find_or_create_user(email, name, picture)

        return jsonify({"user": user})

    except ValueError:
        return jsonify({"error": "Invalid token"}), 401


@app.route('/test-db')
def test_db():
    try:
        db.session.execute(db.text('SELECT 1'))
        return {'status': 'success', 'message': 'Database connected!'}, 200
    except Exception as e:
        return {'status': 'error', 'message': str(e)}, 500


@app.route("/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    unique_name = f"{uuid.uuid4()}_{file.filename}"
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], unique_name)

    # New file - save it and process
    file.save(filepath)

    try:
        # Extract metadata from the audio file
        metadata = extract_metadata(filepath)

        # Use metadata if available, otherwise fall back to filename
        title = metadata['title'] if metadata and metadata['title'] else os.path.splitext(file.filename)[0]
        artist = metadata['artist'] if metadata and metadata['artist'] else None
        album = metadata['album'] if metadata and metadata['album'] else None
        genre = metadata['genre'] if metadata and metadata['genre'] else None
        duration = metadata['duration'] if metadata and metadata['duration'] else None
        bitrate = metadata['bitrate'] if metadata and metadata['bitrate'] else None
        year = metadata['year'] if metadata and metadata['year'] else None

        duplicate_track = find_duplicate_track(1, title, artist, album, duration)
        if duplicate_track:
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({
                "message": "Duplicate song skipped",
                "filename": file.filename,
                "track_id": duplicate_track.track_id,
                "duplicate": True,
            }), 200

        # Create track record
        track = Track(
            file_path=filepath,
            title=title,
            artist=artist,
            album=album,
            genre=genre,
            duration=duration,
            bitrate=bitrate,
            year=year,
            cover_art_path=None,  # Will be set after fetching
            user_id=1  # replace later with logged-in user
        )
        db.session.add(track)
        db.session.commit()

        # Fetch cover art from MusicBrainz if we have title and artist
        cover_art_path = None
        if title and artist:
            print(f"Fetching cover art for: '{title}' by {artist}" + (f" from album '{album}'" if album else ""))
            cover_data = fetch_musicbrainz_cover_art(title, artist, album)
            if cover_data:
                cover_art_path = save_cover_art(cover_data, artist, album)
                if cover_art_path:
                    # Update ALL tracks with the same album (or same main artist if no album)
                    if album:
                        tracks_to_update = Track.query.filter_by(album=album).all()
                    else:
                        main_artist = artist.split(',')[0].strip()
                        tracks_to_update = Track.query.filter(Track.artist.like(f"{main_artist}%")).all()
                    for track in tracks_to_update:
                        track.cover_art_path = cover_art_path
                    db.session.commit()
                    print(f"Cover art updated for {len(tracks_to_update)} tracks with album '{album}'" if album else f"Cover art updated for {len(tracks_to_update)} tracks by artist '{main_artist}'")
            else:
                print(f"No cover art found for '{title}' by {artist}")

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

    return jsonify({"filename": unique_name})


@app.route("/music/<filename>")
def serve_music(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

@app.route("/covers/<filename>")
def serve_cover(filename):
    response = send_from_directory(app.config["COVER_FOLDER"], filename)
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route("/tracks", methods=["GET"])
def get_tracks():
    tracks = Track.query.filter_by(user_id=1).all()
    # Filter tracks to only include those whose files actually exist
    # and remove duplicates based on normalized song identity
    valid_tracks = []
    seen_signatures = set()

    for t in tracks:
        if os.path.exists(t.file_path):
            track_signature = build_track_signature(t.title, t.artist, t.album, t.duration)
            if track_signature in seen_signatures:
                continue
            seen_signatures.add(track_signature)
            
            # Check if cover art file actually exists
            cover_art_url = None
            if t.cover_art_path:
                cover_art_full_path = os.path.join(app.config["COVER_FOLDER"], t.cover_art_path)
                if os.path.exists(cover_art_full_path):
                    cover_art_url = f"http://127.0.0.1:5000/covers/{t.cover_art_path}"
                else:
                    # Cover art file is missing - clear the path in database
                    print(f"Cover art file missing for track {t.track_id}, clearing database reference")
                    t.cover_art_path = None
                    db.session.commit()
            
            valid_tracks.append({
                "track_id": t.track_id,
                "title": t.title,
                "filename": os.path.basename(t.file_path),
                "file_path": t.file_path,
                "artist": t.artist,
                "album": t.album,
                "genre": t.genre,
                "duration": t.duration,
                "bitrate": t.bitrate,
                "year": t.year,
                "cover_art_url": cover_art_url
            })
        elif not os.path.exists(t.file_path):
            # Clean up orphaned database entries and associated cover art
            print(f"Removing orphaned track from database: {t.title} (file: {t.file_path})")
            
            # Check if cover art is still used by other tracks before deleting
            if t.cover_art_path:
                # Count tracks that share the same cover art file
                other_tracks_using_cover = Track.query.filter_by(cover_art_path=t.cover_art_path).count()
                if other_tracks_using_cover <= 1:  # Only this track uses it
                    cover_art_full_path = os.path.join(app.config["COVER_FOLDER"], t.cover_art_path)
                    if os.path.exists(cover_art_full_path):
                        try:
                            os.remove(cover_art_full_path)
                            print(f"Deleted cover art file: {t.cover_art_path}")
                        except Exception as e:
                            print(f"Error deleting cover art file {t.cover_art_path}: {e}")
            
            # Remove the track from database
            db.session.delete(t)
            db.session.commit()
        # If file exists but signature already seen, this is a duplicate - skip it
    return jsonify(valid_tracks), 200
    tracks = Track.query.filter_by(user_id=1).all()

    return jsonify([
        {
            "track_id": t.track_id,
            "title": t.title,
            "filename": os.path.basename(t.file_path),
            "artist": t.artist,
            "album": t.album,
            "genre": t.genre
        }
        for t in tracks
    ])


@app.route("/artists", methods=["GET"])
def get_artists():
    tracks = Track.query.filter_by(user_id=1).all()
    artist_groups = {}
    feature_counts = {}
    feature_signatures = {}

    for track in tracks:
        credits = split_artist_credits(track.artist)
        normalized = credits[0] if credits else "Unknown Artist"
        key = normalized.lower()
        track_signature = build_track_signature(track.title, normalized, track.album, track.duration)

        if key not in artist_groups:
            artist_groups[key] = {
                "name": normalized,
                "display_name": normalized,
                "track_signatures": set(),
                "owned_titles": [],
            }

        group = artist_groups[key]
        if track_signature not in group["track_signatures"]:
            group["track_signatures"].add(track_signature)
        if track.title and normalize_title_for_match(track.title) not in {normalize_title_for_match(title) for title in group["owned_titles"]}:
            group["owned_titles"].append(track.title)

        for featured_artist in credits[1:]:
            f_key = featured_artist.lower()
            feature_signature = build_track_signature(track.title, featured_artist, track.album, track.duration)
            if f_key not in feature_signatures:
                feature_signatures[f_key] = set()
            if feature_signature in feature_signatures[f_key]:
                continue
            feature_signatures[f_key].add(feature_signature)
            feature_counts[f_key] = feature_counts.get(f_key, 0) + 1

    payload = []
    for _, info in artist_groups.items():
        profile = fetch_artist_profile_from_musicbrainz(info["name"]) or {}

        birth_date = profile.get("begin_date")
        death_date = profile.get("end_date")
        bio = profile.get("bio")
        image_url = profile.get("image_url")

        payload.append({
            "mbid": profile.get("mbid"),
            "wikipedia_title": profile.get("wikipedia_title"),
            "name": profile.get("name") or info["display_name"],
            "age": profile.get("age"),
            "bio": bio,
            "image_url": image_url,
            "birth_date": birth_date,
            "death_date": death_date,
            "track_count": len(info["track_signatures"]),
            "feature_count": feature_counts.get(info["name"].lower(), 0),
            "owned_titles": sorted(list(set(info["owned_titles"]))),
        })

    payload.sort(key=lambda a: (-a.get("track_count", 0), a.get("name") or ""))
    return jsonify(payload), 200


@app.route("/artists/<artist_mbid>/discography", methods=["GET"])
def get_artist_discography(artist_mbid):
    artist_name = request.args.get("name", "")
    if not artist_name:
        return jsonify({"error": "Missing required query param: name"}), 400

    normalized_artist = normalize_artist_name(artist_name)
    artist_tracks = Track.query.filter(
        Track.user_id == 1,
        Track.artist.isnot(None),
        Track.artist.ilike(f"{normalized_artist}%")
    ).all()

    # Build owned-album lookup (album title → track metadata).
    owned_albums = {}  # normalized album title → {track_id, stream_url, release_year, cover_art_url}
    owned_by_title = {}  # normalized song title → {track_id, stream_url, release_year, album}
    for t in artist_tracks:
        if not t.title:
            continue
        title_keys = title_match_keys(t.title)
        if not title_keys:
            continue
        try:
            release_year = int(str(t.year)[:4]) if t.year else None
        except ValueError:
            release_year = None
        track_meta = {
            "title": t.title,
            "track_id": t.track_id,
            "stream_url": f"http://127.0.0.1:5000/music/{quote(os.path.basename(t.file_path))}",
            "release_year": release_year,
            "album": t.album,
        }
        for title_key in title_keys:
            if title_key not in owned_by_title:
                owned_by_title[title_key] = track_meta
        if t.album:
            album_key = normalize_title_for_match(t.album)
            if album_key and album_key not in owned_albums:
                cover_art_url = None
                if t.cover_art_path:
                    cover_art_full_path = os.path.join(app.config["COVER_FOLDER"], t.cover_art_path)
                    if os.path.exists(cover_art_full_path):
                        cover_art_url = f"http://127.0.0.1:5000/covers/{quote(t.cover_art_path)}"
                owned_albums[album_key] = {
                    "track_id": t.track_id,
                    "stream_url": f"http://127.0.0.1:5000/music/{quote(os.path.basename(t.file_path))}",
                    "release_year": release_year,
                    "cover_art_url": cover_art_url,
                }

    # Fetch MusicBrainz release groups.
    mb_groups = []
    if artist_mbid and artist_mbid != "unknown":
        try:
            mb_groups = fetch_musicbrainz_release_groups(artist_mbid)
        except Exception as e:
            print(f"MusicBrainz release group fetch failed for {artist_mbid}: {e}")

    # Separate albums/EPs from singles (skip compilations/live).
    skip_secondary = {"compilation", "live", "dj-mix", "mixtape/street"}
    album_rgs = sorted(
        [
            rg for rg in mb_groups
            if (rg["primary_type"] or "").lower() in ("album", "ep")
            and not skip_secondary.intersection(rg["secondary_types"])
        ],
        key=lambda r: (r["release_year"] is None, r["release_year"] or 9999, r["title"].lower()),
    )
    single_rgs = sorted(
        [rg for rg in mb_groups if (rg["primary_type"] or "").lower() == "single"],
        key=lambda r: (r["release_year"] is None, r["release_year"] or 9999, r["title"].lower()),
    )

    # -- Albums section --
    # Each album release group = one item. owned = user has at least one track from it.
    album_items = []
    mb_album_keys = set()
    for rg in album_rgs:
        key = normalize_title_for_match(rg["title"])
        mb_album_keys.add(key)
        owned_meta = owned_albums.get(key)
        cover_art_url = None
        if rg.get("id"):
            cover_art_url = f"https://coverartarchive.org/release-group/{rg['id']}/front-250"
        if owned_meta and owned_meta.get("cover_art_url"):
            cover_art_url = owned_meta["cover_art_url"]
        album_items.append({
            "title": rg["title"],
            "primary_type": rg["primary_type"],
            "release_group_id": rg["id"],
            "owned": owned_meta is not None,
            "track_id": owned_meta["track_id"] if owned_meta else None,
            "stream_url": owned_meta["stream_url"] if owned_meta else None,
            "release_year": rg["release_year"],
            "cover_art_url": cover_art_url,
        })

    album_items.sort(key=lambda i: (
        i.get("release_year") is None,
        i.get("release_year") or 9999,
        (i.get("title") or "").lower(),
    ))

    # -- Singles section --
    # Each single release group = one item + any owned tracks not already covered.
    mb_single_keys = set()
    singles_items = []
    seen_single_titles = set()
    for rg in single_rgs:
        title = rg["title"]
        for key in title_match_keys(title):
            mb_single_keys.add(key)
        title_key = normalize_title_for_match(title)
        if title_key in seen_single_titles:
            continue
        seen_single_titles.add(title_key)
        owned_meta = lookup_owned_by_title(rg["title"], owned_by_title)
        singles_items.append({
            "title": title,
            "primary_type": "Single",
            "owned": owned_meta is not None,
            "track_id": owned_meta["track_id"] if owned_meta else None,
            "stream_url": owned_meta["stream_url"] if owned_meta else None,
            "release_year": rg["release_year"] or (owned_meta["release_year"] if owned_meta else None),
        })

    # Owned tracks not covered by any MB album or single → add to singles.
    added_fallback_track_ids = set()
    for owned_meta in owned_by_title.values():
        track_id = owned_meta.get("track_id")
        if track_id in added_fallback_track_ids:
            continue
        added_fallback_track_ids.add(track_id)

        album_key = normalize_title_for_match(owned_meta.get("album") or "")
        in_mb_album = bool(album_key) and album_key in mb_album_keys
        in_mb_single = any(k in mb_single_keys for k in title_match_keys(owned_meta.get("title")))

        owned_title_key = normalize_title_for_match(owned_meta.get("title"))
        if owned_title_key in seen_single_titles:
            continue
        if not in_mb_album and not in_mb_single:
            seen_single_titles.add(owned_title_key)
            singles_items.append({
                "title": owned_meta["title"],
                "primary_type": "Single",
                "owned": True,
                "track_id": owned_meta["track_id"],
                "stream_url": owned_meta["stream_url"],
                "release_year": owned_meta["release_year"],
            })

    singles_items.sort(key=lambda i: (
        i.get("release_year") is None,
        i.get("release_year") or 9999,
        (i.get("title") or "").lower(),
    ))

    groups = []
    if album_items:
        groups.append({
            "type": "album",
            "name": "Albums",
            "release_year": None,
            "items": album_items,
        })
    if singles_items:
        groups.append({
            "type": "single",
            "name": "Singles",
            "release_year": None,
            "items": singles_items,
        })

    return jsonify({
        "artist": normalized_artist,
        "groups": groups,
    }), 200


@app.route("/artists/<artist_mbid>/release-group/<release_group_id>/tracks", methods=["GET"])
def get_release_group_tracks(artist_mbid, release_group_id):
    """
    Fetch the full tracklist for a MusicBrainz release group.
    Returns tracks with owned/missing status based on the user's library.
    Uses the first official release found for the release group.
    """
    artist_name = request.args.get("name", "")

    cache_key = f"rg_tracks::{release_group_id}"
    cached_tracks = _cache_get(_artist_discography_cache, cache_key)

    if cached_tracks is None:
        # Fetch releases for this release group (pick first official one).
        data = musicbrainz_get_json(
            "/release",
            params={
                "release-group": release_group_id,
                "inc": "recordings",
                "status": "official",
                "limit": 5,
            },
            timeout=20,
        )

        if not data or not data.get("releases"):
            return jsonify({"error": "No release found for this release group"}), 404

        # Prefer releases with the most tracks (avoid single-disc partial releases).
        releases = data["releases"]
        best_release = max(
            releases,
            key=lambda r: sum(m.get("track-count", 0) for m in (r.get("media") or [])),
        )

        raw_tracks = []
        for medium in (best_release.get("media") or []):
            for track in (medium.get("tracks") or []):
                title = (track.get("title") or "").strip()
                if not title:
                    continue
                length_ms = track.get("length") or (track.get("recording") or {}).get("length") or 0
                raw_tracks.append({
                    "number": track.get("number") or track.get("position"),
                    "title": title,
                    "recording_id": (track.get("recording") or {}).get("id"),
                    "length_ms": length_ms,
                })

        _cache_set(_artist_discography_cache, cache_key, raw_tracks, ttl_seconds=3600)
        cached_tracks = raw_tracks

    # Match against owned tracks in the user's library.
    normalized_artist = normalize_artist_name(artist_name) if artist_name else ""
    owned_by_title = {}
    if normalized_artist:
        artist_tracks = Track.query.filter(
            Track.user_id == 1,
            Track.artist.isnot(None),
            Track.artist.ilike(f"{normalized_artist}%"),
        ).all()
        for t in artist_tracks:
            if not t.title:
                continue
            track_meta = {
                "track_id": t.track_id,
                "stream_url": f"http://127.0.0.1:5000/music/{quote(os.path.basename(t.file_path))}",
            }
            for key in title_match_keys(t.title):
                if key not in owned_by_title:
                    owned_by_title[key] = track_meta

    tracks = []
    for raw in cached_tracks:
        owned_meta = lookup_owned_by_title(raw["title"], owned_by_title)
        length_ms = raw.get("length_ms") or 0
        duration_str = f"{length_ms // 60000}:{(length_ms % 60000) // 1000:02d}" if length_ms else None
        tracks.append({
            "number": raw["number"],
            "title": raw["title"],
            "duration": duration_str,
            "owned": owned_meta is not None,
            "track_id": owned_meta["track_id"] if owned_meta else None,
            "stream_url": owned_meta["stream_url"] if owned_meta else None,
        })

    return jsonify({"tracks": tracks}), 200


@app.route("/playlists/<int:playlist_id>", methods=["PUT"])
def update_playlist(playlist_id):
    playlist = db.session.get(Playlist, playlist_id)
    if not playlist:
        return jsonify({"error": "Playlist not found"}), 404
    try:
        playlist.name = request.form.get('name', playlist.name)
        playlist.description = request.form.get('description', playlist.description)
        db.session.commit()
        return jsonify({"playlist_id": playlist.playlist_id, "name": playlist.name, "description": playlist.description}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route("/playlists/<int:playlist_id>", methods=["DELETE"])
def delete_playlist(playlist_id):
    playlist = db.session.get(Playlist, playlist_id)
    if not playlist:
        return jsonify({"error": "Playlist not found"}), 404
    try:
        db.session.delete(playlist)
        db.session.commit()
        return jsonify({"message": "Playlist deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route("/playlist", methods=["POST"])
def create_playlist():
    data = request.get_json()

    if not data or "name" not in data:
        return jsonify({"error": "Invalid request"}), 400

    try:
        playlist = Playlist(
            name=data["name"],
            description=data.get("description"),
            user_id=1
        )

        db.session.add(playlist)
        db.session.commit()

        return jsonify({
            "playlist_id": playlist.playlist_id,
            "name": playlist.name
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/playlists", methods=["GET"])
def get_playlists():
    playlists = Playlist.query.filter_by(user_id=1).order_by(Playlist.playlist_id.desc()).all()

    result = []
    for p in playlists:
        cover_tracks = db.session.execute(
            db.text("""
                SELECT t.cover_art_path FROM tracks t
                JOIN playlist_tracks pt ON t.track_id = pt.track_id
                WHERE pt.playlist_id = :pid
                ORDER BY pt.added_at ASC NULLS LAST
                LIMIT 4
            """),
            {"pid": p.playlist_id}
        ).fetchall()

        cover_urls = [
            f"http://127.0.0.1:5000/covers/{quote(row.cover_art_path)}"
            for row in cover_tracks
            if row.cover_art_path and os.path.exists(os.path.join(app.config["COVER_FOLDER"], row.cover_art_path))
        ]

        result.append({
            "playlist_id": p.playlist_id,
            "name": p.name,
            "description": p.description,
            "track_count": len(p.tracks),
            "cover_urls": cover_urls
        })

    return jsonify(result)

@app.route("/playlist/<int:playlist_id>/add-track", methods=["POST"])
def add_track_to_playlist(playlist_id):
    data = request.get_json()
    track_id = data.get("track_id")

    playlist = db.session.get(Playlist, playlist_id)
    track = db.session.get(Track, track_id)

    if not playlist or not track:
        return jsonify({"error": "Playlist or Track not found"}), 404

    if track not in playlist.tracks:
        playlist.tracks.append(track)

    db.session.commit()

    return jsonify({"message": "Track added to playlist"})

@app.route("/playlists/<int:playlist_id>", methods=["GET"])
def get_playlist(playlist_id):
    playlist = db.session.get(Playlist, playlist_id)
    if not playlist:
        return jsonify({"error": "Playlist not found"}), 404

    sorted_tracks = db.session.execute(
        sa_text("""
            SELECT t.* FROM tracks t
            JOIN playlist_tracks pt ON t.track_id = pt.track_id
            WHERE pt.playlist_id = :playlist_id
            ORDER BY pt.added_at ASC
        """),
        {"playlist_id": playlist_id}
    ).fetchall()

    tracks = []
    for t in sorted_tracks:
        cover_art_url = None
        if t.cover_art_path:
            cover_art_full_path = os.path.join(app.config["COVER_FOLDER"], t.cover_art_path)
            if os.path.exists(cover_art_full_path):
                cover_art_url = f"http://127.0.0.1:5000/covers/{quote(t.cover_art_path)}"

        tracks.append({
            "track_id": t.track_id,
            "title": t.title,
            "artist": t.artist,
            "album": t.album,
            "duration": t.duration,
            "filename": os.path.basename(t.file_path),
            "cover_art_url": cover_art_url
        })

    return jsonify({
        "playlist_id": playlist.playlist_id,
        "name": playlist.name,
        "description": playlist.description,
        "track_count": len(tracks),
        "tracks": tracks
    }), 200


@app.route("/playlists/<int:playlist_id>/remove-track", methods=["POST"])
def remove_track_from_playlist(playlist_id):
    data = request.get_json()
    track_id = data.get("track_id")

    playlist = db.session.get(Playlist, playlist_id)
    track = db.session.get(Track, track_id)

    if not playlist or not track:
        return jsonify({"error": "Playlist or Track not found"}), 404

    if track in playlist.tracks:
        playlist.tracks.remove(track)
        db.session.commit()

    return jsonify({"message": "Track removed from playlist"})

@app.route("/tracks/<int:track_id>", methods=["DELETE"])
def delete_track(track_id):
    track = db.session.get(Track, track_id)
    if not track:
        return jsonify({"error": "Track not found"}), 404
    try:
        if os.path.exists(track.file_path):
            os.remove(track.file_path)
        if track.cover_art_path:
            other = Track.query.filter_by(cover_art_path=track.cover_art_path).count()
            if other <= 1:
                cover_full = os.path.join(app.config["COVER_FOLDER"], track.cover_art_path)
                if os.path.exists(cover_full):
                    os.remove(cover_full)
        db.session.delete(track)
        db.session.commit()
        return jsonify({"message": "Track deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
 # When running as a script or PyInstaller EXE, start the server
 app.run(host="127.0.0.1", port=5000, debug=False)