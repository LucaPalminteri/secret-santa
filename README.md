# Secret Santa App

## Description

This Secret Santa App is a web application built with Next.js and TypeScript. It allows users to organize a Secret Santa gift exchange by adding participants, randomly assigning Secret Santas, and sending out email notifications.

## Features

- Add, edit, and remove participants
- Responsive design for mobile and desktop
- Database-backed drafts with anonymous organizer sessions
- Random assignment of Secret Santas
- Email notifications to participants with their assigned recipient
- Festive UI with Christmas theme

## Technologies Used

- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui components
- Node.js (for email sending)

## Installation

1. Clone the repository:

   ``` bash
   git clone https://github.com/LucaPalminteri/secret-santa.git
   cd secret-santa
   ```

2. Install dependencies:

   ``` node
   npm install
   ```

3. Create a `.env.local` file in the root directory and add your Gmail credentials:

   ``` env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

   Note: For Gmail, you'll need to use an "App Password". You can generate one in your Google Account settings under Security > 2-Step Verification > App passwords.

   <https://knowledge.workspace.google.com/kb/how-to-create-app-passwords-000009237>

## Usage

1. Start the development server:

   ``` node
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:3000`

3. Add participants by entering their names and email addresses

4. Once you have at least 3 participants, click the "Asignar Secret Santas" button to randomly assign Secret Santas and send email notifications

## Database (Neon + Drizzle)

Add both Neon connection strings to `.env` or `.env.local` (local overrides `.env`):

```env
DATABASE_URL="<pooled Neon connection string>"
DATABASE_URL_UNPOOLED="<direct Neon connection string>"
```

Both URLs target the same database. The application uses the pooled URL (the
hostname contains `-pooler`); Drizzle Kit uses the direct URL for migrations.
Keep Neon's TLS parameters. These are server secrets: never prefix them with
`NEXT_PUBLIC_` or commit their values. Set the variables in your hosting
provider's environment settings too.

```bash
npm run db:check      # Verify both connections with SELECT 1; hides credentials
npm run db:generate   # Generate a SQL migration after editing src/db/schema.ts
npm run db:migrate    # Apply pending migrations to the configured database
npm run db:studio     # Browse the configured database locally
```

Review and commit generated migrations under `drizzle/`. Run migrations as a
separate deployment step, rather than during requests or production builds.

The schema has four tables:

- `guest_sessions`: anonymous organizer IDs, unique session-token hashes, creation
  and expiration timestamps. Generate a cryptographically random secret on the
  server, store only its SHA-256 hash here, and put the secret in a secure,
  HttpOnly cookie. Sessions last 90 days; the cookie uses HTTPS in production.
- `exchanges`: the owning guest session, list name, optional nonnegative budget,
  status (`draft` or `drawn`), save revision/key, and completion timestamp.
  Each organizer has at most one active exchange. Budgets use decimal storage.
- `participants`: names and emails belonging to an exchange. Email addresses
  must be unique within each exchange, ignoring case. An explicit position preserves list order.
- `assignments`: immutable sender/recipient pairs, delivery status, attempt count,
  exclusive delivery claim, and send timestamps.

Deleting a guest session cascades to its exchanges and participants; deleting an
exchange cascades to its participants. Expiration alone does not delete rows.

Use `getDb()` from `src/db/index.ts` only in server-side Node.js code. It lazily
creates a small connection pool and reuses it across development reloads.
Database credentials are not required merely to build the app.

The UI loads and saves through `/api/exchange`; confirming setup or an edit
saves to Neon. Failed saves keep form values and can be retried. Revisions
prevent stale tabs from overwriting newer saves, and save keys make retries
idempotent after a lost response. Requests validate the anonymous cookie,
expiration, ownership, input limits, and same-origin JSON writes. New sessions
are created only on the first save. There is no sign-up or legacy localStorage
import. Clearing cookies or switching devices loses access; recovery links are
not implemented yet. Expired sessions are rejected and records are retained;
there is no automatic retention cleanup yet.

The draw is persisted before any email is sent. Once drawn, a list is read-only.
Each delivery request claims and attempts one email; the browser continues while
pending emails remain. SMTP rejection is reported as a failure, not success.
Retries reuse the same assignments and skip successfully sent emails. Each email
has a maximum of five attempts. SMTP acceptance does not guarantee inbox delivery.

An interrupted/ambiguous send is marked `unknown` (or becomes unknown after a
2-minute claim timeout). It is never automatically resent: the UI explains the
risk of duplicate mail and offers an explicit resend. A stable Message-ID helps,
but SMTP cannot guarantee exactly-once delivery. Keep the page open until sending
finishes; after interruption, reopen the app and continue pending sends. There is
no background mail worker. Completing the success screen preserves the exchange
and allows a new draft. Discard only deletes an unfinished draft.
If delivery cannot be completed, the organizer can explicitly close the draw
without sending pending emails and start another. The original pairs and send
history remain stored. An already claimed send may still finish.

SMTP credentials remain server-only. No test should send real notifications.

## CI checks

GitHub Actions runs three independent jobs on pushes and pull requests using
Node.js 26: lint, types, unit tests, and database integration tests; a production build; and Playwright UI tests.
CI uses isolated PostgreSQL services and requires no Neon or email secrets.

Run the same checks locally:

```bash
npm run lint        # Check source, tests, and configs; warnings fail CI
npm run typecheck   # Generate Next.js route types, then check TypeScript
npm test           # Run unit tests
npm run test:integration # Verify persistence and mocked delivery in isolated PostgreSQL
npm run build      # Verify a production build
npm run test:e2e   # Run browser tests
```

ESLint excludes generated build output and test reports. Type checking generates
route types first, so it also works on a fresh clone before the app has been built.

## Unit tests

Use Node.js 26 to match the Vercel deployment and CI, then install dependencies
with `npm ci`.

```bash
npm test              # Run all unit tests once
npm run test:watch    # Re-run affected tests while editing
npm test -- tests/unit/draft.test.ts    # Run a single file
```

Vitest runs `tests/unit/**/*.test.ts` in Node, separately from Playwright.
The unit tests cover server input validation, assignment invariants, HTML escaping,
and notification failure classification. Email transport is mocked; unit tests
require no credentials or external services.

Unit tests give fast feedback on business rules and edge cases. Keep the E2E
tests too: they verify that the UI, navigation, and browser persistence work
together. For this app, the two suites cover different risks.

## UI tests

Playwright runs the UI tests on desktop Chromium and an emulated Pixel 5.
Install the test browser once after installing dependencies:

```bash
npx playwright install chromium
```

```bash
npm run test:e2e          # Run all UI tests headlessly
npm run test:e2e:ui       # Interactive runner: select, watch, and debug tests
npm run test:e2e:headed   # Watch tests in a browser window
npm run test:e2e:report   # Open the last HTML report
```

Run one scenario or device with Playwright's filters:

```bash
npm run test:e2e -- --project=chromium
npm run test:e2e -- --grep "adds, edits"
```

The runner starts and stops its own development server at
`http://127.0.0.1:3100`, using `.next-e2e` for build output so it can run
alongside your regular dev server. Port 3100 must be free.
Each browser test starts with fresh cookies. UI tests allow database requests,
block draw/delivery requests, and run with empty email credentials. Integration
tests mock the mail sender and verify sessions, ownership isolation, concurrent
saves/draws, retries, interrupted delivery, and completion. No real email is sent.

`npm run test:integration` and `npm run test:e2e` both use
`scripts/with-test-database.mjs`. Set `TEST_DATABASE_URL` to a dedicated local or
hosted PostgreSQL database whose name starts with `secret_santa_test`. The wrapper
refuses other database names and applies migrations before running the suite.
If unset, the wrapper uses `DATABASE_URL_UNPOOLED` to create a uniquely named
temporary database, runs the suite there, then drops only that temporary database.
That fallback requires database-creation privileges; application tables are never
used as test fixtures. CI provides its own PostgreSQL service.

Add browser tests under `tests/e2e/` and import `test` and `expect` from `./fixtures`
to preserve the email boundary. Prefer role and label locators. Failures save
screenshots and traces in `test-results/`; reports are uploaded by CI for seven days.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## TODO

- [] error on second step (amount), stuck in the middle
- [] error on main page, open keyboard on mobile
- [] move the info text to the bottom

Notes

- Required env vars: `EMAIL_USER`, `EMAIL_PASS` (used by server email-sending code).
- Current minimum participants: 3 (hardcoded check in `src/components/secret-santa.tsx`).

## License

This project is licensed under the MIT License.
