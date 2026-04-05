# Student Management System

Production-style monorepo: **FastAPI** + **PostgreSQL** (SQLAlchemy + Alembic) + **React (Vite)** with **Tailwind CSS** and **shadcn-style** UI primitives. Authentication uses **JWT access + refresh** tokens with role-based access (**admin**, **teacher**, **student**).

## Quick start (Docker)

1. Copy environment template:

   ```bash
   cp .env.example .env
   ```

2. Start all services:

   ```bash
   docker compose up --build
   ```

3. Open the UI at **http://localhost** and the API docs at **http://localhost:8000/docs**.

On first boot the backend runs **Alembic migrations**, then **`seed.py`** (skipped if data already exists).

### Demo accounts (after seed)

| Role    | Email                       | Password    |
|---------|-----------------------------|------------|
| Admin   | admin@demo.school           | Admin123!  |
| Teacher | teacher@demo.school         | Teacher123!|
| Student | alice.student@demo.school   | Student123!|
| Student | bob.student@demo.school     | Student123!|

## Local development (without Docker frontend)

- **Database**: run PostgreSQL 16+ and set `DATABASE_URL` in `backend/.env`.
- **Backend**:

  ```bash
  cd backend
  python -m venv .venv
  .venv\Scripts\activate   # Windows
  pip install -r requirements.txt
  set PYTHONPATH=.
  alembic upgrade head
  python seed.py
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  ```

- **Frontend**:

  ```bash
  cd frontend
  npm install
  set VITE_API_URL=http://localhost:8000
  npm run dev
  ```

## API documentation

- **Swagger UI**: `GET /docs`
- **ReDoc**: `GET /redoc`
- **OpenAPI JSON**: `GET /openapi.json` (import into Postman: *Import → Link*)

A starter **Postman collection** is in `postman/Student-Management-API.postman_collection.json`.

## Project layout

- `backend/` — FastAPI application, models, Alembic migrations, `seed.py`
- `frontend/` — Vite + React + TypeScript + Tailwind
- `docker/` — nginx config and backend entrypoint
- `docker-compose.yml` — Postgres, API, static UI

## Health check

`GET /health` returns `database: connected` or `disconnected`. The SPA shows a friendly message if PostgreSQL is unreachable.
