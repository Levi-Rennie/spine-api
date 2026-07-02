cat > README.md << 'EOF'
# Spine API

NestJS backend for Spine, a library loans manager. Serves loan and member
data from PostgreSQL over a small REST API.

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ running locally

## Setup

1. Install dependencies:

```bash
   npm install
```

2. Create the database and load the schema and seed data:

```bash
   createdb practice
   psql -d practice -f schema.sql
   psql -d practice -f seed.sql
```

3. Create a `.env` file (copy the example and fill in your own credentials):

```bash
   cp .env.example .env
```

   Then set `DATABASE_URL` to point at your local database:
   ## Running

```bash
npm run start:dev
```

The API listens on **port 3000** by default (override with the `PORT` env var).
It binds to `127.0.0.1`, and CORS is enabled for the web app on port 3001.

## Endpoints

- `GET /items` — all loans, joined with member details
- `GET /items/:id` — a single loan by id
- `POST /items` — create a loan (validated with Zod)
EOF