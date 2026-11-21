# Secret Santa App

## Description

This Secret Santa App is a web application built with Next.js and TypeScript. It allows users to organize a Secret Santa gift exchange by adding participants, randomly assigning Secret Santas, and sending out email notifications.

## Features

- Add, edit, and remove participants
- Responsive design for mobile and desktop
- Persistent storage of participants using local storage
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

## Database foundation (Neon + Drizzle)

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

The initial schema has three tables:

- `guest_sessions`: anonymous organizer IDs, unique session-token hashes, creation
  and expiration timestamps. Generate a cryptographically random secret on the
  server, store only its SHA-256 hash here, and put the secret in a secure,
  HttpOnly cookie when the session flow is implemented.
- `exchanges`: the owning guest session, list name, optional nonnegative budget,
  and status (`draft` or `drawn`). Budgets use decimal storage and are returned
  as strings by the database driver.
- `participants`: names and emails belonging to an exchange. Email addresses
  must be unique within each exchange, ignoring case.

Deleting a guest session cascades to its exchanges and participants; deleting an
exchange cascades to its participants. Expiration alone does not delete rows.

Use `getDb()` from `src/db/index.ts` only in server-side Node.js code. It lazily
creates a small connection pool and reuses it across development reloads.
Database credentials are not required merely to build the app.

This is the database foundation only. The UI still saves drafts in localStorage;
anonymous cookies, recovery links, database-backed UI actions, and assignments
are not implemented yet. Before exposing database reads or writes, each server
action must validate the session's expiration and ownership of the exchange.
Foreign keys alone do not authorize access.

## CI checks

GitHub Actions runs three independent jobs on pushes and pull requests using
Node.js 26: lint, types, and unit tests; a production build; and Playwright UI tests.
No email secrets are required for CI.

Run the same checks locally:

```bash
npm run lint        # Check source, tests, and configs; warnings fail CI
npm run typecheck   # Generate Next.js route types, then check TypeScript
npm test           # Run unit tests
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
npm test -- tests/unit/storage.test.ts  # Run a single file
```

Vitest runs `tests/unit/**/*.test.ts` in Node, separately from Playwright.
The tests cover email validation, storage persistence and failure recovery,
assignment invariants, and notification failures. DNS and email transport are
mocked; no credentials or external services are required.

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
Each test starts with fresh browser storage. No email credentials are needed:
the test server overrides them with empty values and the browser fixture blocks
POST requests, including Next.js Server Actions.

Coverage includes setup with and without a budget, validation, list and participant
editing, deletion, persistence after reload, the three-participant assignment
requirement, and help navigation. Actual assignment and email delivery are outside
this suite; the tests stop at checking whether assignment is enabled.

Add tests under `tests/e2e/` and import `test` and `expect` from `./fixtures`
to keep the request blocking in place. Prefer role and label locators.
Failures save screenshots and traces in `test-results/`; the HTML report links
to these artifacts. The `CI` GitHub Actions workflow uploads Playwright reports
for seven days.

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
