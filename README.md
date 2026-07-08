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

### v0.3

* ✅ Expand learning into multiple knowledge types:
  * Q&A knowledge
  * Free-form knowledge
* ✅ Add safe AI agent/action requests.
* ✅ Allow AI to request limited ticket actions using structured JSON.
* ✅ Validate every AI-requested action before execution.
* ✅ Execute safe ticket actions only:
  * Close ticket
  * Rename ticket
* ✅ Close ticket action deletes the current ticket channel after validation.
* ✅ Rename ticket action uses the AI-suggested name after sanitizing it.
* ✅ Invalid or malformed AI action JSON never executes an action.
* ✅ Friendly fallback replies when AI action output cannot be processed.
* ✅ Log AI usage, invalid action JSON, rejected actions, and executed actions.
* ✅ Avoid dangerous actions by default:
  * Ban
  * Kick
  * Delete arbitrary channels
  * Manage roles
  * Mention admins/staff
  * Move ticket categories
  * Change permissions

## Commands

### `/setup`

Configure the ticket category where Pixy AI should detect newly created ticket channels.

### `/learn`

Manage server-specific learned knowledge items.

Available actions:

* `/learn action:add-qna` — Add a new learned Q&A item using a modal.
* `/learn action:add-freeform` — Add free-form server knowledge using a modal.
* `/learn action:delete` — Delete a learned item by ID, title, question, answer, content, or selected match.
* `/learn action:list` — Show learned knowledge items in paginated ephemeral embeds.
* `/learn action:clear` — Delete all learned knowledge items for the server after confirmation.

## AI Agent Actions

Pixy AI can request a small set of safe ticket actions from inside ticket conversations.

Allowed actions:

* `close_ticket`
* `rename_ticket`

Pixy AI does not directly execute actions. It only returns a structured action request. The bot validates the request first, then executes it only if it is safe and allowed.

Unsupported actions are rejected and logged. Pixy AI must not perform or claim to perform dangerous actions such as banning users, kicking users, managing roles, changing permissions, mentioning staff, or moving tickets between categories.

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
    └── tickets/
        └── actions/
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

# Agent actions
AI_AGENT_ACTIONS_ENABLED=true
AI_TICKET_CLOSE_DELETE_DELAY_MS=2500
AI_ACTION_MAX_REPLY_CHARS=1000
```

## Roadmap

### v0.4 — Human Escalation & Admin Routing

* Add `/admins` command.
* Configure support/admin roles per server.
* Configure escalation behavior without mentioning `Administrator` by default.
* Allow Pixy AI to request human escalation only when needed.
* Mention only configured support roles/users when escalation is enabled.
* Add escalation rules, such as:
  * User asks for staff/admin.
  * AI cannot answer from available knowledge.
  * Payment, refund, ban appeal, or sensitive account issue.
  * User is angry, confused, or repeatedly unsatisfied.
* Add optional escalation ticket category.
* Add optional ticket move action for escalated tickets.
* Add priority levels for tickets.
* Log escalation requests and reasons.
* Keep escalation actions safe and validated before execution.

### Future

* Embeddings
* Vector Search
* Paid Plans
* Analytics
* Multi-model support
* Dashboard
* External integrations
* MCP support if the project needs many external tools later

---

Made with ❤️ by Pixy team.
