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
* ✅ `/learn` command
* ✅ Add custom Q&A items per server
* ✅ Delete learned Q&A items by ID, question, answer, or selected match
* ✅ List learned Q&A items with paginated ephemeral embeds
* ✅ Clear all learned Q&A items with confirmation buttons
* ✅ Store custom Q&A per server using Prisma
* ✅ Context injection for learned Q&A inside AI ticket replies
* ✅ Limit learned answers per server using `maxLearnedItems`

## Commands

### `/setup`

Configure the ticket category where Pixy AI should detect newly created ticket channels.

### `/learn`

Manage server-specific learned Q&A items.

Available actions:

* `/learn action:add` — Add a new learned Q&A item using a modal.
* `/learn action:delete` — Delete a learned Q&A item by ID, question, answer, or selected match.
* `/learn action:list` — Show learned Q&A items in paginated ephemeral embeds.
* `/learn action:clear` — Delete all learned Q&A items for the server after confirmation.

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
│   └── providers/
├── config/
├── events/
│   └── tickets/
├── prefix/
├── slash/
└── utils/
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

## Development

For local development with SQLite, you can run:

```bash
npx prisma migrate dev
```

Then start the bot:

```bash
node .
```

## Environment Variables

Create a `.env` file.

```env
# Bot
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
```

## Roadmap

### v0.3 — Knowledge Types & Safe Agent Actions

* Expand learning into multiple knowledge types:

  * Q&A knowledge
  * Free-form knowledge

* Add safe AI tool/action requests.
* Allow AI to request limited ticket actions using structured JSON.
* Add validation before executing any AI-requested action.
* Start with safe ticket actions only:

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
