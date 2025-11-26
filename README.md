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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## TODO

- [ ] Amount as string (Medium) — Allow the global `amount` field to accept formatted strings (e.g., "$20", "€15.00") instead of only numeric values.
- [ ] Delete-edit bug (High) — Fix the bug where deleting a participant leaves the UI in a stale edit state or prevents editing others.
- [ ] Mobile action visibility (High) — Make edit/delete controls visible and usable on small screens (responsive layout).
- [ ] Global vs per-user UX (Medium) — Clarify or separate global fields (event name, amount) from per-user fields, or allow per-user overrides.
- [ ] Localization (Low) — Add i18n support for UI text and email templates.
- [ ] Post-send email errors (High) — Detect and surface delivery failures when an email was entered incorrectly; allow correction and re-send.
- [ ] Explain app flow (Medium) — Add a short, clear description of the page flow: add participants → assign → emails sent.

Additional recommended TODOs (based on code review)

- [ ] Make minimum participants configurable (Medium) — Replace the hardcoded `3` with a setting and show guidance in UI.
- [ ] Add a preview mode before sending emails (Medium) — Let the organizer preview assignments (with optional masking) before sending.
- [ ] Provide per-recipient delivery reporting & re-send (High) — Show which emails succeeded/failed and allow re-sending to failed recipients.
- [ ] Move email sending to background queue with retries (High) — Use a job queue (or background task) and retry logic to improve reliability.
- [ ] Allow CSV import/export of participants (Medium) — Facilitate bulk add/export and backups.
- [ ] Make email provider pluggable (Medium) — Support multiple providers (Nodemailer/Gmail, Resend, SendGrid) via configuration.
- [ ] Add unit tests for assignment algorithm (Medium) — Test shuffle, mapping, and edge cases.
- [ ] Add undo for delete and more descriptive toasts (Low) — Improve UX with an undo snackbar and consistent messages.
- [ ] Improve accessibility (Low) — Ensure ARIA live regions for toasts and clear error states on inputs.
- [ ] Sanitize/logging & remove secrets from repo (High) — Ensure env secrets are not committed and add guidance for `.env.local.example`.

Notes

- Required env vars: `EMAIL_USER`, `EMAIL_PASS` (used by server email-sending code).
- Current minimum participants: 3 (hardcoded check in `src/components/secret-santa.tsx`).

## License

This project is licensed under the MIT License.
