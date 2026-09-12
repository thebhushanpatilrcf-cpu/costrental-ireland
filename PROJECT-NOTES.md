# CostRental.ie — Project Notes & Recovery Guide

> Everything you need to understand, run, recover, and maintain this project —
> even if you lose your laptop. This file is committed to GitHub, so it survives
> any device loss. To recover it: clone the repo (see "Recovering after device loss").

Last updated: 2026-09-10

---

## 1. What this project is

**CostRental.ie** — an independent website that aggregates Ireland's cost-rental,
affordable-purchase, and student-accommodation listings in one place. It scrapes the
official government portal, shows accurate live application statuses, and updates
itself automatically.

- It is a **static site** (HTML/CSS/JS only, no server, no database).
- Listings data lives in JSON files in the repo (`data/*.json`).
- A **GitHub Action bot** re-scrapes the source twice a day and commits fresh data.
- Two hosts serve it (both auto-deploy from the same GitHub repo).

---

## 2. Accounts & URLs (THE IMPORTANT STUFF)

### Live website URLs
| URL | Host | Notes |
| --- | --- | --- |
| https://costrental-ireland.netlify.app/ | Netlify | Primary, nicer name |
| https://thebhushanpatilrcf-cpu.github.io/costrental-ireland/ | GitHub Pages | Backup, no build-credit limits |

Both are the SAME site, deployed from the same repo. Netlify has a monthly build-credit
limit; GitHub Pages does not, so GitHub Pages is the bulletproof fallback.

### Source code (the source of truth)
- **GitHub repo:** https://github.com/thebhushanpatilrcf-cpu/costrental-ireland
- **GitHub username:** `thebhushanpatilrcf-cpu`
- **GitHub account email:** `thebhushanpatilrcf@gmail.com`  (note the `the` prefix)

### Netlify
- **Login:** https://app.netlify.com  with `thebhushanpatilrcf@gmail.com`
- **Team:** costrental-ireland
- **Site/Project ID:** `6bc54c4a-a573-4ae2-b1e9-4fa9427dfcbb`

### Two similar Gmail accounts (don't confuse them)
- `thebhushanpatilrcf@gmail.com`  → owns GitHub + Netlify for THIS project.
- `bhushanpatilrcf@gmail.com`  → a different, separate account (a second Netlify team "Test").

### Discord
- Server: `thenormalone__`
- The alerts were posted via a **Discord webhook** (not a registered bot app).
- The old alert bot ran on the LOST laptop and is gone (see section 6).

### Domain (NOT owned yet — optional future step)
- `costrental.ie` was never purchased. The "CostRental.ie" text is just branding.
- To get a real domain: buy `costrental.ie` (~€15/yr, e.g. Blacknight.ie) and point it
  at GitHub Pages/Netlify. Requires Irish/EU eligibility for `.ie`.

---

## 3. How the whole system works

```
  affordablehomes.ie (a.k.a. newstarterhomes.ie)   <- the official source
                 |
                 v
  GitHub Action (scripts/scrape.py, runs 2x/day)   <- the "bot"
                 |  commits data/listings.json + data/purchase.json
                 v
  GitHub repo (thebhushanpatilrcf-cpu/costrental-ireland)   <- source of truth
                 |                         |
                 v                         v
        Netlify (auto-deploy)     GitHub Pages (auto-deploy)
                 |                         |
                 v                         v
   costrental-ireland.netlify.app   thebhushanpatilrcf-cpu.github.io/costrental-ireland
```

- Change code or data on GitHub → both hosts redeploy automatically in seconds.
- The bot keeps listings fresh with no manual work.

---

## 4. Repo layout

```
costrental-ireland/
├── index.html              Main page (all 3 tabs: Cost Rental / Purchase / Student)
├── css/style.css           Styling
├── js/
│   ├── app.js              Main logic: load data, filter, sort, search, render
│   └── map.js              Leaflet map with price pins
├── pages/listing.html      Individual listing detail page
├── data/
│   ├── listings.json       Cost rental listings (scraped)
│   ├── purchase.json       Affordable purchase listings (scraped)
│   └── students.json       Student accommodation (static, not scraped)
├── scripts/scrape.py       THE BOT: scrapes rent + buy, writes the JSON
├── .github/workflows/update-listings.yml   Schedule that runs the scraper 2x/day
├── sw.js                   Service worker (network-first, no stale caching)
├── _headers                Netlify security + cache-control headers
├── manifest.json, sitemap.xml, robots.txt, favicon.*, 404.html
└── PROJECT-NOTES.md         <- this file
```

