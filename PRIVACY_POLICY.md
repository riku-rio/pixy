# Pixy Privacy Policy

**Last updated: August 1, 2026**

This Privacy Policy explains how **Pixy** (the “Bot”, “Pixy”, “we”, or “us”) collects, processes, stores, retains, and shares information when it is added to or used in a Discord server.

Pixy is a Discord ticket assistant that provides AI-assisted replies, guild-specific knowledge, validated ticket actions, escalation tools, administrative settings, manual billing states, and related diagnostics.

By adding or using Pixy, you acknowledge the practices described in this Privacy Policy.

## 1. Information Pixy processes

### Discord identifiers

Pixy may process Discord server (guild), channel, category, role, message, and user IDs when needed to associate configuration, tickets, commands, billing administration, and diagnostics with the correct Discord objects.

### Server configuration

Pixy may store configuration selected by server administrators, including ticket categories, escalation routes, enabled or disabled feature preferences, selected AI model, ignored channels, custom blocked or allowed terms, and related routing settings.

### Server-provided knowledge

Pixy may store questions and answers, free-form knowledge, titles, and supporting content intentionally submitted by server administrators. Administrators are responsible for ensuring this content is appropriate and does not contain secrets or unnecessary personal information.

### Ticket and AI usage information

Pixy may store ticket identifiers, status and timestamps, optional ticket user IDs, action status, escalation details, rename or close activity, AI provider/model names, token counts when available, request status, and troubleshooting errors.

When AI features are enabled, Pixy may read and temporarily process relevant message content from configured ticket channels. Relevant ticket context and eligible server-provided knowledge may be sent to the guild-selected Groq model using the guild's configured credential.

### Guild-provided Groq credentials and usage

A server administrator may provide a Groq API key for the server's AI requests.

- The credential is encrypted before database storage.
- It is decrypted only when required for an authorized request.
- The guild owns and is responsible for its Groq account, usage, limits, and charges.
- Pixy does not provide shared Groq quota.

Server administrators must not submit Groq keys in ordinary ticket messages, learned knowledge, public channels, payment messages, or support requests.

### Billing state and dates

Pixy may store minimal billing continuity data for each guild, including:

- One-time Trial start and end dates
- Pro start and end dates
- Partner active state and Partner start date
- Record creation and update timestamps

These values are used to determine the guild's effective plan at request time, preserve entitlement through reconfiguration or reinvitation, and prevent repeated Trials.

### Billing audit events

Pixy may store billing audit events containing:

- Guild ID
- Owner/actor Discord user ID
- Action type, such as Trial start, Pro activation/renewal/customization/deactivation, or Partner add/remove
- Duration unit/value where applicable
- Previous and new Pro expiry dates where applicable
- Non-secret metadata describing the state transition
- Event timestamp

Billing events support operational accountability, troubleshooting, continuity, and abuse prevention. They must not contain payment credentials, passwords, Discord tokens, Groq API keys, or other secrets.

### Owner and payment-contact IDs

Pixy's operator configures Discord user IDs for:

- Authorized owner-only billing commands
- PayPal contact routing
- Vodafone Cash contact routing

These are Discord identifiers used for authorization or clickable contact mentions. They are not PayPal account credentials, Vodafone wallet credentials, banking details, or payment tokens.

## 2. Information Pixy does not intentionally collect

Pixy does not intentionally request or store:

- Discord account passwords
- Discord user or bot tokens
- Groq API keys in billing events or payment instructions
- Payment card numbers or security codes
- Bank account credentials
- PayPal passwords, access tokens, or account credentials
- Vodafone Cash wallet PINs, passwords, one-time codes, or wallet credentials
- Government identification documents
- Personal information unrelated to operating the Bot

`/pixy-billing` only provides a Discord owner mention and manual DM instructions. Pixy does not collect payment, send the owner a DM automatically, activate a plan automatically, or record payment details.

Do not submit passwords, tokens, private API keys, payment details, backup codes, or other highly sensitive information through Pixy commands, ticket messages, knowledge entries, configuration fields, or owner DMs.

## 3. How information is used

Pixy processes information to:

- Provide AI-assisted ticket replies
- Apply server-specific configuration and eligible knowledge
- Manage ticket state and validated actions
- Route and escalate support requests
- Enforce feature and subscription availability
- Display billing status and manual contact instructions
- Maintain Trial, Pro, and Partner continuity
- Audit owner billing changes
- Prevent repeated Trial grants after clear, removal, or reinvitation
- Diagnose errors and measure AI usage
- Protect the reliability and security of the service
- Respond to deletion, support, or privacy requests

Pixy does not sell personal information or use stored server data for advertising.

