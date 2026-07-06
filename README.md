# Pixy AI 🤖

Pixy AI is an AI-powered Discord bot that automates ticket support by answering frequently asked questions inside ticket channels.

## Features

### v0.1

* ✅ Slash command handler
* ✅ Prefix command handler
* ✅ Event handler
* ✅ Automatic slash command registration
* ✅ Prisma + SQLite setup
* ✅ `/setup` command
* ✅ Ticket category configuration per guild
* ✅ Detect newly created ticket channels
* ✅ Store guild configuration in the database
* ✅ Store detected ticket channels
* ✅ Send a welcome message when a new ticket is created

### v0.2

* ✅ AI replies inside ticket channels
* ✅ Groq AI provider integration
* ✅ Basic AI capability guardrails
* ⏳ `/learn` command
* ⏳ Store custom Q&A per server
* ⏳ Context injection for learned Q&A

## Tech Stack

* Node.js
* discord.js v14
* Prisma ORM
* SQLite
* Groq

## Project Structure

```txt
src/
├── ai/
├── config/
├── events/
├── prefix/
├── slash/
├── utils/
```

## Setup

Install dependencies

```bash
npm install
```

Generate Prisma Client

```bash
npx prisma generate
```

Run migrations

```bash
npx prisma migrate deploy
```

Start the bot

```bash
node .
```

## Environment Variables

Create a `.env` file.

```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
PREFIX=^
DATABASE_URL="file:./dev.db"

GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b

AI_PROVIDER=groq
AI_MAX_OUTPUT_TOKENS=500
AI_TEMPERATURE=0.3
AI_REPLY_COOLDOWN_MS=3000
AI_MAX_INPUT_CHARS=2500
AI_RECENT_MESSAGES_LIMIT=8
```

## Roadmap

### v0.2 — Learning & Context

* `/learn` command
* Store custom Q&A per server
* Inject learned Q&A into AI ticket context
* Limit learned answers per server using `maxLearnedItems`

### v0.3 — Knowledge Types & Safe Agent Actions

* Add learning types:

  * Q&A knowledge
  * Free-form knowledge
* Add safe AI tool/action requests
* Allow AI to request limited ticket actions using structured JSON
* Start with safe actions only:

  * Close ticket
  * Rename ticket
  * Mark ticket as pending
* Avoid dangerous actions by default:

  * Ban
  * Kick
  * Delete channels
  * Manage roles

### v0.4 — Human Escalation

* `/admins` command
* Configure support/admin roles per server
* Allow Pixy AI to mention support staff when needed
* Add escalation rules
* Add priority levels for tickets

### Future

* Embeddings
* Vector Search
* Paid Plans
* Analytics
* Multi-model support
* Dashboard

---

Made with ❤️ by Pixy team.
