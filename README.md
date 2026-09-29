# Evergreen diary

A private, storybook-inspired personal diary built with Next.js App Router, TypeScript, Tailwind CSS, Supabase and Lucide.

## Setup

1. Create a Supabase project and enable Email/Password authentication. Create and confirm the fixed owner account `titapa.pra@gmail.com`, then set its password in Supabase Auth. Never commit the password to this repository.
2. Copy `.env.example` to `.env.local`, then add the Project URL and **publishable** key from Supabase Connect.
3. Run the SQL in `supabase/migrations/20260916110000_create_diary_entries.sql` in the Supabase SQL editor (or push it with the Supabase CLI after linking a project).
4. Create a Resend API key, add `RESEND_API_KEY` and `LOGIN_ALERT_FROM_EMAIL` to `.env.local`, and verify the sender domain before production use. Login alerts always go to the fixed owner account.
5. Set the Auth redirect URL to your local/deployed site, then run `pnpm dev`.

Password sign-in is rate-limited in the app and by Supabase Auth. Keep `LOCAL_PREVIEW=false` whenever authentication must be enforced.

Never expose a Supabase secret or service-role key in this application.
