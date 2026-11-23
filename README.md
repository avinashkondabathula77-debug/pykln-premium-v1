# PYKLN Premium Sports Dashboard — V2

Retains the V1 charcoal/lime sports dashboard, Supabase match/tournament display and 20-second polling. Adds player authentication and profile management.

## New features
- Google OAuth login (requires enabling Google provider in Supabase)
- Email/password signup and login, with email verification when enabled
- Mobile SMS OTP sign-in (requires enabling Phone auth and an SMS provider)
- Player profile: first name, last name, DUPR ID, phone and profile picture
- Supabase Auth session persistence and private per-user profile rows
- Profile photo upload, max 2 MB (JPG, PNG, WebP)

## Required setup BEFORE using sign-in
1. In Supabase SQL Editor, run `SUPABASE_SETUP.sql` once. It creates the `player_profiles` table, RLS policies, signup trigger and avatar storage bucket.
2. Supabase Dashboard → Authentication → URL Configuration: set Site URL to your Cloudflare Pages domain (e.g. `https://pykln-premium-v1.pages.dev`) and add it to Redirect URLs. Also add any custom domain and preview domains you actually use.
3. Authentication → Providers → Email: enable email/password and decide whether to require email confirmation. Set up a production SMTP provider before public launch.
4. Authentication → Providers → Google: enable provider and configure Google Cloud OAuth credentials and the Supabase callback URL shown by Supabase.
5. Authentication → Providers → Phone: enable phone sign-in, configure an SMS provider and check delivery/OTP rate limits for India. SMS OTP is not functional until this is done.
6. Upload **individual files** (`index.html`, `styles.css`, `app.js`, `auth.js`, `config.js`, `README.md`, `SUPABASE_SETUP.sql`) to the GitHub repository root. Cloudflare Pages: framework `None`, blank build command, output directory `/` (root).
7. Test email signup and verification, Google OAuth, SMS OTP, profile save and photo upload using test accounts.

## Security
`config.js` includes a browser-safe Supabase publishable key. Never upload Supabase secret/service_role keys, OAuth client secrets, SMS provider secrets or private tokens. `player_profiles` uses owner-only row-level security. Avatar images are public if the URL is known; do not upload sensitive images. Profile phone numbers and DUPR IDs are not publicly listed by this frontend.

This version **does not** grant organiser/scorer privileges or implement registrations, payments, or score edits. Those require separate database-enforced role policies. Live score polling remains read-only.
