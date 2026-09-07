# SGBAU Result Watch

Automatically monitor the official **Sant Gadge Baba Amravati University (SGBAU)** result
portal for a student's result, and get notified — with a downloadable/printable PDF — the
moment it is genuinely declared and verified. Built for the initial test case of a
B.Tech Computer Science & Engineering (NEP), 4th Semester, Regular, Summer result, but
supports any SGBAU profile you add.

> ResultWatch is an independent student tool. It is **not affiliated with SGBAU**.

---

## 1. What this application does

1. You register, add a "result profile" (roll number, course, branch, semester, exam
   type/session), and click **Start Monitoring**.
2. A background worker — independent of your browser — checks the official SGBAU result
   portal on a schedule you choose (30 min / 1h / 6h / 12h / 24h).
3. Every check is honestly classified as one of:
   `RESULT_NOT_DECLARED`, `RESULT_FOUND`, `RESULT_PROCESSING`, `RESULT_VERIFIED`,
   `RESULT_REQUIRES_VERIFICATION`, or `RESULT_FAILED`. **The app never fabricates a
   result** — until a real, verified result is found, the dashboard says so plainly.
4. Once a result is found, it is verified against your roll number, saved once
   (duplicate-protected via a content hash), turned into a clearly-labelled,
   non-official PDF report, and — if you've enabled it — emailed to you.
5. You can then view, download, or print the result at any time.
6. If SGBAU blocks automated access (CAPTCHA, anti-bot, etc.), the app tells you so and
   offers a **manual upload fallback**: you open the official page yourself, complete any
   verification, and upload the resulting PDF/screenshot — the app extracts and verifies
   it the same way.

---

## 2. Features

- Automatic, per-profile scheduled monitoring (server-side, browser-independent)
- Honest result-state machine — no fake/placeholder results, ever
- Student verification (roll-number-anchored) before any result is attached to an account
- Deterministic result hashing → no duplicate results, PDFs, or notifications
- Non-official, clearly labelled A4 PDF report generation (Puppeteer)
- Download and dedicated print view
- Optional email notifications (SMTP, duplicate-protected)
- Manual "Check Now" (rate-limited) in addition to the background worker
- Manual result-upload fallback (PDF text extraction; pluggable OCR for images)
- Admin dashboard: totals, monitoring logs, retry, mock-mode visibility
- JWT + HTTP-only-cookie auth, bcrypt password hashing, rate limiting, Helmet, CORS,
  parameterized SQL, input validation, sanitized errors
- Light / dark / system theme, persisted
- Responsive, accessible UI (Tailwind CSS)
- Development mock adapter (`MOCK_RESULT_MODE=true`) so the entire pipeline can be
  exercised without contacting SGBAU
- Jest test suite: parser, hashing, verification, auth, monitoring pipeline, PDF
  template, and security/authorization

---

## 3. Architecture

```text
client/  (React + Vite + Tailwind)
  ─ talks to the API at /api/* (proxied to the server in dev)

server/  (Node.js + Express)
  ├── universities/sgbau/     — SGBAU-specific fetcher + parser + adapter + config
  ├── universities/mock/      — development-only fake adapter (same interface)
  ├── universities/index.js   — adapter registry (add other universities here)
  ├── services/
  │     monitoringService.js  — shared pipeline used by both "Check Now" and the worker
  │     verificationService.js— confirms a result really belongs to the profile
  │     hashService.js        — duplicate-protection hashing
  │     ocrService.js         — pluggable OCR hook for the upload fallback
  │     textResultParser.js   — parses extracted PDF/OCR text into structured fields
  ├── pdf/                    — Puppeteer-based, non-official PDF report generator
  ├── notifications/          — optional SMTP email, duplicate-protected
  ├── workers/scheduler.js    — standalone cron process (npm run worker)
  ├── database/               — SQLite schema, migration, seed
  └── controllers/routes/     — REST API (auth, profiles, results, upload, admin)
```

The monitoring pipeline (`monitoringService.checkProfile`) is the single source of truth
for what happens on a check, so the manual "Check Now" button and the scheduled worker
can never drift out of sync.

---

## 4. Installation

Requires Node.js 18+.

```bash
git clone <this-repo>
cd sgbau-result-watch
npm run install:all        # installs both server/ and client/ dependencies
cp server/.env.example server/.env
# edit server/.env — at minimum set a real JWT_SECRET before any real deployment
npm run migrate            # creates the SQLite schema
npm run dev                # runs the API (port 4000) and the frontend (port 5173)
```

