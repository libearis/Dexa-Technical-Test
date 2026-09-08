# frontend

React + Vite + React Router UI, role-based between the Employee (check-in/out, history) and
HRD Admin (dashboard, monitoring, employees, departments) views. Talks to both backend
services directly via two axios instances (`src/api/attendanceApi.js`,
`src/api/monitoringApi.js`). See the [repo root README](../README.md) for how to run the whole
app, and [AGENTS.md](../AGENTS.md) for the full spec this implements.

## Scripts

- `npm run dev` — start the Vite dev server (default `http://localhost:5173`)
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build locally

Copy `.env.example` to `.env` and adjust the API URLs if the backend services run elsewhere.
