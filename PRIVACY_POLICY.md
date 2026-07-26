# Pixy Privacy Policy

**Last updated: July 26, 2026**

This Privacy Policy explains how **Pixy** (the “Bot”, “Pixy”, “we”, or “us”) collects, processes, stores, and shares information when it is added to or used in a Discord server.

Pixy is a Discord ticket assistant that provides AI-assisted replies, guild-specific knowledge, ticket actions, escalation tools, administrative settings, and related diagnostics.

By adding or using Pixy, you acknowledge the practices described in this Privacy Policy.

## 1. Information Pixy processes

Pixy may process the following categories of information when required to provide its features:

### Discord identifiers

- Discord server (guild) IDs
- Channel and category IDs
- Role IDs
- Message IDs when required for a feature
- User IDs associated with tickets, commands, configuration, or usage records

These identifiers are used to associate settings and activity with the correct Discord server, channel, role, or user.

### Server configuration

Pixy may store configuration selected by server administrators, including:

- Ticket category configuration
- Escalation roles, categories, and notification channels
- Enabled or disabled feature settings
- Selected AI provider and model
- Ignored or blacklisted channels
- Custom blocked and allowed terms
- Administrative routing information

### Server-provided knowledge

Pixy may store information intentionally submitted by server administrators for the Bot to learn or reference, including:

- Questions and answers
- Free-form knowledge entries
- Titles and supporting content

Server administrators are responsible for ensuring that information submitted to Pixy is appropriate and does not contain secrets or personal information that should not be stored.

### Ticket and usage information

Pixy may store operational ticket information such as:

- Ticket channel and server IDs
- Optional ticket user IDs
- Ticket status and timestamps
- AI action status
- Escalation status, selected role, and reason
- Rename or close activity

Pixy may also store AI usage diagnostics, including:

- Provider and model names
- Prompt, completion, and total token counts when available
- Request status
- Error details needed for troubleshooting
- Server, channel, and optional user IDs associated with the request

### Discord message content

When AI features are enabled, Pixy may read and temporarily process relevant message content from configured ticket channels to understand the conversation and produce a response or validated action.

Relevant ticket context, configured server knowledge, and the current request may be sent to the server-selected AI provider. Pixy is designed to operate inside configured ticket channels and to respect configured ignored or blacklisted channels.

Discord messages remain subject to Discord’s own data practices and retention policies.

### Guild-provided Groq credentials

A server administrator may provide a Groq API key for the server’s AI requests.

- The credential is encrypted before being stored in Pixy’s database.
- The credential is decrypted only when needed to make an authorized API request.
- Server administrators must not submit credentials in normal ticket messages, learned knowledge, logs, or public channels.

## 2. Information Pixy does not intentionally collect

Pixy does not intentionally request or collect:

- Discord account passwords
- Payment card or banking information
- Government identification documents
- Authentication tokens belonging to Discord users
- Personal information unrelated to the operation of the Bot

Do not submit passwords, tokens, private API keys, payment details, or other highly sensitive information through Pixy commands, ticket messages, knowledge entries, or configuration fields.

## 3. How information is used

Pixy processes information to:

- Provide AI-assisted ticket replies
- Apply server-specific configuration and knowledge
- Manage ticket state and validated ticket actions
- Route and escalate support requests
- Enforce administrator-selected feature settings
- Prevent unwanted AI activity in ignored channels
- Diagnose errors and measure AI usage
- Protect the reliability and security of the service
- Respond to deletion, support, or privacy requests

Pixy does not sell personal information.

Pixy does not use stored server data for advertising.

## 4. Third-party services

Pixy relies on third-party services to operate.

### Discord

Pixy receives Discord data through the Discord API. Discord independently controls information stored on its platform. Discord’s own terms and privacy policy apply to Discord accounts, servers, messages, and infrastructure.

### Groq

When a server requests an AI response, relevant ticket context and server-provided knowledge may be sent to Groq using the API key configured by that server.

Groq processes that request according to its own terms, privacy policy, and data-handling practices. Server administrators should review Groq’s policies before enabling AI features.

### Hosting and database providers

Pixy’s application, logs, and database may be processed by infrastructure providers used to host the Bot and its MySQL database. Those providers may process technical data only as necessary to provide infrastructure services.

## 5. Data sharing

Information may be shared only when reasonably necessary to:

- Operate Pixy through Discord, Groq, and hosting infrastructure
- Comply with applicable law, legal process, or a valid government request
- Investigate abuse, security incidents, or threats to users or the service
- Protect the rights, safety, and integrity of Pixy, its operator, or other users

Pixy does not sell or rent stored information to advertisers or data brokers.

## 6. Data retention and deletion

Pixy keeps stored server data only while it is needed to operate the configured features, troubleshoot the service, or comply with applicable obligations.

Server administrators can delete the data associated with their Discord server by using:

```text
/pixy-clear
```

Removing Pixy from a Discord server is also designed to remove that server’s stored Pixy configuration and related data.

Deletion may include:

- Server configuration
- Learned knowledge
- Ticket records
- Routing and escalation settings
- Ignored-channel records
- Custom blocked or allowed terms
- Encrypted Groq credentials
- AI usage diagnostics associated with the server

Data may remain temporarily in operational backups until those backups are overwritten or securely deleted. Messages stored by Discord are not deleted merely because Pixy’s database records are deleted; Discord server administrators must manage Discord messages and channels through Discord.

## 7. Administrator and user controls

Discord server administrators can:

- Change Pixy’s server configuration
- Add or remove learned information
- Replace or remove the server’s Groq credential
- Disable individual AI and ticket features
- Exclude channels from AI processing
- Delete the server’s stored Pixy data with `/pixy-clear`
- Remove Pixy from the server

An individual Discord user who has a privacy or deletion concern should first contact the administrators of the Discord server where Pixy was used. The user may also contact the Pixy operator using the contact information below.

## 8. Security

Pixy uses reasonable technical and organizational safeguards intended to protect stored information. These safeguards include encrypted storage of guild-provided Groq credentials and restricted access to production secrets and infrastructure.

However, no online service, database, or transmission method can be guaranteed to be completely secure. Server administrators should avoid submitting unnecessary personal information and should immediately rotate any credential that may have been exposed.

## 9. Children’s privacy

Pixy is not intended for anyone who is not permitted to use Discord under Discord’s applicable age requirements and terms. Server owners and administrators are responsible for managing access to their Discord communities.

## 10. International processing

Discord, Groq, and hosting providers may process information in countries different from the user’s country. Their own privacy policies govern their processing locations and safeguards.

## 11. Changes to this policy

This Privacy Policy may be updated when Pixy’s features, infrastructure, or legal obligations change.

The “Last updated” date at the top of this file will be changed when material revisions are published. Continued use of Pixy after an update means the updated policy applies to subsequent use.

## 12. Contact

For privacy questions, deletion requests, or security concerns, contact the Pixy operator through one of the following:

- The official Pixy support Discord server: **https://discord.gg/MVZ7hXCUFj**
- Discord account: **usf.exe** — User ID: `1363512743667302653`
- The project owner’s GitHub profile: **https://github.com/riku-rio**

When contacting the operator about server data, include the relevant Discord server ID and enough information to verify that you are authorized to act for that server. Never include Discord tokens, Groq API keys, passwords, encryption keys, or other secrets in a support request.