Puppeteer downloads a bundled Chromium during `npm install` for PDF generation. If your
network blocks that download (as some CI/sandbox environments do), install with
`PUPPETEER_SKIP_DOWNLOAD=true npm install` and separately run
`npx puppeteer browsers install chrome` once you have full network access — PDF
generation will otherwise fail gracefully (logged, but doesn't break the rest of the
pipeline; the result is still saved and viewable in the browser).

In a separate terminal, start the background worker (required for monitoring to run
without the API process; see §11):

```bash
npm run worker
```

Optionally seed a demo admin + example profile:

```bash
npm run seed --prefix server
```

---

## 5. Environment variables

All in `server/.env` (see `server/.env.example`):

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development` / `production` / `test` |
| `PORT` | API port (default 4000) |
| `CLIENT_URL` | Frontend origin, used for CORS and links in emails |
| `DATABASE_PATH` | Path to the SQLite file |
| `JWT_SECRET` | **Must** be a long random string in production |
| `JWT_EXPIRES_IN` | Session length, e.g. `7d` |
| `COOKIE_SECURE` | Set `true` behind HTTPS |
| `RESULT_MONITOR_INTERVAL_MINUTES` | Default check interval for new profiles |
| `RESULT_REQUEST_TIMEOUT_MS` | Timeout per SGBAU request |
| `RESULT_MAX_RETRIES` | Retries (exponential backoff) for transient failures |
| `SGBAU_RESULT_URL` / `SGBAU_RESULT_SEARCH_ENDPOINT` | The live SGBAU result portal |
| `EMAIL_ENABLED` + `SMTP_*` + `EMAIL_FROM` | Optional email notifications |
| `MOCK_RESULT_MODE` | **Dev only.** Uses the fake adapter instead of SGBAU. The app refuses to boot with this `true` when `NODE_ENV=production`. |
| `UPLOAD_DIR` / `PDF_OUTPUT_DIR` | Local storage for uploads and generated PDFs |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used only by the optional seed script |

Never commit `.env`. `.gitignore` already excludes it.

---

## 6. Database

SQLite via `better-sqlite3`, schema in `server/src/database/schema.sql`. Run
`npm run migrate --prefix server` (or the root `npm run migrate`) to create/update all
tables: `users`, `student_profiles`, `results`, `subjects`, `monitoring_logs`,
`notifications`, `settings`. Column types and query patterns avoid SQLite-only features
beyond `AUTOINCREMENT`, so migrating to PostgreSQL/Supabase later mainly means swapping
`database/db.js` for a Postgres client and adjusting placeholder syntax.

---

## 7. Development

```bash
npm run server     # API only, nodemon, port 4000
npm run client      # frontend only, Vite, port 5173
npm run worker      # standalone background worker
npm run dev          # server + client together
```

### Mock mode

```bash
# server/.env
MOCK_RESULT_MODE=true
```

With mock mode on, `universities/index.js` swaps in `universities/mock/adapter.js`,
which returns `RESULT_NOT_DECLARED` on a profile's first check and a clearly-labelled
`DEVELOPMENT MOCK RESULT` (fake SGPA/CGPA/subjects) on every check after that — letting
you exercise parsing → verification → saving → PDF → notification end-to-end without
ever contacting SGBAU. **Never set this to `true` in production** — the app enforces
this at startup.

---

## 8. Testing

```bash
npm test --prefix server
```

33 tests across:
- `parser.test.js` — SGBAU HTML parsing: not-declared detection, field extraction,
  and refusing to fabricate missing fields
- `hash.test.js` — deterministic, order-independent duplicate-protection hashing
- `verification.test.js` — roll-number-anchored student verification
- `auth.test.js` — register/login/duplicate-email/wrong-password/session auth
- `monitoring.test.js` — the full pipeline via the mock adapter: not-declared → found →
  duplicate-skip → isolated per-profile error handling → logging
- `pdf.test.js` — the PDF HTML template (escaping, non-official labelling, filename
  format) — this **does not** require a real Chromium binary
- `security.test.js` — cross-user result isolation, admin-route gating, input validation

Actually rendering a PDF (`pdf/pdfGenerator.js`) requires the Chromium binary Puppeteer
manages; that code path is exercised in normal use and manually, not by the offline test
suite, since some sandboxes block the Chromium download (see §4).

---

## 9. The SGBAU adapter — how it works, and its real limitations

SGBAU publishes results through its **Smart Examination System** portal at
`https://sgbau.ucanapply.com/result-details` (confirmed live). The page presents a
search form — Session, Course Type, Course, Result Type, Roll No, Semester — and exposes
a CSRF token. `universities/sgbau/fetcher.js` loads that page, extracts the CSRF token
and session cookie, and submits the search; `parser.js` classifies the response as
"not declared", "found", or "unrecognized" and extracts whatever fields are present
without ever inventing values; `adapter.js` wires this into the standard
`checkResult(profile)` interface every university adapter implements.

