#!/usr/bin/env python3
"""
Cost Rental Ireland - listings scraper (rich + accurate).

Source: affordablehomes.ie (a.k.a. newstarterhomes.ie), the government affordable-homes
portal aggregating cost-rental listings from LDA, Tuath, Respond, Clúid and others.

Strategy (all plain HTTP + regex; no headless browser needed):
  1. LIST pages (/rent/?page=N)  -> name, rent, status, location  (authoritative status)
  2. CALENDAR page (/rent/calendar/) -> the real detail-page URLs (/rent/<slug>/)
  3. Each DETAIL page (/rent/<slug>/) -> description, BER, property type, image,
     closing/opening date.
Then we match list rows to detail pages (by slug/name) to produce rich, accurate
listings and write data/listings.json, preserving the static providers / eligibility /
market_comparison reference blocks.

Runs in GitHub Actions on a schedule so it can never be lost with a device again.
Fails safe: if it scrapes 0 listings it aborts without overwriting good data.
"""

import json
import re
import sys
import time
import urllib.request
from datetime import datetime, timezone
from html import unescape
from html.parser import HTMLParser
from pathlib import Path

BASE = "https://affordablehomes.ie"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Section config: cost rental (/rent/) and affordable purchase (/buy/).
SECTIONS = {
    "rent": {
        "list_url": BASE + "/rent/",
        "calendar_url": BASE + "/rent/calendar/",
        "detail_prefix": "/rent/",
        "data_file": DATA_DIR / "listings.json",
        "id_prefix": "ah-",
        "price_key": "rent",
    },
    "buy": {
        "list_url": BASE + "/buy/",
        "calendar_url": BASE + "/buy/calendar/",
        "detail_prefix": "/buy/",
        "data_file": DATA_DIR / "purchase.json",
        "id_prefix": "buy-",
        "price_key": "price",
    },
}

# Kept for backwards references in older helpers.
LIST_URL = SECTIONS["rent"]["list_url"]
CALENDAR_URL = SECTIONS["rent"]["calendar_url"]
DATA_FILE = SECTIONS["rent"]["data_file"]
UA = "Mozilla/5.0 (compatible; CostRentalBot/2.0; +https://costrental.ie)"

STATUS_MAP = {
    "applications open": ("open", "Applications Open"),
    "applications now open": ("open", "Applications Now Open"),
    "coming soon": ("coming_soon", "Coming Soon"),
    "applications closed": ("closed", "Applications Closed"),
}

PROVIDER = "AffordableHomes.ie"
PROVIDER_URL = "https://affordablehomes.ie"

# Rough market-rent estimates per county for the savings calculation (conservative).
MARKET_RENT_BY_COUNTY = {
    "Dublin": 2300, "Kildare": 1800, "Wicklow": 2000, "Meath": 1700,
    "Cork": 1700, "Galway": 1600, "Limerick": 1500, "Westmeath": 1300,
    "Louth": 1400, "Waterford": 1400, "Wexford": 1300, "Kerry": 1300,
}


def fetch(url: str, retries: int = 3) -> str:
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1 + attempt)
    raise RuntimeError(f"fetch failed for {url}: {last}")


# ---------------------------------------------------------------------------
# LIST pages: name / rent / status / location
# ---------------------------------------------------------------------------
class _TextParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        t = data.strip()
        if t:
            self.parts.append(t)


STATUS_ALT = r"Applications Now Open|Applications Open|Coming Soon|Applications Closed"
CARD_RE = re.compile(
    r"Prices starting from\s*€?(?P<price>[\d,]+)?\s*"
    r"Status\s*(?P<status>" + STATUS_ALT + r")\s*"
    r"(?:Building Energy Rating)?\s*"
    r"Location\s*(?P<location>.+?)"
    r"(?=Read More|Listed:|Prices starting from|$)"
)
NAV_JUNK_RE = re.compile(
    r"(New starter Homes.*?county\.|Map\s*View|Calendar\s*View|"
    r"Showing\s+\d+\s+to\s+\d+\s+of\s+\d+\s+properties|Read More|Listed:\s*[\d/]+)",
    re.DOTALL,
)


def _clean(raw: str) -> str:
    return NAV_JUNK_RE.sub("", raw).strip(" -,\u00a0").strip()


def county_from_location(location: str) -> str:
    m = re.search(r"Co\.\s*([A-Za-z]+)", location)
    if m:
        return m.group(1)
    if "Dublin" in location:
        return "Dublin"
    return ""


def parse_list_page(page_text: str):
    rows = []
    prev_end = 0
    for i, m in enumerate(CARD_RE.finditer(page_text)):
        name = _clean(page_text[(0 if i == 0 else prev_end):m.start()])
        prev_end = m.end()
        if not name or len(name) < 2:
            continue
        price = m.group("price")
        status, status_text = STATUS_MAP.get(
            m.group("status").strip().lower(), ("open", m.group("status").strip())
        )
        location = _clean(m.group("location"))
        rows.append({
            "name": name,
            "rent": int(price.replace(",", "")) if price else None,
            "status": status,
            "status_text": status_text,
            "location": location,
            "county": county_from_location(location),
        })
    return rows