---

## 5. How to run / update it locally

You need: a Mac with `git` and `python3` (both standard).

```bash
# Get the code
git clone https://github.com/thebhushanpatilrcf-cpu/costrental-ireland.git
cd costrental-ireland

# Preview the site locally (then open http://localhost:8000)
python3 -m http.server 8000

# Run the scraper manually (updates data/listings.json + data/purchase.json)
python3 scripts/scrape.py            # both sections
python3 scripts/scrape.py rent       # just cost rental
python3 scripts/scrape.py buy        # just affordable purchase

# Commit + publish a change (both hosts redeploy automatically)
git add -A
git commit -m "your message"
git push origin main
```

Note: pushing needs GitHub auth. On a fresh Mac, VS Code's GitHub sign-in or a
Personal Access Token handles this. A token named `costrental-deploy` already exists
on the GitHub account for the bot.

---

## 6. Recovering after device loss (READ THIS IF LAPTOP IS GONE)

Nothing important lives only on the laptop. Everything is on GitHub.

1. On the new machine, log into GitHub as `thebhushanpatilrcf-cpu`
   (email `thebhushanpatilrcf@gmail.com`; use "Forgot password" if needed).
2. Clone the repo:
   ```bash
   git clone https://github.com/thebhushanpatilrcf-cpu/costrental-ireland.git
   ```
3. That's it — you have all the code, this notes file, the scraper, and the workflow.
4. The website keeps running the whole time (it's hosted in the cloud, not on your Mac).
5. The scraper bot also keeps running (it's a GitHub Action in the cloud, not on your Mac).

The ONLY thing that was lost with the original laptop was the OLD Discord alert bot
(`~/casework/ireland-housing-alerts/`), which was never pushed to GitHub. The website's
own scraper (scripts/scrape.py) fully replaced its data-updating job.

---

## 7. Maintenance & troubleshooting

### The scraper (bot)
- Runs automatically twice a day via `.github/workflows/update-listings.yml`.
- Run it manually anytime: GitHub repo → **Actions** tab → "Update cost rental listings"
  → **Run workflow**.
- If it ever needs write permission: repo → Settings → Actions → General →
  Workflow permissions → "Read and write permissions".

### If a scraper breaks (source site changed its HTML)
- The scraper fails safe: if it scrapes <10 listings it aborts without wiping good data.
- Fix is usually in `scripts/scrape.py` — the regexes that parse the list/detail pages.

### If the site shows stale content after an update
- Should no longer happen (service worker is network-first + no-cache headers set).
- If it ever does: hard refresh (Cmd+Shift+R), or DevTools → Application →
  Service Workers → Unregister → reload.

### If images don't show
- Image URLs must point at `https://newstarterhomes.ie/uploads/...`
  (NOT `affordablehomes.ie/uploads/...`, which 301-redirects to insecure http and
  gets blocked as mixed content). The scraper already writes the correct domain.
- On Netlify, `_headers` must have `Cross-Origin-Resource-Policy: cross-origin`
  (else cross-origin images are blocked).

### If Netlify stops deploying ("credit usage exceeded")
- Free-tier build credits reset monthly. Just wait, or trigger a deploy after reset.
- GitHub Pages keeps serving regardless — it's the reliable fallback.

---

## 8. Data sources

- **Cost rental + Affordable purchase:** affordablehomes.ie / newstarterhomes.ie
  (the official government portal — it already aggregates LDA, Tuath, Clúid, Respond,
  councils, etc., so we don't scrape each provider separately).
- **Student accommodation:** static curated data in `data/students.json`
  (no single aggregator exists; statuses auto-close by date on the frontend).

---

## 9. Feature summary (what the site does)

- 3 tabs: Cost Rental, Affordable Purchase, Student Accommodation.
- Free-text search (area / name / provider).
- Sort: open-first, closing-soonest, price, name.
- "Closing Soon" filter (open listings closing within 7 days).
- Auto-closes listings once their deadline passes (accurate statuses).
- Real provider names per listing (Tuath, Clúid, LDA, Respond, councils…).
- Duplicate developments collapsed into one card with a price range.
- Map with Zillow/Daft-style price pins.
- Affordability calculator, rent-vs-market comparison, HAP limits, eligibility,
  document checklist, official-guidance links.
- Dark mode, saved favourites (browser-local), PWA/offline support.
- No account/email collection (kept simple, avoids GDPR overhead).
