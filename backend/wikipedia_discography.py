from html import unescape
from html.parser import HTMLParser
import re

_DISCOGRAPHY_SECTION_KEYWORDS = (
    "discography",
    "albums",
    "singles",
    "mixtapes",
    "eps",
    "ep",
    "studio albums",
    "collaborative albums",
    "compilation albums",
)

_SONG_SECTION_KEYWORDS = (
    "singles",
    "other charted songs",
    "guest appearances",
    "as lead artist",
    "as featured artist",
    "promotional singles",
    "songs",
)

_IGNORED_TITLES = {
    "title",
    "album details",
    "details",
    "peak chart positions",
    "notes",
    "label",
    "year",
    "released",
    "chart",
    "selected details",
    "us",
    "uk",
    "ultratop",
    "official charts company",
    "promusicae",
    "sverigetopplistan",
    "hitlisten",
    "vg-lista",
    "recorded music nz",
}

_BAD_TITLE_PATTERNS = (
    r"retrieved\s+[a-z]+\s+\d{1,2}",
    r"^main article",
    r"^released:",
    r"^label:",
    r"^format:",
    r"^with selected details",
    r"peak chart positions",
    r"certifications",
    r"chart watch",
    r"^discography\s+",
)


def is_discography_section(section_name):
    lowered = (section_name or "").strip().lower()
    return any(keyword in lowered for keyword in _DISCOGRAPHY_SECTION_KEYWORDS)


def is_song_discography_section(section_name):
    lowered = (section_name or "").strip().lower()
    return any(keyword in lowered for keyword in _SONG_SECTION_KEYWORDS)