def scrape_list(list_url=LIST_URL):
    rows, seen, page, total = [], set(), 1, None
    while page <= 30:
        url = list_url if page == 1 else f"{list_url}?page={page}"
        p = _TextParser(); p.feed(fetch(url))
        flat = "".join(p.parts)
        if total is None:
            mt = re.search(r"of\s+(\d+)\s+properties", flat)
            total = int(mt.group(1)) if mt else None
        page_rows = parse_list_page(flat)
        if not page_rows:
            break
        new = 0
        for r in page_rows:
            key = (r["name"], r["location"], r["rent"], r["status"])
            if key in seen:
                continue
            seen.add(key); rows.append(r); new += 1
        if (total and len(rows) >= total) or new == 0:
            break
        page += 1
        time.sleep(0.4)
    return rows, total


# ---------------------------------------------------------------------------
# DETAIL pages: description / image / BER / property type / dates
# ---------------------------------------------------------------------------
def detail_slug_urls(calendar_url=CALENDAR_URL, prefix="/rent/"):
    html = fetch(calendar_url)
    esc = re.escape(prefix)
    links = [l for l in dict.fromkeys(re.findall(rf'href="({esc}[^"/][^"]*/)"', html))
             if l not in (f"{prefix}map/", f"{prefix}calendar/")]
    return links


def _detail_text(url):
    p = _TextParser(); p.feed(fetch(url))
    return "".join(p.parts), fetch(url)  # (flattened text, raw html)


PROVIDER_LABEL_RE = re.compile(
    r'<h3[^>]*>(?:Approved Housing Body|Landlord|Local Authority|Managing Agent|Managed by)</h3>\s*'
    r'<p[^>]*>([^<]+)</p>',
    re.IGNORECASE,
)


def detect_provider(html, flat, description):
    """Return the real housing body/provider for a listing."""
    m = PROVIDER_LABEL_RE.search(html)
    if m:
        return m.group(1).strip()
    # Fallback: infer from description text.
    text = (description or "") + " " + flat[:400]
    low = text.lower()
    if "land development agency" in low or re.search(r'\blda\b', low):
        return "Land Development Agency"
    if "clúid" in low or "cluid" in low:
        return "Clúid Housing"
    if "tuath" in low:
        return "Tuath Housing"
    if "respond" in low:
        return "Respond Housing"
    if "city council" in low or "county council" in low:
        return "Local Authority"
    return "AffordableHomes.ie"


def parse_detail(url):
    p = _TextParser(); html = fetch(url); p.feed(html)
    flat = "".join(p.parts)
    data = {}

    # Name = first meaningful text line (the H1), minus the site title suffix.
    name = p.parts[0].strip() if p.parts else ""
    name = re.split(r"\s*\|\s*", name)[0].strip()  # drop "| Starter Home Supports"
    data["name"] = name

    # Main image: first /uploads/images/ that isn't a BER badge or logo
    imgs = [i for i in re.findall(r'(/uploads/images/[^"\')\s]+)', html)
            if "/bers/" not in i and "/logos/" not in i and "/headers/" not in i]
    data["image"] = (BASE + unescape(imgs[0])) if imgs else ""

    # BER: from the ber badge image (/uploads/images/bers/a2.png) or text
    mber = re.search(r'/uploads/images/bers/([a-cA-C][0-9]?)\.png', html)
    data["ber_rating"] = mber.group(1).upper() if mber else ""

    # Property type from the "Property Type ... " table row
    mtype = re.search(r'(One|Two|Three|Four|1|2|3|4)[- ]bed\s+(apartment|house|duplex)',
                      flat, re.IGNORECASE)
    if mtype:
        data["property_type"] = mtype.group(2).lower()
    else:
        data["property_type"] = "apartment"

    # Bedrooms text (e.g. "One-bed apartment", "1, 2 & 3 Bed"). Stop cleanly at "Bed".
    mbed = re.search(
        r'((?:One|Two|Three|Four|\d)(?:\s*[,&]?\s*(?:One|Two|Three|Four|\d))*\s*[- ]?[Bb]ed)',
        flat,
    )
    data["bedrooms"] = mbed.group(1).strip() if mbed else ""

    # Rent from the cost column "€1,054"
    mrent = re.search(r'€\s*([\d,]+)', flat)
    data["rent"] = int(mrent.group(1).replace(",", "")) if mrent else None

    # Dates: "closing date is Mon 14 September" / "available from 19 October 2026"
    mclose = re.search(r'closing date[^.]*?(\d{1,2}\s+[A-Z][a-z]+(?:\s+\d{4})?)', flat)
    data["date_closes"] = mclose.group(1).strip() if mclose else None
    mopen = re.search(r'available from\s+(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})', flat)
    data["date_opens"] = mopen.group(1).strip() if mopen else None

    # Description: the first substantial paragraph after the name
    desc = ""
    for part in p.parts[1:]:
        if len(part) > 60:
            desc = part.strip()
            break
    data["description"] = desc

    # Real provider (housing body), not just the aggregator.
    data["provider"] = detect_provider(html, flat, desc)

    # Location from the structured "Location" field on the detail page (fallback
    # for when the list-page row didn't match).
    mloc = re.search(r'<h3[^>]*>Location</h3>\s*<p[^>]*>([^<]+)</p>', html, re.IGNORECASE)
    data["location"] = mloc.group(1).strip() if mloc else ""

    return data


