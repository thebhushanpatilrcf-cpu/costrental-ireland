# CostRental.ie — TODO & Roadmap
# Last updated: 2026-07-31

## 🔴 URGENT (This Week)

- [ ] Deploy v2 to Netlify (final deploy — save credits)
- [ ] Add Privacy Policy page (required for AdSense approval)
- [ ] Add About/Contact page (helps AdSense + trust)
- [ ] Fix sorting: open listings MUST show first (CSS order property added, verify it works live)
- [ ] Add real property images (manually copy from LDA/Tuath/Respond sites)
- [ ] Fix the Cookstown Gateway closing date display (closes Aug 6, 2026 at 12:30)
- [ ] Re-enable CrowdStrike Falcon on customer instance i-09a3db0f982365bbf (EC2 case)

## 🟡 THIS MONTH (August 2026)

### SEO & Content
- [ ] Write blog post: "What is Cost Rental Ireland? Complete Guide 2026"
- [ ] Write blog post: "How to Apply for LDA Cost Rental — Step by Step"
- [ ] Write blog post: "Cost Rental vs HAP — Which Am I Eligible For?"
- [ ] Add structured data (JSON-LD) for Google rich results
- [ ] Submit sitemap to Google Search Console
- [ ] Register site on Google Search Console

### Growth & Marketing
- [ ] Post on Reddit r/ireland — "I built a free tool for cost rental listings"
- [ ] Post on Reddit r/irishpersonalfinance
- [ ] Post on Reddit r/dublin
- [ ] Share in Facebook groups: "Dublin Rentals", "Affordable Housing Ireland"
- [ ] Create Twitter/X account @CostRentalIE — auto-tweet when new listings open
- [ ] Register on boards.ie housing forum

### Technical
- [ ] Buy custom domain: costrental.ie (~€15/year from Blacknight.ie)
- [ ] Move to GitHub Pages or Cloudflare Pages (unlimited free deploys)
- [ ] Set up auto-scraper to update listings.json automatically
- [ ] Fix Tuath Housing SSL error in the monitor (old Mac LibreSSL)
- [ ] Add Google Analytics (or use Netlify analytics)
- [ ] Create PWA manifest for "Add to Home Screen"
- [ ] Add browser push notifications

### Monetisation
- [ ] Wait for AdSense approval (submitted Jul 31)
- [ ] If rejected: add Privacy Policy, About page, more blog content, resubmit
- [ ] Create "Cost Rental Application Guide" PDF (sell for €9.99 via Gumroad)
- [ ] Research affiliate programs (moving companies, home insurance Ireland)
- [ ] Plan newsletter sponsorship outreach (month 3+)

## 🟢 FUTURE (September+)

### Features
- [ ] Auto-update listings via Lambda scraper (run every 15 min)
- [ ] User accounts (save preferences, personalised alerts)
- [ ] SMS/WhatsApp alerts (premium €5/month via Stripe + Twilio)
- [ ] Interactive map with area statistics
- [ ] Cost rental success rate calculator (odds of getting a place)
- [ ] Integration with Daft.ie market data for live comparisons
- [ ] Add more providers: Clúid, Circle VHA, Oaklee, Cooperative Housing

### Content
- [ ] Video content for TikTok/Reels: "Dublin apartments for €1,225"
- [ ] Interview real cost rental tenants for success stories
- [ ] Monthly "Cost Rental Roundup" newsletter
- [ ] Comparison articles: "Cookstown Gateway vs Citywest — which is better?"

### Scale
- [ ] Move backend to AWS (Lambda + DynamoDB + SES)
- [ ] Build admin dashboard to manage listings
- [ ] Add student accommodation from all Irish universities
- [ ] Expand to affordable PURCHASE schemes (not just rental)
- [ ] Consider building a mobile app (React Native)

## 📊 METRICS TO TRACK

- Monthly unique visitors (goal: 1,000 by end of August)
- Email subscribers (goal: 100 by end of August)
- AdSense revenue
- Reddit post upvotes / traffic spike
- Google Search Console: impressions + clicks
- Discord alert bot uptime

## 🔗 USEFUL LINKS

- Live site: https://costrental-ireland.netlify.app
- Netlify dashboard: https://app.netlify.com
- AdSense: https://www.google.com/adsense (ca-pub-9636330397610882)
- Formspree (notify form): https://formspree.io/forms
- Discord webhook (housing): https://discord.com/api/webhooks/1532351078400790611/...
- Discord webhook (LFC tickets): https://discord.com/api/webhooks/1532327756678041632/...
- LDA listings: https://lda.ie/affordable-homes/lda-cost-rental
- Tuath listings: https://tuathhousing.ie/cost-rental/
- Respond listings: https://www.respond.ie/cost-rental/

## 📁 PROJECT LOCATIONS

- Website v1: ~/casework/costrental-ireland/
- Website v2: ~/casework/costrental-ireland-v2/
- Housing alert bot: ~/casework/ireland-housing-alerts/
- LFC ticket bot: ~/casework/lfc-ticket-alerts/
- LFC Lambda (unused): ~/lfc-ticket-alert/

## 💡 IDEAS PARKING LOT

- AI chatbot: "Am I eligible?" conversational assistant
- Shareable cards for Instagram stories
- "Waitlist counter" showing how many people are watching each listing
- Partner with Irish housing charities (Threshold, Simon Community)
- Approach RTÉ/Irish Times for coverage when a major scheme opens
- Build a browser extension that highlights cost rental links on Daft.ie
