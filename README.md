# Spin & Win — Premium Ride Reward

Live web app that lets passengers scan a QR code in the car, spin a digital prize wheel, and win a thank-you gift. Designed for Juliano (Lyft Premium XL · Bakersfield, CA), built to scale to multiple drivers.

## Live URLs

- **Production**: https://spinwin-juliano.vercel.app
- **Driver-specific**: https://spinwin-juliano.vercel.app/?driver=juliano

## Stack

- **Frontend**: Vanilla HTML / CSS / JS (ES modules), Bebas Neue + Inter fonts, SVG wheel, Canvas confetti — no frameworks
- **Backend**: Vercel Serverless Functions (Node 20)
- **Database**: Supabase Postgres (`spinwin_*` tables) with `SECURITY DEFINER` RPCs
- **Hosting**: Vercel

## How it works

1. Passenger scans QR code in seat organizer
2. Page loads at `/?driver=juliano`
3. Browser fingerprint is computed (UA + screen + timezone + locale + hardware + random salt)
4. Tap the steering wheel → API call to `/api/spin`
5. Server checks `(driver_id, IP, fingerprint)` in DB
   - **First spin** → weighted random pick, insert, return prize
   - **Replay** → return existing prize, no new spin
6. Wheel animates to the winning segment
7. Result is displayed permanently — passenger shows it to the driver to claim the physical prize

## Anti-fraud (one spin per rider)

| Layer | Mechanism |
|---|---|
| 1 | `localStorage` cache — instant replay UX |
| 2 | Browser fingerprint (UA + screen + timezone + hardware + random salt, hashed) |
| 3 | Client IP from Vercel `x-forwarded-for` |
| 4 | DB unique constraint `(driver_id, ip, fingerprint)` |
| 5 | Atomic Postgres RPC `spinwin_try_spin` — race-safe even on duplicate POSTs |

Three friends in the same car (same IP via hotspot) → different fingerprints → all can play.
Same phone trying again → blocked, returns the original prize.

## Project layout

```
spinwin/
├── index.html              # main page
├── css/style.css           # Premium Night Drive theme
├── js/
│   ├── main.js             # app orchestration, screen flow
│   ├── api.js              # fetch helpers + fingerprint
│   ├── wheel.js            # SVG wheel rendering + spin animation
│   └── effects.js          # canvas confetti / fireworks
├── api/
│   ├── _supabase.js        # shared Supabase REST helper
│   ├── driver.js           # GET driver config
│   ├── spin.js             # POST a spin attempt
│   └── admin.js            # POST admin actions (PIN-protected)
├── qr-juliano.png          # printable QR (links to /?driver=juliano)
├── print-card.html         # printable card with QR + branding (A6)
├── package.json
├── vercel.json
├── .gitignore
├── .env.example
└── README.md
```

## Driver Admin Panel

- **Open**: tap the top-right corner of the screen 5 times in a row
- **PIN**: `1805` (Juliano)
- **Actions**:
  - `STATS` — total spins, today's spins, jackpot count
  - `JACKPOT ON/OFF` — disable jackpot for nights when you have no special prize
  - `CLEAR LOCAL CACHE` — reset the local browser cache (does NOT reset DB)

## How to print the QR card

1. Open `print-card.html` in any browser
2. Click **Print this card** (or `Cmd/Ctrl+P`)
3. Print on **A6 paper** (or "fit to page" on a regular sheet and cut)
4. Slip it into the seat organizer

The QR points to `https://spinwin-juliano.vercel.app/?driver=juliano`.

## Adding a new driver (e.g. Yecenia)

Run this SQL in Supabase (replace fields as needed):

```sql
INSERT INTO public.spinwin_drivers (id, display_name, full_name, city, service, branding, prizes, jackpot_enabled, pin_hash)
VALUES (
  'yecenia',
  'Yecenia',
  'Yecenia Incorvaia',
  'Bakersfield, CA',
  'Lyft Premium XL',
  '{"primary":"#FF00BF","accent":"#FFD700","tagline":"Every ride deserves a reward","thanks":"Thank you for riding with me today"}'::jsonb,
  '[
    {"tier":"bronze","label":"Pack of Gum","weight":1},
    {"tier":"silver","label":"$1 Scratch Ticket","weight":1},
    {"tier":"bronze","label":"Mints","weight":1},
    {"tier":"gold","label":"$5 Amazon Gift Card","weight":1},
    {"tier":"bronze","label":"Candy Bar","weight":1},
    {"tier":"silver","label":"Snack Bag","weight":1},
    {"tier":"gold","label":"$5 Starbucks Card","weight":1},
    {"tier":"jackpot","label":"MYSTERY JACKPOT","weight":1}
  ]'::jsonb,
  true,
  encode(extensions.digest('YOUR_PIN_HERE','sha256'),'hex')
);
```

Then generate a new QR pointing to `/?driver=yecenia` and print a card.

## Local development

```powershell
cd spinwin
vercel link --yes --project spinwin-juliano --scope julianoncielas-projects
vercel env pull .env.local
vercel dev
```

Open http://localhost:3000.

## Deployment

```powershell
vercel deploy --prod --yes
```

Pushes to the linked Vercel project (no GitHub integration needed for V1).

## Environment variables (set in Vercel)

| Name | Value |
|---|---|
| `SUPABASE_URL` | `https://kmzjuforuetzxibiiixx.supabase.co` |
| `SUPABASE_KEY` | `sb_publishable_...` |

The Supabase publishable key is safe to expose — RPCs are `SECURITY DEFINER` and the only exposed entry points. RLS is enabled on all tables.

## Restock checklist (driver)

| Trigger (from STATS panel) | Action |
|---|---|
| 20 total spins | Restock Bronze (gum, mints, candy) |
| 10 total spins | Check Silver (scratch tickets, snacks) |
| 5 total spins | Prepare next Jackpot item |

## V2 roadmap

- Passenger name input → "SARAH WINS GOLD!"
- Instagram Stories share button on result
- Driver dashboard with spins/tips correlation
- Multi-driver self-service signup
- Daily/weekly winner streaks
- Animated intro with car driving sequence