def slug_of(url):
    return url.strip("/").split("/")[-1]


def norm(s):
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


# ---------------------------------------------------------------------------
# Build + write
# ---------------------------------------------------------------------------
def make_id(url, prefix="ah-"):
    return prefix + slug_of(url)


def build(section):
    cfg = SECTIONS[section]
    is_buy = section == "buy"
    print(f"[{section}] Scraping list pages for authoritative statuses...")
    list_rows, total = scrape_list(cfg["list_url"])
    print(f"  list rows: {len(list_rows)} (source total {total})")

    print(f"[{section}] Collecting detail URLs from calendar view...")
    urls = detail_slug_urls(cfg["calendar_url"], cfg["detail_prefix"])
    print(f"  detail URLs: {len(urls)}")

    list_by_name = {}
    for r in list_rows:
        list_by_name.setdefault(norm(r["name"]), []).append(r)

    listings = []
    used_list_keys = set()
    print(f"[{section}] Fetching detail pages (rich data)...")
    for n, url in enumerate(urls, 1):
        try:
            d = parse_detail(BASE + url)
        except Exception as e:  # noqa: BLE001
            print(f"  ! detail failed {url}: {e}")
            continue

        match = None
        for c in list_by_name.get(norm(d["name"]), []):
            if id(c) not in used_list_keys:
                match = c; used_list_keys.add(id(c)); break
        if match is None:
            cands = list_by_name.get(norm(d["name"]), [])
            match = cands[0] if cands else None

        status = match["status"] if match else "open"
        status_text = match["status_text"] if match else "Applications Open"
        location = (match["location"] if match else "") or d.get("location", "")
        county = (match["county"] if match else "") or county_from_location(location)
        amount = d["rent"] or (match["rent"] if match else None)  # rent or price

        if is_buy:
            listing = {
                "id": make_id(url, "buy-"),
                "provider": d.get("provider") or PROVIDER,
                "name": d["name"] or (match["name"] if match else slug_of(url)),
                "location": location,
                "county": county,
                "bedrooms": d["bedrooms"],
                "price": amount,
                "status": status,
                "status_text": status_text,
                "description": d["description"],
                "availability": "",
                "url": BASE + url,
                "image": d["image"],
                "provider_url": PROVIDER_URL,
                "ber_rating": d["ber_rating"],
                "property_type": d["property_type"],
                "date_closes": d["date_closes"],
                "date_opens": d["date_opens"],
            }
        else:
            market = MARKET_RENT_BY_COUNTY.get(county)
            listing = {
                "id": make_id(url, "ah-"),
                "provider": d.get("provider") or PROVIDER,
                "name": d["name"] or (match["name"] if match else slug_of(url)),
                "location": location,
                "county": county,
                "bedrooms": d["bedrooms"],
                "rent": amount,
                "status": status,
                "status_text": status_text,
                "description": d["description"],
                "amenities": [],
                "parking": None,
                "url": BASE + url,
                "image": d["image"],
                "provider_url": PROVIDER_URL,
                "ber_rating": d["ber_rating"],
                "property_type": d["property_type"],
                "date_closes": d["date_closes"],
                "date_opens": d["date_opens"],
                "market_rent": market if (market and amount and market > amount) else None,
            }
        listings.append(listing)
        if n % 20 == 0:
            print(f"    ...{n}/{len(urls)}")
        time.sleep(0.25)

    return listings, total


def write_section(section):
    from collections import Counter
    cfg = SECTIONS[section]
    listings, total = build(section)
    if len(listings) < 10:
        print(f"ERROR [{section}]: only {len(listings)} listings scraped; "
              f"aborting to protect data.", file=sys.stderr)
        return False

    data_file = cfg["data_file"]
    existing = json.loads(data_file.read_text()) if data_file.exists() else {}
    out = {
        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "listings": listings,
    }
    # The cost-rental file also carries static reference blocks the site uses.
    if section == "rent":
        out["providers"] = existing.get("providers", [])
        out["eligibility"] = existing.get("eligibility", {})
        out["market_comparison"] = existing.get("market_comparison", {})

    data_file.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    counts = dict(Counter(l["status"] for l in listings))
    with_img = sum(1 for l in listings if l["image"])
    print(f"[{section}] Wrote {len(listings)} listings -> {data_file.name}. "
          f"Statuses: {counts} | with image: {with_img}")
    return True


def main():
    # Which sections to run: default both; or pass "rent"/"buy" as an argument.
    sections = sys.argv[1:] or ["rent", "buy"]
    ok = True
    for s in sections:
        if s not in SECTIONS:
            print(f"unknown section {s!r}; valid: {list(SECTIONS)}", file=sys.stderr)
            ok = False
            continue
        ok = write_section(s) and ok
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
