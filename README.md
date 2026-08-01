# Pixy AI 🤖

Pixy AI is a public, multi-server Discord ticket assistant with guild-scoped knowledge, validated ticket actions, human escalation, interactive settings, encrypted per-server Groq credentials, and manually administered Trial, Pro, and Partner plans.

## MVP scope

Pixy uses manual billing rather than an automated checkout. A server's effective plan is resolved at request time with this priority:

`Partner > active Pro > active Trial > Expired`

- **Trial** — one seven-day premium Trial created after the server's first successful `/pixy-setup`.
- **Pro** — time-limited premium entitlement activated or extended by a Pixy owner.
- **Partner** — premium entitlement without an expiry; stored Pro or Trial remains underneath as the fallback state.
- **Expired** — free mode. Generic ticket AI replies and ticket AI On/Off continue, but learned AI context, new learned entries, and validated agent ticket actions are locked.

Every server supplies its own Groq API key and is responsible for its own Groq usage, limits, and charges. Pixy does not provide a shared Groq quota and does not collect payment credentials.

## Main features

- AI replies inside configured ticket channels
- Per-server learned Q&A and free-form knowledge
- Validated close, rename, and escalation actions
- Configurable support routes and escalation notifications
- Entitlement and feature flags rechecked before actions execute
- Plan-aware ticket controls, including AI-only controls in Expired mode
- Per-guild Groq credentials encrypted at rest
- Per-channel AI blacklist for transcript, ownership, or automation channels
- Guild-isolated usage logs and operational data deletion
- Manual Trial, Pro, and Partner billing with transactional audit records

## Server setup

1. Run `/pixy-setup` as a server administrator and choose the category where an external ticket bot creates ticket channels. The first successful setup starts the one-time seven-day Trial when no billing record exists.
2. Run `/pixy-settings` and add the server's Groq API key.
3. Run `/pixy-billing` to view the current plan, dates, remaining time, feature availability, and manual activation options.
4. Choose a Groq chat model when the default is not suitable.
5. Configure support routes with `/pixy-admins`.
6. Run `/pixy-blacklist action:Add`, then choose a non-conversation channel inside the configured ticket category.

Pixy registers global slash commands and is not tied to one Discord guild.

## Public commands

- `/pixy-help` — interactive setup, billing, feature, and troubleshooting help
- `/pixy-setup` — configure the ticket category and initialize the one-time Trial when eligible
- `/pixy-billing` — show Trial, Expired, Pro, or Partner status and manual contact-owner instructions
- `/pixy-learn` — manage server-specific knowledge; additions require Trial, Pro, or Partner
- `/pixy-admins` — configure escalation roles, categories, and notifications
- `/pixy-settings` — feature preferences, Groq credentials, model, and blocked terms
- `/pixy-blacklist action:Add` — exclude a ticket-category channel from AI processing
- `/pixy-blacklist action:Remove` — remove an existing blacklist entry
- `/pixy-blacklist action:List` — show the current blacklist privately
- `/pixy-clear` — delete operational guild data while retaining minimal billing continuity and audit records

Payment choices in `/pixy-billing` only show a configured Discord owner mention and instructions to send a manual DM. Pixy never sends the owner a DM automatically, collects money, activates a plan, or stores PayPal/Vodafone credentials.

## Plan behavior

### Trial, Pro, and Partner

Premium plans can use:

- Learned Q&A and free-form entries in AI context
- New learned-knowledge additions
- Validated AI-requested close, rename, and escalation actions
- Premium ticket controls when the corresponding guild feature preference is enabled

### Expired

Expired mode intentionally keeps the useful free assistant behavior:

- Generic AI replies remain available with the guild's configured Groq key
- Ticket AI On/Off remains available
- Existing learned entries can be listed, deleted, or cleared

Expired mode blocks:

- Learned knowledge from being injected into AI prompts
- New Q&A or free-form learned entries
- Agent action schemas and execution
- Premium ticket control options

Entitlement is checked at execution time, so stale menus, buttons, modals, or direct component IDs cannot bypass expiration.

## Manual billing and owner commands

Owner commands use the configured prefix, which is `^` in `.env.example`. Unauthorized users receive no response, usage hint, cooldown, or command-existence signal.

- `^help` — DM the operator reference when possible, with channel fallback
- `^activate <guild-id>` — start 30 days of Pro from now; rejects active Pro and recommends `^resub`
- `^resub <guild-id>` — add 30 days after the current active Pro expiry
- `^custom <guild-id> <duration>` — extend active Pro from its expiry or start from now
- `^deactivate <guild-id>` — end Pro immediately while preserving Trial and Partner state
- `^status <guild-id>` — show all billing layers and the latest audit event
- `^partner add <guild-id>` — enable Partner while preserving Trial and Pro dates
- `^partner remove <guild-id>` — disable Partner and reveal Pro, Trial, or Expired fallback
- `^partner list` — list active Partner guilds with IDs and available guild names

