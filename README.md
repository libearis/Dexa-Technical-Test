# Absensi WFH & Monitoring Karyawan

Implementation of the spec in [AGENTS.md](./AGENTS.md): two independent NestJS services
(`backend/attendance-service`, `backend/monitoring-service`) plus a React frontend
(`frontend/`).

## Prerequisites

- Node.js 20+
- A running MySQL 8 server, reachable with the credentials you put in each service's `.env`
  (copy `.env.example` to `.env` in each of `backend/attendance-service`,
  `backend/monitoring-service` and `frontend`, and fill in your own DB host/user/password)

Each service's `.env` holds its own DB/JWT config (`DB_MASTER_NAME=master_db`,
`DB_ATTENDANCE_NAME=attendance_db`). On first boot, both services auto-create their own
tables via `TypeORM synchronize` on their primary (owned) connection only — the read-only
secondary connection to the other service's database never synchronizes.

## First-time setup

```bash
# from repo root
cd backend/attendance-service && npm install
cd ../monitoring-service && npm install
cd ../../frontend && npm install
```

Start MySQL, then boot `monitoring-service` once (it owns `master_db.employees`/`departments`)
and seed a login for each role:

```bash
cd backend/monitoring-service
npm run start:dev   # let it create tables, then Ctrl+C or leave it running in another shell
npm run seed         # creates 2 departments (HRD, Engineering), 1 HRD_ADMIN, 1 EMPLOYEE
```

Seeded logins (login uses `username`, not email — see AGENTS.md §2.3):

| Role       | Username       | Password    |
| ---------- | -------------- | ----------- |
| HRD_ADMIN  | hrd.admin      | password123 |
| EMPLOYEE   | john.employee  | password123 |

## Running everything

In VS Code: `Terminal → Run Task…` → **Run: All (BE + FE)** (or **Run: Backend Only (BE)** /
**Run: Frontend Only (FE)**, or a single `Service: *` task — see `.vscode/tasks.json`).

Or manually, three processes each in its own terminal:

```bash
cd backend/attendance-service && npm run start:dev   # http://localhost:3001
cd backend/monitoring-service && npm run start:dev   # http://localhost:3002
cd frontend && npm run dev                            # http://localhost:5173 (Vite default)
```

Login is always through attendance-service (`POST /auth/login`) since it owns the check
against `master_db.employees`; the JWT it issues is accepted by both services because they
share `JWT_SECRET`. The frontend routes `EMPLOYEE` accounts to `/employee` (check-in/out +
history) and `HRD_ADMIN` accounts to `/hrd` (dashboard, monitoring, employees, departments).

## Notes / known limitations (see AGENTS.md §3.2, §8)

- EXIF-based photo validation can be defeated by a user who strips/edits metadata with
  dedicated tools — accepted trade-off for this scope, not a gap that was missed.
- HRD Admin monitoring is view-only by design; there is no edit/delete endpoint for
  attendance records.
- No message broker between services — plain REST via `@nestjs/axios`, wrapped in
  `EmployeeClientService` (attendance-service) so the dependency is explicit.
