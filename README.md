# PeakPoint SAT Prep

PeakPoint is a SAT-style prep platform with adaptive practice, diagnostics, study planning, question bank review, vocabulary, Question Rush, analytics, and secure Gemini-powered tutoring.

## Local Setup

1. Install Node.js 24 or newer.
2. Copy `.env.example` to `.env`.
3. Fill in the server values you use locally.
4. Start the app:

```bash
npm start
```

Open `http://localhost:5173`.

## Environment Variables

`GEMINI_API_KEY` activates AI features. It must stay server-side in `.env`.

`GEMINI_MODEL` is optional and defaults to `gemini-3.5-flash`.

`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` let the server verify logged-in users for AI routes.

`ADMIN_EMAILS` is a comma-separated allowlist for admin question generation.

`ALLOW_DEMO_AUTH` is only for local development and should be `false` in production.

## Gemini Setup

Create a Gemini API key in Google AI Studio, add it to `.env` as `GEMINI_API_KEY=...`, then restart the server. PeakPoint uses Gemini Flash only through secure server routes; the key is never sent to browser code.

If the key is missing or Gemini fails, the app remains usable and AI panels show an unavailable message.

## Database Setup

PeakPoint keeps Supabase Auth and uses Row-Level Security for student data.

1. Open the Supabase SQL editor.
2. Run `supabase/schema.sql`.
3. Make sure Auth is enabled.
4. For admin review inside Supabase, set an admin custom claim `app_metadata.role = "admin"` or use `ADMIN_EMAILS` for the server route.

## Running Tests

```bash
npm test
```

The test suite covers diagnostic reporting, study-plan generation, missed-question history, vocabulary scheduling, Question Rush saving, generated-question approval, Gemini fallback behavior, and tutor answer-guarding.

## Deployment

Deploy the static files and `server.js` together on a Node-capable host. Set environment variables in the host’s secret manager, not in frontend files. Run the Supabase schema before launch.

## Adding and Reviewing Questions

Use `admin.html` to generate original SAT-style drafts with Gemini. Drafts are unpublished until an administrator approves them. Approved generated questions appear in the Question Bank as admin-approved AI-generated SAT-style practice.

Do not scrape, copy, bulk-download, or republish College Board content. Do not describe PeakPoint content as official College Board questions.

## Troubleshooting

AI says unavailable: confirm `.env` contains `GEMINI_API_KEY` and restart the server.

AI says login required: confirm Supabase environment variables are set and the user is logged in.

Admin generation fails: confirm `ADMIN_EMAILS` contains the logged-in user email or the user has an admin role claim.

Progress does not persist to Supabase: run `supabase/schema.sql`. The app also keeps a local fallback while the schema is being applied.

Question Bank looks empty after filters: clear filters or generate more approved admin questions.
