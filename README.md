# Pixy AI 🤖

Pixy AI is an AI-powered Discord ticket assistant with guild-scoped knowledge, safe ticket actions, human escalation, interactive server settings, encrypted per-server Groq credentials, and daily usage controls.

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
- One-time seven-day free trial per guild
- Atomic per-guild daily AI request limits
- Guild-isolated usage logs and data reset

## Setup

Run `/pixy-setup` as a server administrator. The guided flow configures:

1. The ticket category.
2. The server's Groq API key and model.
3. Plans and usage, including optional free-trial activation.
4. A completion summary.

The setup flow uses **Back** and **Next** navigation. The regular `/pixy-settings` panel uses **Home**, **Back**, and **Close**.

## Commands

### `/pixy-setup`

Configure the ticket category, Groq API key, model, and optional free trial through one guided wizard.

### `/pixy-learn`

Add, list, delete, or clear server-specific learned knowledge.

### `/pixy-admins`

Configure escalation roles, routing descriptions, categories, and notifications.

### `/pixy-settings`

Administrators can configure:

- AI reply, close, rename-review, escalation, and agent-action feature flags
- Escalation status and route summary
- A server-specific Groq API key
- The Groq text/reasoning model used by the server
- Custom blocked words
- Plans, trial status, and current daily usage

Groq API keys are entered through an ephemeral Discord modal, validated with Groq, encrypted with AES-256-GCM, and stored in the database. Existing keys are never displayed or prefilled.

The default model is `openai/gpt-oss-120b`. Typed models are checked against the models available to the guild's Groq key and probed with a minimal chat completion before they are saved.

There is no global Groq API-key fallback. Every server must configure its own key before AI features can run.

### `/pixy-clear`

Delete all Pixy database data for the current server, including encrypted credentials, trial history, daily usage totals, settings, knowledge, routes, ticket records, and detailed usage logs. Discord channels and roles are not deleted.

## Plans and usage

Every guild starts with a Pixy allowance of **100 accepted AI requests per UTC day**.

A server administrator can activate one seven-day free trial from `/pixy-settings` → **Plans & Usage**, or during `/pixy-setup`. Activation requires a configured Groq API key and an explicit confirmation.

During the trial:

- The Pixy allowance is **1,000 accepted AI requests per UTC day**.
- The trial starts immediately and lasts exactly seven days.
- The guild's own Groq API key and selected model are always used.
- Groq project, model, token, organization, and upstream rate limits still apply.

At the exact trial end time, Pixy continues working with the normal **100 requests per UTC day** allowance. Removing the API key does not pause or extend the trial. Paid plans are not implemented yet.

AI requests are reserved atomically before Groq is called, preventing concurrent messages from exceeding the daily allowance. Normal ticket replies, AI rename review, AI escalation routing, and AI-assisted escalation consume the allowance. API-key validation, model validation, and non-AI manual actions do not consume it.

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
