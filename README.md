# PYKLN Club — Premium Sports Dashboard V1

A **new design** (not the old Firebase UI), built with plain HTML/CSS/JavaScript and the Supabase REST API. Suitable for static hosting on Cloudflare Pages.

## Included
- Responsive premium charcoal/lime homepage and left navigation
- Live / Completed / Upcoming match tabs
- Tournament calendar and open-registration announcements
- Reads real Supabase `tournaments`, `matches`, `teams` data
- Auto refresh every 20 seconds while the page is visible
- Empty states when no records exist; **no fabricated scores**
- Player profile, leaderboard and registration placeholders (not yet operational)

## Supabase
The project URL and **publishable** key are in `config.js`. This key is designed to be public. **Never add `service_role`, `sb_secret_`, database passwords, or personal access tokens to website code.**

Uses these existing columns:
- tournaments: id, name, event_date, venue, status, registration_open
- matches: id, tournament_id, team1_id, team2_id, court_number, score1, score2, status, winner_id
- teams: id, name, tournament_id

For public display, the existing RLS SELECT policies on these three tables must be enabled. Keep `players` and `registrations` private. This frontend **does not** create records or change scores.

## Local preview
Unzip, then run a static HTTP server from the folder, e.g. `python -m http.server 8000`, and open http://localhost:8000. Opening `index.html` directly may also work, but a server is preferred.

## Deploy on Cloudflare Pages
1. Create a **new GitHub repository**, e.g. `pykln-premium-v1` (recommended, to avoid overwriting your existing Firebase project).
2. Upload the *contents* of this folder to the repository root.
3. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
4. Select your repository. Framework preset: **None**. Build command: **leave blank**. Build output directory: `/` (repository root).
5. Deploy and open the `*.pages.dev` URL. Cloudflare UI wording may vary.

## Security and next release
- Add Supabase Auth and database-enforced organiser/scorer role policies before implementing writes.
- Add registration forms, validation, and secure payment handling.
- Define player membership, individual ranking calculations and score finalisation.
- Import existing tournament history from trusted source records.
- Optionally add Supabase Realtime subscriptions; V1 uses polling.
- Do not enable broad anonymous INSERT/UPDATE/DELETE policies.

## Troubleshooting
If you see “Connection unavailable,” verify your project is active, the publishable key is correct, and the RLS read policies are present. Check browser developer console/network for exact HTTP errors.

This is a **functional read-only first version**, not a complete production tournament management system.
