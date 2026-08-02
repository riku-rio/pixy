# Ubuntu quick start

This guide targets Ubuntu 22.04 or newer and uses Docker Engine with the Docker Compose plugin. Run each project in its own directory.

## Prerequisites

Install Git, Node.js 20 or newer, Docker Engine, and the Docker Compose plugin. Confirm the tools are available:

```bash
git --version
node --version
npm --version
docker --version
docker compose version
```

Start Docker and enable it at boot:

```bash
sudo systemctl enable --now docker
```

To run Docker without `sudo`, add your user to the Docker group, then sign out and back in:

```bash
sudo usermod -aG docker "$USER"
```

## Pixy AI Tickets

### Clone into the current empty directory

```bash
git clone https://github.com/riku-rio/pixy-ai-tickets .
```

### Or update an existing clone

```bash
git pull origin main
```

Create the local environment files:

```bash
cp .env.example .env
cp .env.docker.example .env.docker
```

Fill `.env` and `.env.docker` with the real values. The database name, username, and password in `DATABASE_URL` must match `.env.docker`. The local MySQL service is published on `127.0.0.1:3306`.

Install dependencies and start the database:

```bash
npm ci
npm run db:up
```

Generate Prisma Client, apply migrations, and seed the database:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Start the bot:

```bash
node .
```

`npm start` is equivalent to `node .`.

## Pixy System

### Clone into the current empty directory

```bash
git clone https://github.com/riku-rio/pixy-system .
```

### Or update an existing clone

```bash
git pull origin main
```

Create the local environment files:

```bash
cp .env.example .env
cp .env.docker.example .env.docker
```

Fill `.env` and `.env.docker` with the real values. The database name, username, and password in `DATABASE_URL` must match `.env.docker`. Pixy System publishes MySQL on `127.0.0.1:3308`.

Install dependencies and start the database:

```bash
npm ci
npm run db:up
```

Generate Prisma Client and apply migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Start the bot:

```bash
node .
```

Pixy System currently has no seed command.

## Stop a local database

Run this inside the relevant repository:

```bash
npm run db:down
```

## Safe update sequence

Stop the bot process, pull the latest changes, then run:

```bash
git pull origin main
npm ci
npm run db:up
npm run prisma:generate
npm run prisma:migrate
```

For Pixy AI Tickets, also run:

```bash
npm run prisma:seed
```

Then restart with `node .` or `npm start`.
