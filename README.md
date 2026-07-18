# Pixy AI 🤖

Pixy AI is an AI-powered Discord ticket assistant with guild-scoped knowledge, safe ticket actions, human escalation, and interactive server settings.

## Current version

`v0.5 development`

## Main features

- AI replies inside configured ticket channels
- Per-server learned Q&A and free-form knowledge
- Safe close, rename, and escalation actions
- Configurable support routes and escalation notifications
- `/pixy-settings` for guild-scoped feature controls
- Per-guild Groq credentials encrypted at rest
- Per-guild text/reasoning model selection
- Guild-isolated usage logs and data reset

## Commands

### `/pixy-setup`

Configure the ticket category for the current server.

### `/pixy-learn`

Add, list, delete, or clear server-specific learned knowledge.

### `/pixy-admins`

Configure escalation roles, routing descriptions, categories, and notifications.

### `/pixy-settings`

Administrators can configure:

- AI reply, close, rename-review, escalation, and agent-action feature flags
- A server-specific Groq API key
- The Groq text/reasoning model used by the server
- Custom blocked words

Groq API keys are entered through an ephemeral Discord modal, validated with Groq, encrypted with AES-256-GCM, and then stored in the database. Existing keys are never displayed or prefilled.

The default model is `openai/gpt-oss-120b`. The model selector shows only models that are both approved by Pixy and currently available to the server's Groq key.

There is no global Groq API-key fallback. A server must configure its own key before AI features can run.

### `/pixy-clear`

Delete all Pixy database data for the current server, including its encrypted Groq credential and model selection. Discord channels and roles are not deleted.

## Plans and usage

Trials, payments, subscriptions, quotas, and plan-based model restrictions are not implemented yet. The Plans & Usage page is informational only.

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

# NODE_ENV=production
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