Supported custom duration units:

- `d` — days
- `w` — seven-day weeks
- `m` — 30-day months
- `y` — 365-day years

Examples: `14d`, `8w`, `6m`, `1y`. Values must be positive whole numbers. The resulting Pro expiry cannot be more than ten years from the mutation time.

### Billing transaction safety

Every owner billing mutation:

1. Starts a Prisma interactive transaction with MySQL `Serializable` isolation.
2. Locks the guild's billing row with `SELECT ... FOR UPDATE`.
3. Reloads the locked state and computes the mutation from that current value.
4. Writes the `GuildBilling` change and matching `BillingEvent` before commit.
5. Retries bounded deadlock/write-conflict failures.
6. Refreshes ticket controls only after commit, on a best-effort basis.

This prevents simultaneous renewals from losing an extension. Audit failure rolls the mutation back; Discord refresh failure does not.

See `docs/payments/CONCURRENCY.md` for the detailed strategy.

## Safety behavior

- Ticket history and learned server content are passed to the model as untrusted reference data, not system instructions.
- Expired prompts contain no learned data, agent tool descriptions, action identifiers, or action JSON schemas.
- AI-generated text cannot ping users, roles, `@everyone`, or `@here`.
- AI close requests are rejected unless the current user message explicitly asks to close the ticket.
- Escalation preflights its role and notification channel, grants the selected support role ticket access, and rolls channel changes back when execution fails.
- Billing outputs sanitize guild names and disable allowed mentions.
- Passwords, Discord tokens, Groq keys, backup codes, and payment credentials must never be sent to payment owners or stored in learned content.

## Data retention and Trial continuity

`/pixy-clear` and guild removal delete operational guild data such as configuration, learned knowledge, tickets, routes, ignored channels, feature settings, encrypted Groq credentials, and detailed AI usage logs.

They intentionally retain minimal billing continuity records:

- Trial, Pro, and Partner dates/state in `GuildBilling`
- Billing mutations and actors in `BillingEvent`

This retention supports entitlement continuity, auditing, and prevention of repeat Trials after clear, removal, reinvitation, or reconfiguration. Active Pro or Partner entitlement remains available after the guild is reconfigured.

The destructive development command `npm run db:clear -- --confirm` is different: it clears every application table, including billing tables, while preserving only Prisma migration history.

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

# Billing owners
OWNERS=
PAYPAL_OWNER_ID=
VODAFONE_OWNER_ID=

# Database - MySQL
DATABASE_URL="mysql://pixy:pixy_local_password@127.0.0.1:3306/pixy"

# Credential encryption
PIXY_CREDENTIAL_ENCRYPTION_KEY=
```

- `OWNERS` is a comma-separated list of Discord user IDs authorized to use silent owner-only prefix commands.
- `PAYPAL_OWNER_ID` is the Discord user ID mentioned for the PayPal contact option.
- `VODAFONE_OWNER_ID` is the Discord user ID mentioned for the Vodafone Cash contact option.

Production startup rejects missing or malformed owner configuration. These IDs route manual contact instructions only; they are not payment account identifiers and receive no automatic DM.

### `NODE_ENV`

Use `NODE_ENV=development` while developing locally and `NODE_ENV=production` for a deployed bot. Only the exact value `production` enables production-specific validation.

### Test database

`TEST_DATABASE_URL` is optional for production and required when running the automated suite against the separate test database:

```env
TEST_DATABASE_URL="mysql://pixy:pixy_test_password@127.0.0.1:3307/pixy_test"
```

When `NODE_ENV=test`, the database adapter uses `TEST_DATABASE_URL` when present.

### Credential encryption key

`PIXY_CREDENTIAL_ENCRYPTION_KEY` must be one stable, base64-encoded 32-byte key. Generate it in PowerShell:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Back up the encryption key separately from the MySQL backup. A database backup without the matching encryption key cannot recover stored guild Groq credentials.

Never commit Discord tokens, API keys, production database credentials, database backups, payment information, or encryption keys.

## Local development with Docker

Set `NODE_ENV=development` and add `TEST_DATABASE_URL` to `.env`, then start the development and test databases:

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

## Clear all application data

For a complete development/deployment reset, including billing and audit rows:

```powershell
npm run db:clear -- --confirm
```

The command discovers every application table, disables foreign-key checks safely, deletes all application rows, resets auto-increment counters, preserves the schema, and preserves Prisma's `_prisma_migrations` history. It is destructive and cannot be undone without a backup.

## Production deployment

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

Pixy stores Discord guild, channel, role, message, and optional user IDs; server-provided knowledge; feature and routing settings; encrypted Groq credentials; ticket state; AI usage diagnostics; billing state/dates; and billing audit events. Ticket context is sent to the guild-selected Groq model when an AI response is requested. See `PRIVACY_POLICY.md` for retention, sharing, and deletion details.
