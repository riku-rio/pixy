# Pixy AI 🤖

Pixy AI is an AI-powered Discord ticket assistant built for modern support servers. It combines AI replies, server knowledge, safe AI actions, human escalation, and interactive ticket controls while keeping every action validated before execution.

> **Current Version:** `v0.4.3`

---

# Features

## v0.1

* Slash & Prefix commands
* Event handler
* Prisma + SQLite
* `/pixy-setup`
* Automatic ticket detection
* Welcome messages

## v0.2

* AI ticket replies
* Groq integration
* `/pixy-learn`
* Custom server knowledge (Q&A)
* Knowledge management (list/delete/clear)
* AI context injection

## v0.3

* Add New Learn Items Form (Freeform)
* AI Agent Actions
* Safe Close Ticket
* Safe Rename Ticket
* Action validation
* Security guardrails
* Action logging

## v0.4 / v0.4.3

### Human Escalation

* ✅ `/pixy-admins` command for configuring support routing
* ✅ Multiple support/admin routes per server
* ✅ Escalation Categories
* ✅ Automatic Notification Channel
* ✅ Escalation Notification System
* ✅ AI chooses the best support role
* ✅ Manual support role selection
* ✅ Ticket move + rename during escalation
* ✅ Safe role mentions only
* ✅ Fully validated escalation flow

### Ticket Controls

* Interactive Select Menu
* Rename Ticket
* Close Ticket
* Escalate Ticket
* Let Pixy decide automatically
* Or manually choose the destination support team

### AI Rename Review

* AI reviews requested ticket names
* Rejects profanity and unsafe names
* Discord-safe channel names
* Blocked words support
* Validation before rename

### Admin Routing

* Configure support teams with `/pixy-admins`
* Role descriptions help AI choose correctly
* Route limits per server
* Route management (Add/List/Delete/Clear)

### Server Data Reset

* Delete all Pixy database data for the current server with `/pixy-clear`
* Delete guild configuration, learned knowledge, admin routes, ticket records, and AI usage logs
* Keep Discord channels and roles unchanged
* Require Administrator permission and confirmation

### Security & Hardening

* Action validation
* Safer AI outputs
* Escalation validation
* Rename validation
* Notification validation
* Additional hardening improvements

---

# Commands

## /pixy-setup

Configure the ticket category for the current server.

## /pixy-learn

Manage server-specific learned knowledge.

Actions:

* Add Q&A
* Add free-form knowledge
* List items
* Delete an item
* Clear all items

## /pixy-admins

Configure human escalation and support routing.

Actions:

* Add Route
* List Routes
* Delete Route
* Clear Routes
* Configure Escalation Category

## /pixy-clear

Delete all Pixy database data stored for the current server.

This includes:

* Guild configuration
* Learned knowledge
* Admin routes
* Ticket records
* AI usage logs

Discord channels and roles are not deleted. Administrator permission and confirmation are required.

---

# Tech Stack

* Node.js
* discord.js v14
* Prisma ORM
* SQLite
* Groq AI

---

# Development

Install dependencies using the committed lockfile:

```bash
npm ci
```

Generate the Prisma client:

```bash
npm run prisma:generate
```

Apply committed database migrations:

```bash
npm run prisma:migrate
```

For local schema development:

```bash
npm run prisma:migrate:dev
```

Run the test suite:

```bash
npm test
```

Run only the guild-isolation test:

```bash
npm run test:guild-isolation
```

Start Pixy:

```bash
npm start
```

---

# Database

The database includes support for:

* Guild Configuration
* Ticket Channels
* Learned Knowledge
* Admin Routes
* Escalation Configuration
* Escalation Notification Channel
* AI Configuration
* AI Usage Logs

See `prisma/schema.prisma` for the complete schema.

---

# Environment Variables

Some settings are temporary and are planned to become configurable through `/pixy-settings` instead of `.env`.

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

# Groq

GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant

# Provider

AI_PROVIDER=groq
AI_MAX_OUTPUT_TOKENS=500
AI_TEMPERATURE=0.3
AI_REPLY_COOLDOWN_MS=3000
AI_MAX_INPUT_CHARS=2500
AI_RECENT_MESSAGES_LIMIT=8

# Agent Actions

AI_AGENT_ACTIONS_ENABLED=true
AI_TICKET_CLOSE_DELETE_DELAY_MS=2500
AI_ACTION_MAX_REPLY_CHARS=1000

# Escalation

AI_ESCALATION_ENABLED=true
ADMIN_ROUTES_MAX_PER_GUILD=10

# Rename Review and Blocked Words

AI_RENAME_REVIEW_ENABLED=true
AI_ESCALATION_NOTIFICATION_CHANNEL_NAME=pixy-notifications
AI_RENAME_BLOCKED_WORDS=fuck,fucking,fuk,shit,bitch,nigga
```

Never commit real tokens, API keys, client secrets, or production credentials.

---

# Roadmap

## v0.5 — Payments & Server Configuration

Planned work:

* Payment System
* Payment workflow
* Trial system
* `/pixy-settings` command
* Per-server configuration overrides
* Move more `.env` options into per-server configuration
* Better admin experience
* More hardening
* Additional AI improvements

## v1.0 — Production Release

* Complete end-to-end review
* Full testing on a fresh Discord server
* Fresh bot deployment testing
* Final bug fixing
* Production deployment
* Documentation cleanup
* Stable release

---

Made with ❤️ by Pixy Team.
