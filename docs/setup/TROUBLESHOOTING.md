# Local setup troubleshooting

## Docker is not running

Check Docker before starting the database:

```powershell
docker version
docker compose version
```

On Windows, start Docker Desktop. On Ubuntu, run:

```bash
sudo systemctl enable --now docker
```

## The database port is already in use

Pixy AI Tickets binds MySQL to `127.0.0.1:3306`. Pixy System binds MySQL to `127.0.0.1:3308`.

Inspect active containers:

```powershell
docker ps
```

Stop the database belonging to the current repository when it is no longer needed:

```powershell
npm run db:down
```

Do not change only `DATABASE_URL`; any host-port change must also be reflected in `docker-compose.yml`.

## Prisma cannot connect to MySQL

Confirm that:

- `npm run db:up` completed successfully.
- The database container reports healthy in `docker ps`.
- The username, password, and database name in `.env` match `.env.docker`.
- Pixy AI Tickets uses port `3306` and Pixy System uses port `3308`.
- Special characters in a database password are URL-encoded inside `DATABASE_URL`.

Then retry in order:

```powershell
npm run prisma:generate
npm run prisma:migrate
```

For Pixy AI Tickets, follow migrations with:

```powershell
npm run prisma:seed
```

## Environment files already exist

Avoid overwriting configured secrets. Create a template copy only when the destination does not exist:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
if (-not (Test-Path .env.docker)) { Copy-Item .env.docker.example .env.docker }
```

On Ubuntu:

```bash
[ -f .env ] || cp .env.example .env
[ -f .env.docker ] || cp .env.docker.example .env.docker
```

## Discord commands are not visible yet

Pixy AI Tickets registers global slash commands. Discord can take time to propagate global command updates. Confirm that the bot is online, the application was invited with the required scopes, and `DISCORD_CLIENT_ID` belongs to the same application as `DISCORD_TOKEN`.

## Stored Groq credentials cannot be decrypted

Pixy AI Tickets requires the same stable `PIXY_CREDENTIAL_ENCRYPTION_KEY` across restarts and deployments. Restoring only the database without the matching key does not restore encrypted guild credentials. Replace affected guild credentials through Pixy settings after correcting the key configuration.

## Clean local restart

A normal restart preserves database data:

```powershell
npm run db:down
npm run db:up
npm run prisma:generate
npm run prisma:migrate
```

Use `npm run db:clear -- --confirm` only when intentionally deleting all application rows. It is destructive and is not a general troubleshooting step.
