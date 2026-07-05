# Pixy AI 🤖

Pixy AI is an AI-powered Discord bot that automates ticket support by answering frequently asked questions inside ticket channels.

## Features (v0.1)

- ✅ Slash command handler
- ✅ Prefix command handler
- ✅ Event handler
- ✅ Automatic slash command registration
- ✅ Prisma + SQLite setup
- ✅ `/setup` command
- ✅ Ticket category configuration per guild
- ✅ Detect newly created ticket channels
- ✅ Store guild configuration in the database
- ✅ Store detected ticket channels
- ✅ Send a test message when a new ticket is created

## Tech Stack

- Node.js
- discord.js v14
- Prisma ORM
- SQLite

## Project Structure

```
src/
├── config/
├── events/
├── prefix/
├── slash/
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
```

## Roadmap

### v0.2

- AI replies inside ticket channels
- `/learn` command
- Store custom Q&A per server
- Context injection for AI

### Future

- Embeddings
- Vector Search
- Paid Plans
- Analytics
- Multi-model support

---

Made with ❤️ by Pixy team.