def normalize_discography_title(title):
    text = unescape(title or "")
    text = re.sub(r"\[[^\]]*\]", "", text)
    text = re.sub(r"\((album|song|mixtape|ep|soundtrack|discography).*?\)", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^[\-\u2022\*\d\.\s]+", "", text)
    text = re.sub(r"\s+", " ", text).strip(" \t\r\n\"'")

    if not text:
        return ""

    lowered = text.lower()
    if lowered in _IGNORED_TITLES:
        return ""
    if lowered.startswith("list of "):
        return ""
    if lowered.endswith(" discography"):
        return ""
    if re.fullmatch(r"\d{4}", text):
        return ""
    if len(text) > 80:
        return ""
    if any(re.search(pattern, lowered) for pattern in _BAD_TITLE_PATTERNS):
        return ""
    if '"' in text and len(text.split()) > 5:
        return ""
    if ":" in text:
        return ""
    if lowered in {"billboard", "riaa", "mc", "lp", "cactus jack"}:
        return ""
    if any(phrase in lowered for phrase in ["recording industry", "formats", "digital download", "streaming"]):
        return ""

    return text


def extract_main_discography_article_title(html):
    if not html:
        return None

    match = re.search(
        r'Main article:\s*<a[^>]+title="([^"]+discography)"',
        html,
        flags=re.IGNORECASE,
    )
    if match:
        return unescape(match.group(1)).strip()
    return None


def collapse_whitespace(text):
    return re.sub(r"\s+", " ", unescape(text or "")).strip()


def normalize_group_label(text):
    value = collapse_whitespace(text)
    value = re.sub(r"\[[^\]]*\]", "", value).strip(" \t\r\n\"'")
    if not value:
        return ""

    lowered = value.lower()
    if lowered in _IGNORED_TITLES:
        return ""
    # Dash / placeholder values
    if re.fullmatch(r"[\-\u2013\u2014\u2012]+", value):
        return ""
    if lowered in {"tbd", "n/a", "none", "—", "-", "–"}:
        return ""
    # Pure year
    if re.fullmatch(r"(19|20)\d{2}", value):
        return ""
    # Pure number (chart position)
    if re.fullmatch(r"\d+", value):
        return ""
    # Peaked / chart / notes text
    if re.search(r"^\d+\s*[\(\[]", value):
        return ""
    if lowered.startswith("released:") or lowered.startswith("label:"):
        return ""
    # Certification language
    if any(term in lowered for term in [
        "riaa", "platinum", "gold", "silver", "certified",
        "certification", "certifications", "rmnz", "bpi",
        "mc:", "ifpi", "aria:", "×", "xplatinum", "xgold",
    ]):
        return ""
    # Non-album / standalone single
    if "non-album" in lowered or lowered in {"single", "singles"}:
        return "Singles"

    return value


def extract_song_title_from_cell_text(text):
    raw = collapse_whitespace(text)
    raw = re.sub(r"\[[^\]]*\]", "", raw)
    quoted = re.search(r'["“](.+?)["”]', raw)
    if quoted:
        return normalize_discography_title(quoted.group(1))

    raw = re.split(r"\s+\(featuring|\s+\(with|\s+-\s+", raw, maxsplit=1, flags=re.IGNORECASE)[0]
    return normalize_discography_title(raw)


class SongDiscographyHTMLParser(HTMLParser):
    """
    Parses Wikipedia singles discography tables into song entries with album grouping.

    Album grouping strategy:
      1. Detect the "Album" column from the header row using colspan-aware counting.
      2. Use that exact cell index on data rows (most accurate).
      3. If the data row is shorter than the detected index (missing optional cells like
         Certifications), fall back to a right-to-left scan — album is always the rightmost
         meaningful column on Wikipedia discography tables.
      4. Track _current_group across rows so rowspan-merged album cells are propagated to
         subsequent rows that omit the cell.
    """

    def __init__(self, section_name=None):
        super().__init__()
        self._section_name = collapse_whitespace(section_name or "")
        self._skip_depth = 0
        self._capture_link = False
        self._link_buffer = []
        self._italic_depth = 0
        self._table_depth = 0
        self._in_wikitable = False
        self._in_row = False
        self._current_cell = None
        self._current_row_cells = []
        self._entries = []
        self._seen = set()
        self._current_year = None
        # Column detection (reset per table)
        self._album_col_index = None   # absolute column position of Album column
        self._current_group = None     # last seen album name for rowspan fallback

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag in {"sup", "style", "script"}:
            self._skip_depth += 1
            return
        if self._skip_depth:
            return

        if tag == "table":
            self._table_depth += 1
            if "wikitable" in attrs_dict.get("class", ""):
                self._in_wikitable = True
                self._current_year = None
                self._album_col_index = None
                self._current_group = None
        elif tag == "tr" and self._in_wikitable:
            self._in_row = True
            self._current_row_cells = []
        elif tag in {"th", "td"} and self._in_row and self._in_wikitable:
            try:
                colspan = int(attrs_dict.get("colspan") or 1)
            except (ValueError, TypeError):
                colspan = 1
            self._current_cell = {
                "tag": tag,
                "scope": attrs_dict.get("scope", ""),
                "colspan": colspan,
                "text": [],
            }
        elif tag == "i":
            self._italic_depth += 1
        elif tag == "a":
            self._capture_link = True
            self._link_buffer = []

    def handle_endtag(self, tag):
        if tag in {"sup", "style", "script"} and self._skip_depth:
            self._skip_depth -= 1
            return
        if self._skip_depth:
            return

        if tag == "a" and self._capture_link:
            self._capture_link = False
            self._link_buffer = []
        elif tag == "i" and self._italic_depth:
            self._italic_depth -= 1
        elif tag in {"th", "td"} and self._current_cell is not None:
            self._current_cell["plain_text"] = collapse_whitespace("".join(self._current_cell["text"]))
            self._current_cell["raw_text"] = normalize_discography_title("".join(self._current_cell["text"]))
            self._current_row_cells.append(self._current_cell)
            self._current_cell = None
        elif tag == "tr" and self._in_row and self._in_wikitable:
            self._consume_row()
            self._in_row = False
            self._current_row_cells = []
        elif tag == "table" and self._table_depth:
            self._table_depth -= 1
            if self._table_depth == 0:
                self._in_wikitable = False

    def handle_data(self, data):
        if self._skip_depth:
            return
        if self._capture_link:
            self._link_buffer.append(data)
        if self._current_cell is not None:
            self._current_cell["text"].append(data)

    def _detect_album_col(self):
        """Scan a header row and record the absolute column position of the Album column.
        Uses colspan so that the resulting index matches physical data-row cell indices."""
        if self._album_col_index is not None:
            return  # already set for this table; don't overwrite with sub-headers

        col_pos = 0
        for cell in self._current_row_cells:
            colspan = cell.get("colspan", 1)
            label = (cell.get("plain_text") or "").lower().strip()
            if label in {"album", "albums"} or label.startswith("from the album"):
                self._album_col_index = col_pos
                return
            col_pos += colspan

        # Lenient pass: any header containing the word "album"
        col_pos = 0
        for cell in self._current_row_cells:
            colspan = cell.get("colspan", 1)
            label = (cell.get("plain_text") or "").lower().strip()
            if "album" in label and len(label) < 40:
                self._album_col_index = col_pos
                return
            col_pos += colspan

    def _consume_row(self):
        if not self._current_row_cells:
            return

        first_cell = self._current_row_cells[0]

        # Header row: detect the album column then skip
        if first_cell.get("scope") == "col":
            self._detect_album_col()
            return

        # Data row: extract song title
        title = extract_song_title_from_cell_text(
            first_cell.get("plain_text") or first_cell.get("raw_text") or ""
        )
        if not title:
            return

        # Extract year from the second cell
        year = None
        if len(self._current_row_cells) > 1:
            second_cell = self._current_row_cells[1]
            year_match = re.search(r"\b(19|20)\d{2}\b", second_cell.get("plain_text") or "")
            if year_match:
                year = int(year_match.group(0))
                self._current_year = year

        if year is None:
            year = self._current_year

        group_name = self._extract_group_name()
        self._add_entry(title, year, group_name)

    def _extract_group_name(self):
        """Return the album or release name for the current data row.

        Priority:
          1. Exact header-detected Album column (when the row has enough cells).
          2. Right-to-left scan of cells after title/year (handles rows where optional
             columns like Certifications are omitted, shifting the album cell left).
          3. _current_group fallback for rowspan-merged album cells.
        """
        n = len(self._current_row_cells)
        if n <= 2:
            return "Singles"

        # --- Strategy 1: use detected Album column index ---
        if self._album_col_index is not None and self._album_col_index < n:
            cell = self._current_row_cells[self._album_col_index]
            candidate = normalize_group_label(cell.get("plain_text") or cell.get("raw_text") or "")
            if candidate:
                self._current_group = candidate
                return candidate
            # Column exists but value is empty / "Non-album single" → true single
            return "Singles"

        # --- Strategy 2: right-to-left scan (skipping title=0, year=1) ---
        # Album is always the rightmost content column on Wikipedia singles tables.
        # Chart positions (numbers, dashes) and certifications (gold/platinum) are
        # filtered by normalize_group_label, so the first valid hit from the right
        # is the album name.
        for cell in reversed(self._current_row_cells[2:]):
            plain = (cell.get("plain_text") or "").strip()
            if not plain:
                continue
            candidate = normalize_group_label(plain)
            if candidate:
                self._current_group = candidate
                return candidate

        # --- Strategy 3: rowspan fallback ---
        # All cells were filtered (all dashes / numbers). This row is missing its album
        # cell because a previous row's album cell had rowspan.
        if self._current_group:
            return self._current_group

        return "Singles"

    def _add_entry(self, title, year, group_name):
        normalized = normalize_discography_title(title)
        if not normalized:
            return
        key = re.sub(r"[^a-z0-9]", "", normalized.lower())
        if not key or key in self._seen:
            return
        self._seen.add(key)
        self._entries.append({
            "title": normalized,
            "release_year": year,
            "group_name": group_name or "Singles",
            "group_release_year": year,
        })

    @property
    def entries(self):
        return self._entries


class DiscographyHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self._skip_depth = 0
        self._capture_link = False
        self._link_buffer = []
        self._titles = []
        self._seen = set()
        self._table_depth = 0
        self._in_wikitable = False
        self._in_row = False
        self._current_cell = None
        self._current_row_cells = []
        self._in_list_item = False
        self._list_item_buffer = []
        self._list_item_link_titles = []
        self._italic_depth = 0

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag in {"sup", "style", "script"}:
            self._skip_depth += 1
            return
        if self._skip_depth:
            return

        if tag == "table":
            self._table_depth += 1
            class_name = attrs_dict.get("class", "")
            if "wikitable" in class_name:
                self._in_wikitable = True
        elif tag == "tr" and self._in_wikitable:
            self._in_row = True
            self._current_row_cells = []
        elif tag in {"th", "td"} and self._in_row and self._in_wikitable:
            self._current_cell = {
                "tag": tag,
                "scope": attrs_dict.get("scope", ""),
                "text": [],
                "link_titles": [],
                "italic_link_titles": [],
            }
        elif tag == "li" and not self._in_wikitable:
            self._in_list_item = True
            self._list_item_buffer = []
            self._list_item_link_titles = []
        elif tag == "i":
            self._italic_depth += 1
        elif tag == "a":
            self._capture_link = True
            self._link_buffer = []

    def handle_endtag(self, tag):
        if tag in {"sup", "style", "script"} and self._skip_depth:
            self._skip_depth -= 1
            return
        if self._skip_depth:
            return

        if tag == "a" and self._capture_link:
            link_text = normalize_discography_title("".join(self._link_buffer))
            if link_text and self._current_cell is not None:
                self._current_cell["link_titles"].append(link_text)
                if self._italic_depth > 0:
                    self._current_cell["italic_link_titles"].append(link_text)
            if link_text and self._in_list_item:
                self._list_item_link_titles.append((link_text, self._italic_depth > 0))
            self._capture_link = False
            self._link_buffer = []
        elif tag == "i" and self._italic_depth:
            self._italic_depth -= 1
        elif tag in {"th", "td"} and self._current_cell is not None:
            raw_text = normalize_discography_title("".join(self._current_cell["text"]))
            self._current_cell["raw_text"] = raw_text
            self._current_row_cells.append(self._current_cell)
            self._current_cell = None
        elif tag == "tr" and self._in_row and self._in_wikitable:
            self._consume_row()
            self._in_row = False
            self._current_row_cells = []
        elif tag == "table" and self._table_depth:
            self._table_depth -= 1
            if self._table_depth == 0:
                self._in_wikitable = False
        elif tag == "li" and self._in_list_item:
            self._consume_list_item()
            self._in_list_item = False
            self._list_item_buffer = []
            self._list_item_link_titles = []

    def handle_data(self, data):
        if self._skip_depth:
            return
        if self._capture_link:
            self._link_buffer.append(data)
        if self._current_cell is not None:
            self._current_cell["text"].append(data)
        if self._in_list_item:
            self._list_item_buffer.append(data)

    def _consume_row(self):
        if not self._current_row_cells:
            return

        first_cell = self._current_row_cells[0]
        if first_cell.get("scope") == "col":
            return

        candidates = []
        candidates.extend(first_cell.get("italic_link_titles") or [])
        if first_cell.get("tag") == "th" and first_cell.get("scope") == "row":
            candidates.append(first_cell.get("raw_text") or "")
        elif first_cell.get("tag") == "td" and not candidates:
            raw_text = first_cell.get("raw_text") or ""
            if raw_text and len(raw_text.split()) <= 6:
                candidates.append(raw_text)

        for candidate in candidates:
            self._add_title(candidate)

    def _consume_list_item(self):
        raw_text = normalize_discography_title("".join(self._list_item_buffer))
        italic_links = [title for title, is_italic in self._list_item_link_titles if is_italic]

        candidates = []
        candidates.extend(italic_links)
        if raw_text and (italic_links or len(raw_text.split()) <= 6):
            candidates.append(raw_text)

        for candidate in candidates:
            self._add_title(candidate)

    def _add_title(self, title):
        normalized = normalize_discography_title(title)
        if not normalized:
            return
        key = re.sub(r"[^a-z0-9]", "", normalized.lower())
        if not key or key in self._seen:
            return
        self._seen.add(key)
        self._titles.append(normalized)

    @property
    def titles(self):
        return self._titles


def extract_discography_titles(html):
    parser = DiscographyHTMLParser()
    parser.feed(html or "")
    parser.close()
    return parser.titles


def extract_song_discography_entries(html, section_name=None):
    parser = SongDiscographyHTMLParser(section_name=section_name)
    parser.feed(html or "")
    parser.close()
    return parser.entries