## 4. Third-party services

### Discord

Pixy receives Discord data through the Discord API. Discord independently controls data stored on its platform, and Discord's terms and privacy policy apply.

### Groq

When a guild requests an AI response, relevant ticket context and eligible server-provided knowledge may be sent to Groq using that guild's API key. Groq processes the request according to its own policies. Administrators should review those policies before enabling AI features.

### Hosting and database providers

Pixy's application, logs, and MySQL database may be processed by infrastructure providers used to host the Bot. Those providers may process technical data only as necessary to provide infrastructure services.

### Manual payment providers

A guild administrator may independently contact a configured Pixy owner to discuss PayPal or Vodafone Cash payment. Any payment is handled outside Pixy's database and command execution. The relevant payment provider and the human participants control the information exchanged through those services.

## 5. Data sharing

Information may be shared only when reasonably necessary to:

- Operate Pixy through Discord, Groq, and hosting infrastructure
- Complete manual support or billing administration requested by an authorized guild administrator
- Comply with applicable law, legal process, or a valid government request
- Investigate abuse, security incidents, or threats
- Protect the rights, safety, and integrity of Pixy, its operator, or users

Pixy does not sell or rent stored information to advertisers or data brokers.

## 6. Data retention and deletion

Pixy separates operational guild data from minimal billing continuity data.

### Operational data

Server administrators can delete operational data with:

```text
/pixy-clear
```

Removing Pixy from a guild also triggers deletion of operational data. Operational deletion includes, as applicable:

- Server configuration
- Learned knowledge
- Ticket records
- Routing and escalation settings
- Ignored-channel records
- Custom blocked or allowed terms
- Encrypted Groq credentials
- AI usage diagnostics associated with the guild

### Retained billing continuity data

`/pixy-clear` and guild removal intentionally retain:

- `GuildBilling` Trial, Pro, and Partner state/dates
- `BillingEvent` audit records and actor IDs

This minimal retention is used for entitlement continuity, billing audit, support, and Trial abuse prevention by preventing repeat Trials after clearing configuration, removing Pixy, reinviting it, or running setup again. An active Pro or Partner entitlement can therefore remain available after reinvitation and reconfiguration.

A complete operator-level database reset may delete these retained records. Such a reset is separate from `/pixy-clear` and guild removal.

Data may remain temporarily in operational backups until those backups are overwritten or securely deleted. Discord messages stored by Discord are not deleted merely because Pixy's database records are deleted.

## 7. Administrator and user controls

Discord server administrators can:

- Change Pixy's server configuration
- Add, list, delete, or clear learned information subject to plan availability
- Replace or remove the guild's Groq credential
- Disable individual AI and ticket feature preferences
- Exclude channels from AI processing
- View plan status and dates with `/pixy-billing`
- Delete operational guild data with `/pixy-clear`
- Remove Pixy from the guild

Billing continuity or audit deletion requests may require contacting the Pixy operator and verifying authority over the relevant guild, because those records are intentionally retained for continuity and abuse prevention.

An individual Discord user with a privacy or deletion concern should first contact the administrators of the server where Pixy was used, or contact the Pixy operator below.

## 8. Security

Pixy uses reasonable safeguards intended to protect stored information. These include encrypted storage of guild-provided Groq credentials, restricted access to production secrets, owner-only command authorization, transactional billing updates, sanitized billing output, and disabled Discord mentions in owner responses.

No online service, database, or transmission method can be guaranteed completely secure. Administrators should avoid submitting unnecessary personal information and immediately rotate any exposed credential.

## 9. Children’s privacy

Pixy is not intended for anyone who is not permitted to use Discord under Discord's applicable age requirements and terms. Server owners and administrators are responsible for managing access to their communities.

## 10. International processing

Discord, Groq, payment providers selected by users, and hosting providers may process information in countries different from the user's country. Their own policies govern their processing locations and safeguards.

## 11. Changes to this policy

This Privacy Policy may be updated when Pixy's features, infrastructure, or legal obligations change. The “Last updated” date will be changed when material revisions are published.

## 12. Contact

For privacy questions, deletion requests, billing-record questions, or security concerns, contact the Pixy operator through one of the following:

- The official Pixy support Discord server: **https://discord.gg/MVZ7hXCUFj**
- Discord account: **usf.exe** — User ID: `1363512743667302653`
- The project owner's GitHub profile: **https://github.com/riku-rio**

When contacting the operator about guild data, include the relevant Discord guild ID and enough information to verify that you are authorized to act for that guild. Never include Discord tokens, Groq API keys, passwords, encryption keys, payment credentials, wallet PINs, or other secrets.
