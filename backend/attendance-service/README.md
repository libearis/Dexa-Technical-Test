# attendance-service

NestJS service owning `attendance_db`. Handles login (validated against `master_db` via a
read-only connection), check-in/check-out with EXIF photo validation, and attendance history.
See the [repo root README](../../README.md) for how to run the whole app, and
[AGENTS.md](../../AGENTS.md) for the full spec this implements.

## Scripts

- `npm run start:dev` — run on `:3001` in watch mode
- `npm run build` — type-check + compile to `dist/`
- `npm test` / `npm run test:e2e` — unit / e2e tests

Copy `.env.example` to `.env` and adjust if your MySQL credentials differ.
