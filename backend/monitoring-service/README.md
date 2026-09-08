# monitoring-service

NestJS service owning `master_db` (`employees`, `departments`). Handles HRD Admin CRUD for
employees/departments and read-only attendance monitoring (reads `attendance_db` via a
read-only connection). See the [repo root README](../../README.md) for how to run the whole
app, and [AGENTS.md](../../AGENTS.md) for the full spec this implements.

## Scripts

- `npm run start:dev` — run on `:3002` in watch mode
- `npm run build` — type-check + compile to `dist/`
- `npm run seed` — creates 2 departments (HRD, Engineering) + one HRD_ADMIN and one EMPLOYEE
  login for local testing
- `npm test` / `npm run test:e2e` — unit / e2e tests

Copy `.env.example` to `.env` and adjust if your MySQL credentials differ.
