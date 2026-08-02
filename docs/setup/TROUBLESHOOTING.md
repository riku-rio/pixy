# Pixy AI Tickets setup troubleshooting

## Docker is unavailable

Check Docker and Docker Compose:

```powershell
docker version
docker compose version
```

On Windows, start Docker Desktop. On Ubuntu, run:

```bash
sudo systemctl enable --now docker
```

## Port 3306 is already in use

Pixy AI Tickets binds its bundled MySQL service to `127.0.0.1:3306`.

Inspect active containers:

```powershell
docker ps
```

Stop the database from the Pixy AI Tickets directory when it is no longer needed:

```powershell
npm run db:down
```

Do not change only `DATABASE_URL`. A host-port change must also be reflected in `docker-compose.yml`.

## Prisma cannot connect to MySQL

Confirm that:

- `npm run db:up` completed successfully.
- The MySQL container is healthy in `docker ps`.
- The username, password, and database name in `.env` match `.env.docker`.
- `DATABASE_URL` uses host port `3306` for the bundled local database.
- Special characters in the database password are URL-encoded in `DATABASE_URL`.

Then retry in order:

```powershell
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Environment files already exist

Avoid overwriting configured secrets. On Windows:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
if (-not (Test-Path .env.docker)) { Copy-Item .env.docker.example .env.docker }
```

On Ubuntu:

```bash
[ -f .env ] || cp .env.example .env
[ -f .env.docker ] || cp .env.docker.example .env.docker
```

## Discord slash commands are not visible yet

Pixy AI Tickets registers global slash commands, which can take time to propagate. Confirm that the bot is online, the application was invited with the required scopes, and `DISCORD_CLIENT_ID` belongs to the same application as `DISCORD_TOKEN`.

## Stored Groq credentials cannot be decrypted

Pixy AI Tickets requires the same stable `PIXY_CREDENTIAL_ENCRYPTION_KEY` across restarts and deployments. A database backup without the matching key cannot recover encrypted guild credentials. Restore the correct key or replace affected guild credentials through Pixy settings.

## Clean local restart

A normal restart preserves database data:

```powershell
npm run db:down
npm run db:up
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm start
```

Use `npm run db:clear -- --confirm` only when intentionally deleting all application rows. It is destructive and is not a normal troubleshooting step.