**Honest limitation:** the exact HTML `name="..."` attributes for each form field, and
whether the live search is a plain form POST or an AJAX/JSON call, could not be fully
confirmed through static inspection alone — SGBAU's dropdowns are populated by
client-side JavaScript. `universities/sgbau/config.js` centralizes these field-name
assumptions (overridable via `SGBAU_FIELD_*` env vars) so they can be corrected in one
place after verifying the real request in your browser's Network tab. Until verified,
the parser is deliberately conservative: if a response can't be confidently classified,
the adapter reports `RESULT_FAILED` with an explanation rather than guessing.

**Security rule the adapter always follows:** it never attempts to bypass CAPTCHA,
OTP, login, or other anti-bot protections. If the fetcher detects a CAPTCHA challenge or
an access-control response (HTTP 403/429, a verification page), it stops and reports
`RESULT_FAILED`, and the UI directs the student to the **manual upload fallback**
(`/settings`): open the official page yourself, complete any required verification, then
upload the resulting PDF/screenshot. The app extracts and verifies that upload the same
way it would an automated result.

---

## 10. Adding another university

1. Create `server/src/universities/<code>/{adapter,fetcher,parser,config}.js`.
2. Implement `async function checkResult(profile)` returning
   `{ status, data, sourceReference, message }` with the same `status` values used by
   the SGBAU adapter (see the interface doc-comment at the top of
   `universities/sgbau/adapter.js`).
3. Register it in `server/src/universities/index.js`, keyed by the `university` string
   stored on the profile (e.g. `"RTMNU"`).

No other file needs to change — `monitoringService.js` looks up the adapter dynamically.

---

## 11. Deployment

Keep the architecture portable:

```text
Frontend (client/)         → Vercel / Netlify / any static host (npm run build → dist/)
Backend API (server/)      → Render / Railway / Fly.io / a small VPS
Background worker          → the SAME service as the API, run as a second process/dyno
Database                   → SQLite file on persistent disk for simple deployments,
                              or swap database/db.js for Postgres later
```

**The most important requirement is that the background scheduler actually keeps
running.** `server/src/workers/scheduler.js` is a standalone Node process
(`npm run worker`) — it does **not** depend on a browser tab, and it must be run as its
own persistent process, not inside a request handler.

Many free hosting tiers put web services to sleep after inactivity or don't support a
second persistent worker process at all. If your chosen host can't run
`workers/scheduler.js` continuously:

- Do **not** claim monitoring is "automatic" — the UI text in `Dashboard.jsx` describes
  what actually runs.
- Instead, expose a protected HTTP endpoint that calls the same `runDueChecks()`
  function (`services/monitoringService.js`) and trigger it from a legitimate free
  external scheduler (e.g. a GitHub Actions cron workflow, or your host's own "cron job"
  add-on, if one exists) hitting that endpoint every 5–15 minutes. This keeps the exact
  same duplicate-protected, error-isolated pipeline — only the trigger mechanism
  changes.
- Whatever you choose, document it for your users so expectations match reality.

Never assume a "free" tier stays free or available indefinitely — check the current
terms of whichever provider you deploy to before relying on it.

---

## 12. Security notes

- Passwords: bcrypt (cost 12), never stored or logged in plaintext.
- Sessions: JWT in an HTTP-only, `SameSite=Lax` cookie (`COOKIE_SECURE=true` behind
  HTTPS in production).
- `helmet`, scoped `cors`, and layered rate limiting (auth endpoints, the manual
  "Check Now" button, and a general API limiter) are applied in `app.js`.
- All SQL uses parameterized queries via `better-sqlite3` prepared statements.
- Errors are sanitized before being sent to clients; stack traces are logged, not
  returned, in production.
- Roll numbers are masked in logs and in the admin monitoring-log view
  (`25BD****55`), never logged or displayed in full outside the owning user's own
  screens.
- `.env` is git-ignored; `.env.example` documents every variable without real values.

---

## 13. What this app deliberately does NOT do

- It does not bypass CAPTCHA, OTP, login, or any other access control on the SGBAU
  portal — see §9.
- It does not fabricate, guess, or pre-fill a result. Until a real result is retrieved
  and verified, the UI says "Result Not Declared."
- It does not hammer the SGBAU server — checks are timeout-bound, retried with
  exponential backoff only on transient failures, and rate-limited per profile.
- It does not generate anything that could be mistaken for an official SGBAU
  certificate — every generated PDF is clearly labelled
  "STUDENT-GENERATED RESULT REPORT... NOT an official university certificate."
