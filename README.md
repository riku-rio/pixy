# Pixy AI 🤖

Pixy AI is a public, multi-server Discord ticket assistant with guild-scoped knowledge, validated ticket actions, human escalation, interactive settings, and encrypted per-server Groq credentials.

## MVP scope

Pixy intentionally has no payments, subscriptions, free trials, plan states, or Pixy-managed request quotas. Every server supplies its own Groq API key.

## Main features

- AI replies inside configured ticket channels
- Per-server learned Q&A and free-form knowledge
- Validated close, rename, and escalation actions
- Configurable support routes and escalation notifications
- Per-guild feature flags enforced before actions execute
- Per-guild Groq credentials encrypted at rest
- Per-channel AI blacklist for transcript, ownership, or automation channels
- Guild-isolated usage logs and data deletion

## Server setup

1. Run `/pixy-setup` as a server administrator and choose the category where an external ticket bot creates ticket channels.
2. Run `/pixy-settings` and add the server's Groq API key.
3. Choose a Groq chat model when the default is not suitable.
4. Configure support routes with `/pixy-admins`.
5. Run `/pixy-blacklist action:Add`, then choose a non-conversation channel inside the configured ticket category.

Pixy registers global slash commands and is not tied to one Discord guild.

## Commands

- `/pixy-help` — interactive help and troubleshooting
- `/pixy-setup` — configure the ticket category
- `/pixy-learn` — manage server-specific knowledge
- `/pixy-admins` — configure escalation roles, categories, and notifications
- `/pixy-settings` — feature flags, Groq credentials, model, and blocked terms
- `/pixy-blacklist action:Add` — choose a ticket-category channel, optionally save a private reason, and exclude it from Pixy AI processing
- `/pixy-blacklist action:Remove` — choose an existing blacklist entry and restore the channel to Pixy AI when it is still inside the configured ticket category
- `/pixy-blacklist action:List` — show the current blacklist in an ephemeral embed
- `/pixy-clear` — delete all stored Pixy data for the current server

The blacklist command is one top-level slash command with an `action` choice. Add and Remove use private interactive menus, and List is only visible to the administrator who runs it.

Custom blocked terms are added and removed through Discord modals. To remove a term, the administrator types the exact term instead of searching through paginated select menus.

## Safety behavior

- Ticket history and learned server content are passed to the model as untrusted reference data, not system instructions.
- AI-generated text cannot ping users, roles, `@everyone`, or `@here`.
- AI close requests are rejected unless the current user message explicitly asks to close the ticket.
- Escalation preflights its role and notification channel, grants the selected support role ticket access, and rolls channel changes back when execution fails.
- Removing Pixy from a guild deletes that guild's stored configuration, credentials, knowledge, ticket records, blacklist entries, and detailed usage logs.

## Tech stack

- Node.js 20+
- discord.js 14
- Prisma ORM 7
- MySQL 8.4 locally and in production
- Groq SDK

## Environment variables

Create `.env` from `.env.example` and fill in the real values:

```env
NODE_ENV=production
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
PREFIX=^

# Database - MySQL

DATABASE_URL="mysql://pixy:pixy_local_password@127.0.0.1:3306/pixy"

# Credential Encryption

PIXY_CREDENTIAL_ENCRYPTION_KEY=
```

### `NODE_ENV`

Use `NODE_ENV=development` while developing locally and `NODE_ENV=production` for a deployed bot. The non-standard value `dev` is not recommended; use the full value `development`.

The application only treats the exact value `production` as production mode. Any other value is considered non-production behavior.

### Test database

`TEST_DATABASE_URL` is optional for production and can be omitted from the production `.env`. It is required when running the automated test suite against the separate test database:

```env
TEST_DATABASE_URL="mysql://pixy:pixy_test_password@127.0.0.1:3307/pixy_test"
```

When `NODE_ENV=test`, the database adapter uses `TEST_DATABASE_URL` when it is present.

### Credential encryption key

`PIXY_CREDENTIAL_ENCRYPTION_KEY` must be one stable, base64-encoded 32-byte key. Generate it in PowerShell:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Back up the encryption key separately from the MySQL backup. A database backup without the matching encryption key cannot recover stored guild Groq credentials.

Do not change the encryption key while encrypted guild credentials still exist. Rotating it makes data encrypted with the previous key unreadable. It is safe to generate a new key after clearing the application database or after confirming that no encrypted credentials remain.

Never commit Discord tokens, API keys, production database credentials, database backups, or encryption keys.

## Local development with Docker

For local development, set `NODE_ENV=development` and add `TEST_DATABASE_URL` to `.env`, then start the development and test databases:

```powershell
npm run db:up
```

Install dependencies and prepare the database:

```powershell
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Run tests and start Pixy:

```powershell
npm test
npm start
```

Stop the local databases:

```powershell
npm run db:down
```

The application and tests use MySQL so local behavior matches production. SQLite is not used as a development substitute.

## Clear all application data

Use the destructive database-clear command when preparing a fresh development server, replacing a test bot, resetting a deployment, or starting with an empty application database:

```powershell
npm run db:clear -- --confirm
```

The required `--confirm` flag prevents accidental execution. The command:

- Deletes rows from every application table discovered in the current MySQL database
- Handles foreign-key relationships safely
- Resets auto-increment counters where applicable
- Preserves the database schema
- Preserves Prisma's `_prisma_migrations` table and migration history
- Automatically includes application tables added by future Prisma models

This operation is destructive and cannot be undone without a backup. Stop the bot before clearing the database so it cannot write new records during the reset.

After clearing the database, a new `PIXY_CREDENTIAL_ENCRYPTION_KEY` may be generated safely because no encrypted guild credentials remain.

## Production deployment

Set `NODE_ENV=production`, provide a production `DATABASE_URL`, and keep `TEST_DATABASE_URL` out of the production environment unless production tests intentionally require it.

Deploy with:

```powershell
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm start
```

Run tests separately when the deployment environment has a configured test database:

```powershell
npm test
```

Use `prisma migrate deploy` through `npm run prisma:migrate` in production. Do not run `prisma migrate dev` against production.

## Data handling

Pixy stores Discord guild, channel, role, and optional user IDs; server-provided knowledge; feature and routing settings; encrypted Groq credentials; ticket state; and AI usage diagnostics. Ticket context is sent to the guild-selected Groq model when an AI response is requested. Hosts should publish an accurate privacy policy and retention policy before a public release.
