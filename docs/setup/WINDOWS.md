# Windows quick start

This guide uses PowerShell and Docker Desktop. Run the commands for each repository in a separate directory.

## Prerequisites

- Git
- Node.js 20 or newer
- Docker Desktop with Docker Compose enabled
- A Discord application and bot token for each project

Make sure Docker Desktop is running before starting either database.

## Pixy AI Tickets

### Clone into the current empty directory

```powershell
git clone https://github.com/riku-rio/pixy-ai-tickets .
```

### Or update an existing clone

```powershell
git pull origin main
```

Create the local environment files:

```powershell
Copy-Item .env.example .env ; Copy-Item .env.docker.example .env.docker
```

Fill `.env` and `.env.docker` with the real values. The database name, username, and password in `DATABASE_URL` must match the values in `.env.docker`. Pixy AI Tickets publishes its local MySQL service on `127.0.0.1:3306`.

Install dependencies and start the database:

```powershell
npm ci ; npm run db:up
```

Generate Prisma Client, apply migrations, and seed the database in this order:

```powershell
npm run prisma:generate ; npm run prisma:migrate ; npm run prisma:seed
```

Start the bot locally:

```powershell
node .
```

`npm start` is equivalent to `node .`.

## Pixy System

### Clone into the current empty directory

```powershell
git clone https://github.com/riku-rio/pixy-system .
```

### Or update an existing clone

```powershell
git pull origin main
```

Create the local environment files:

```powershell
Copy-Item .env.example .env ; Copy-Item .env.docker.example .env.docker
```

Fill `.env` and `.env.docker` with the real values. The database name, username, and password in `DATABASE_URL` must match the values in `.env.docker`. Pixy System publishes its local MySQL service on `127.0.0.1:3308`.

Install dependencies and start the database:

```powershell
npm ci ; npm run db:up
```

Generate Prisma Client and apply migrations:

```powershell
npm run prisma:generate ; npm run prisma:migrate
```

Start the bot locally:

```powershell
node .
```

Pixy System currently has no database seed step.

## Stop a local database

Run this inside the relevant repository:

```powershell
npm run db:down
```

## Safe update sequence

Stop the bot process, pull the latest changes, then run:

```powershell
npm ci ; npm run db:up
npm run prisma:generate ; npm run prisma:migrate
```

For Pixy AI Tickets, run the idempotent seed step after migrations:

```powershell
npm run prisma:seed
```

Then restart the bot with `node .` or `npm start`.
