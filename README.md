# Pixy AI 🤖

Pixy AI is a self-hosted Discord ticket assistant with guild-scoped knowledge, safe ticket actions, human escalation, interactive server settings, and encrypted per-server Groq credentials.

## MVP scope

This repository intentionally has no payments, subscriptions, free trials, plan states, or Pixy-managed request quotas. Every server supplies its own Groq API key and can run Pixy for as long as the host and upstream provider remain available.

## Main features

- AI replies inside configured ticket channels
- Per-server learned Q&A and free-form knowledge
- Safe close, rename, and escalation actions
- Configurable support routes and escalation notifications
- Real per-guild feature flags enforced before actions execute
- Per-guild Groq credentials encrypted at rest
- Per-guild text/reasoning model selection
- Guild-isolated usage logs and data reset

## Setup

1. Run `/pixy-setup` as a server administrator and choose the ticket category.
2. Run `/pixy-settings` and add the server's Groq API key.
3. Choose a Groq text/chat model if the default is not suitable.
4. Enable or disable the required features from the Features page.

`/pixy-settings` contains Features, Escalation, AI API, and Bad Words pages. It does not contain plans, payments, trials, or usage allowances.

## Commands

### `/pixy-setup`

Configure the ticket category for the current server.

### `/pixy-learn`

Add, list, delete, or clear server-specific learned knowledge.

### `/pixy-admins`

Configure escalation roles, routing descriptions, categories, and notifications.

### `/pixy-settings`

Administrators can configure feature flags, a server-specific Groq API key, the Groq model, escalation status, and custom blocked words.

Disabling a ticket action blocks it at the execution boundary. For example, when **Close Ticket** is disabled, an AI-generated `close_ticket` request cannot delete the channel.

Groq API keys are entered through an ephemeral Discord modal, validated with Groq, encrypted with AES-256-GCM, and stored in the database. Existing keys are never displayed or prefilled.

There is no global Groq API-key fallback. Every server must configure its own key before AI features can run.

### `/pixy-clear`

Delete all Pixy database data for the current server, including encrypted credentials, settings, knowledge, routes, ticket records, and detailed usage logs. Discord channels and roles are not deleted.

## Tech stack

- Node.js 20+
- discord.js 14
- Prisma ORM
- SQLite
- Groq SDK

## Development

Install dependencies:

```powershell
npm ci
```

Generate the Prisma client:

```powershell
npm run prisma:generate
```

Apply committed migrations:

```powershell
npm run prisma:migrate
```

Run tests:

```powershell
npm test
```

Start Pixy:

```powershell
npm start
```

## Environment variables

Create `.env` from `.env.example`:

```env
# Bot
NODE_ENV=development
DISCORD_TOKEN=
DISCORD_CLIENT_SECRET=
DISCORD_CLIENT_ID=
PREFIX=^

# Database
DATABASE_URL="file:./dev.db"

# Credential Encryption
PIXY_CREDENTIAL_ENCRYPTION_KEY=
```

`PIXY_CREDENTIAL_ENCRYPTION_KEY` must be a base64-encoded 32-byte random key. Generate one in PowerShell:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Keep the encryption key stable for the lifetime of the database. Changing or losing it makes previously stored guild credentials undecryptable.

Never commit Discord tokens, API keys, client secrets, production databases, or encryption keys.
