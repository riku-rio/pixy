# Pixy Payments — Product Requirements Document

## 1. Overview

Pixy is a public, multi-server Discord ticket assistant. Each server supplies its own Groq API key, while Pixy hosts and operates the Discord bot, ticket workflow, learned server knowledge, and validated ticket actions.

The first payments release introduces a manually managed subscription system. Payments are completed directly between the customer and one of the Pixy owners. Pixy does not collect card details, confirm transactions, call payment-provider APIs, or activate subscriptions automatically.

The system provides:

- A one-time seven-day Pixy Pro trial after the first successful server setup.
- A free expired mode that keeps generic AI replies available through the server's own Groq account.
- Time-limited Pixy Pro subscriptions managed by bot owners.
- Unlimited Partner access for approved promotional partners.
- A `/pixy-billing` command that shows subscription status and directs administrators to the correct payment owner.
- Owner-only prefix commands for activation, renewal, custom durations, deactivation, status inspection, partner management, and help.

## 2. Goals

### 2.1 Product goals

- Let every new server evaluate all Pixy Pro capabilities for seven days.
- Preserve a useful free experience after trial expiration instead of disabling the bot completely.
- Make the loss of premium value clear enough to encourage conversion.
- Keep payment operations simple and fully manual during the early product stage.
- Allow two project owners to manage subscriptions safely from Discord.
- Support early growth through unlimited Partner accounts.
- Ensure subscription expiration is automatic and does not depend on scheduled jobs or manual deactivation.

### 2.2 Technical goals

- Enforce premium access in backend execution paths, not only in Discord UI components.
- Derive the effective plan from persisted dates and partner state at request time.
- Preserve billing history when operational guild data is cleared or the bot leaves a guild.
- Prevent repeated trials through `/pixy-setup`, `/pixy-clear`, bot removal, or reinvitation.
- Keep existing guild feature settings intact while premium access is unavailable.
- Record owner billing changes in an immutable audit trail.

## 3. Non-goals

This release does not include:

- Automatic PayPal integration.
- Automatic Vodafone Cash verification.
- Webhooks from payment providers.
- Checkout pages or payment forms.
- Stored payment credentials or transaction evidence.
- Automatic invoices, refunds, chargebacks, or tax handling.
- Pixy-managed Groq quotas.
- Recurring billing.
- Scheduled subscription reminders sent automatically to users.
- A web billing dashboard.
- Multiple paid plan tiers.

## 4. Terminology

- **Trial**: A one-time seven-day period with all Pixy Pro capabilities.
- **Pro**: A time-limited paid subscription.
- **Partner**: Unlimited Pixy Pro access granted manually for promotional or business partnership purposes.
- **Expired**: No active Trial, Pro, or Partner entitlement.
- **Premium entitlement**: Permission to use learned knowledge and ticket-agent actions.
- **Operational guild data**: Ticket configuration, settings, learned items, ticket records, routes, credentials, blocked terms, and usage logs.
- **Billing data**: Trial dates, Pro dates, Partner state, and owner billing events.

## 5. Plan resolution

The effective plan must be derived dynamically whenever access or status is requested.

Priority:

1. Partner
2. Pro
3. Trial
4. Expired

Resolution rules:

- `Partner` when `partnerActive` is true.
- Otherwise `Pro` when `proEndsAt` exists and is later than the current time.
- Otherwise `Trial` when `trialEndsAt` exists and is later than the current time.
- Otherwise `Expired`.

No scheduled task is required to change a stored status. Dates are the source of truth, so a subscription expires even if the bot is offline at the exact expiration time.

## 6. Entitlements

### 6.1 Trial, Pro, and Partner

These plans provide the same Pixy feature entitlement:

- Generic AI ticket replies.
- Learned Q&A and free-form knowledge included in AI context.
- Adding learned Q&A.
- Adding free-form learned knowledge.
- Listing, deleting, and clearing learned knowledge.
- AI agent mode.
- Escalate to Human.
- Rename Ticket.
- Close Ticket.
- Per-ticket AI On/Off controls.
- Existing mention controls: `@Pixy`, `@Pixy on`, and `@Pixy off`.

Partner differs only in duration and payment requirement. Partners still supply and pay for their own Groq usage.

### 6.2 Expired

Expired servers retain:

- Generic AI replies using the guild's configured Groq API key.
- Per-ticket AI On/Off control.
- Mention-based AI state controls.
- Setup and settings commands.
- Groq credential and model management.
- `/pixy-billing`.
- `/pixy-clear`.
- Listing learned items.
- Deleting individual learned items.
- Clearing all learned items.

Expired servers lose:

- Learned knowledge in AI context.
- Adding learned Q&A.
- Adding free-form knowledge.
- AI agent tools.
- Escalate to Human.
- Rename Ticket.
- Close Ticket.

Existing learned data must remain stored and become available again after Trial, Pro, or Partner access becomes active. Expiration must not delete or modify learned items.

### 6.3 Guild feature settings

Subscription entitlement and guild-selected feature flags are separate gates.

A premium action is available only when:

- The effective plan has premium entitlement; and
- The corresponding guild feature setting is enabled.

Expiration must not overwrite feature flags. When Pro is restored, the previous guild settings resume automatically.

## 7. Trial lifecycle

### 7.1 Trial start

The Trial begins only after the first successful `/pixy-setup` category save.

This includes either setup path:

- Selecting an existing category.
- Automatically creating or reusing a Pixy category.

On the first successful save, if no billing record exists:

- Create the guild billing record.
- Set `trialStartedAt` to the current time.
- Set `trialEndsAt` to exactly seven days after `trialStartedAt`.
- Record a `trial_started` billing event.

### 7.2 Trial uniqueness

A guild receives no more than one Trial.

The following must never restart or extend it:

- Running `/pixy-setup` again.
- Changing the ticket category.
- Running `/pixy-clear`.
- Removing Pixy from the guild.
- Reinviting Pixy.
- Removing Partner access.
- Activating and later deactivating Pro.

### 7.3 Empty initial deployment

No legacy guild backfill is required. The production database is expected to be empty before the payments release is deployed publicly.

## 8. AI behavior by entitlement

### 8.1 Premium agent mode

Trial, Pro, and Partner servers use the existing agent-capable prompt and execution flow. The model may request validated ticket actions when allowed by configuration and safety rules.

### 8.2 Expired assistant mode

Expired servers use a non-agent prompt:

- Do not describe ticket actions as available.
- Do not include action JSON schemas.
- Do not request close, rename, or escalation actions.
- Do not include learned Q&A or free-form learned knowledge in context.
- Continue answering generic support questions normally.
- Continue using recent ticket conversation context where otherwise allowed.

Backend execution gates must still reject premium actions regardless of prompt behavior.

## 9. Ticket controls

### 9.1 Premium controls

For Trial, Pro, and Partner, the ticket control menu contains:

- Escalate to Human.
- Rename Ticket.
- Close Ticket.
- Turn Pixy AI On or Turn Pixy AI Off, depending on current state.

### 9.2 Expired controls

For Expired, the ticket control menu contains only:

- Turn Pixy AI On; or
- Turn Pixy AI Off.

Premium choices are removed rather than displayed as disabled options.

### 9.3 Existing ticket messages

A ticket control message may have been rendered before expiration. Therefore:

- All action execution paths must check current entitlement.
- An attempted premium interaction after expiration must be rejected safely.
- After rejection, Pixy should refresh the shared control message to the Expired control set when possible.
- New tickets must always render controls based on current entitlement.
- Owner actions that change the effective plan should refresh open ticket controls on a best-effort basis.
- Failure to refresh a Discord message must not change the stored billing result.

## 10. Learned knowledge behavior

`/pixy-learn` actions are split by entitlement.

### Premium-only actions

- `add-qna`
- `add-freeform`

### Available to all guild states

- `list`
- `delete`
- `clear`

Every component and modal associated with a premium-only action must recheck entitlement at execution time. Opening a modal before expiration must not allow submission after expiration.

Expired command responses should explain that adding or using learned knowledge requires Pixy Pro and direct the administrator to `/pixy-billing`.

## 11. Billing command

### 11.1 Command definition

Add the administrator-only guild slash command:

`/pixy-billing`

Only a guild administrator may open and use its controls. Responses are ephemeral.

### 11.2 Status display

The billing embed should include relevant fields:

- Effective plan.
- Status.
- Remaining duration.
- Trial start and end dates when applicable.
- Pro start and end dates when applicable.
- Partner status and start date when applicable.
- Generic AI availability.
- Learned knowledge availability.
- Agent-action availability.
- A reminder that the guild supplies its own Groq account.

Use Discord absolute and relative timestamps where useful.

Examples:

- `Trial — 4 days remaining`
- `Expired — 0 days remaining`
- `Pro — 16 days remaining`
- `Partner — Unlimited`

### 11.3 Renewal warning

When Pro has three days or fewer remaining, the embed should prominently recommend renewing before expiration. Renewal remains available throughout the full Pro period, not only in the final three days.

### 11.4 Payment menu

For Trial, Expired, and Pro, display a payment-method select menu:

- PayPal.
- Vodafone Cash.

Labels and descriptions may use state-aware language such as Subscribe, Activate, or Renew.

Partner servers do not need a payment menu.

### 11.5 Payment contact result

Selecting a payment method does not notify an owner automatically and does not activate anything.

Instead, Pixy returns an ephemeral message containing:

- A mention of the configured payment owner.
- A clear instruction to open that owner's Discord profile and send a direct message.
- The guild name and guild ID the customer should include.
- A request to state the desired subscription duration.
- A warning not to send passwords, tokens, Groq keys, or other secrets.

The owner mapping is:

- PayPal → `PAYPAL_OWNER_ID`.
- Vodafone Cash → `VODAFONE_OWNER_ID`.

Direct-user deep links must not be a required dependency. A clickable Discord mention and clear instruction are the supported baseline.

## 12. Environment configuration

Add and validate:

```env
OWNERS=1363512743667302653,575366733616119838
PAYPAL_OWNER_ID=1363512743667302653
VODAFONE_OWNER_ID=575366733616119838
```

Requirements:

- Parse `OWNERS` as a trimmed, deduplicated set of Discord user IDs.
- Reject production startup when `OWNERS` is empty or contains invalid IDs.
- Reject production startup when either payment owner ID is absent or invalid.
- A payment owner does not need to be duplicated automatically into `OWNERS`; configuration should explicitly contain all owner command users.
- Never log secrets or unrelated environment values.

## 13. Owner-only prefix commands

All billing prefix commands are restricted to IDs in `OWNERS`.

Unauthorized users must receive no message, usage hint, validation error, or indication that the command exists. Owner authorization must happen before normal prefix argument, permission, cooldown, and usage checks.

### 13.1 `^help`

Displays owner billing command help.

Recommended behavior:

- Try to DM the owner.
- If DM delivery fails, reply in the invoking channel.

Help includes commands, argument syntax, duration units, and examples.

### 13.2 `^activate <guild-id>`

Starts a standard 30-day Pro subscription from the current time.

Rules:

- The guild must be accessible to Pixy.
- If active Pro already exists, reject and direct the owner to `^resub`.
- Partner may remain the effective plan, while the new Pro period is stored as fallback.
- Record `pro_activated`.

### 13.3 `^resub <guild-id>`

Adds 30 days to an existing active Pro subscription.

Rules:

- Base date is the current `proEndsAt`.
- Reject when no active Pro exists and direct the owner to `^activate`.
- Partner may remain the effective plan while Pro is extended underneath it.
- Record `pro_renewed`.

### 13.4 `^custom <guild-id> <duration>`

Adds a custom Pro duration.

Accepted duration format:

- Positive integer followed by one unit.
- `d` = days.
- `w` = weeks.
- `m` = 30-day months.
- `y` = 365-day years.

Examples:

- `7d`
- `2w`
- `6m`
- `1y`

Rules:

- Reject zero, negative, decimal, malformed, or unsupported durations.
- Apply a documented safe maximum to prevent accidental extreme dates.
- If active Pro exists, add duration after current `proEndsAt`.
- Otherwise, start from the current time.
- Record `pro_customized` with normalized duration metadata.

### 13.5 `^deactivate <guild-id>`

Ends Pro immediately by clearing or expiring the active Pro period.

This command is for manual intervention such as a refund, chargeback, error correction, abuse case, or requested cancellation. Normal subscription expiration requires no command.

After deactivation, effective plan falls back to:

1. Partner if active.
2. Trial if still active.
3. Expired.

Record `pro_deactivated`.

### 13.6 `^status <guild-id>`

Displays full billing state, including:

- Guild name and ID.
- Effective plan.
- Trial dates and validity.
- Pro dates and validity.
- Partner state and date.
- Remaining time.
- Last relevant billing event and owner actor when available.
- Fallback plan beneath Partner when relevant.

### 13.7 Partner commands

- `^partner add <guild-id>`
- `^partner remove <guild-id>`
- `^partner list`

Add rules:

- Set `partnerActive` true.
- Set `partnerSince` when entering Partner state.
- Preserve Trial and Pro dates underneath Partner.
- Reject or report a no-op when already active.
- Record `partner_added`.

Remove rules:

- Set `partnerActive` false.
- Preserve historical `partnerSince` or store an end event in the audit log.
- Effective plan falls back to active Pro, then active Trial, then Expired.
- Reject or report a no-op when not active.
- Record `partner_removed`.

List rules:

- Show all active partners.
- Include guild name when cached or fetchable and always include guild ID.
- Paginate or split output safely when needed.

## 14. Persistence model

### 14.1 GuildBilling

Introduce one billing record per Discord guild.

Suggested fields:

- `id`
- `guildId` unique
- `trialStartedAt`
- `trialEndsAt`
- `proStartedAt`
- `proEndsAt`
- `partnerActive` default false
- `partnerSince`
- `createdAt`
- `updatedAt`

Do not persist a mutable effective status field. The effective plan is derived.

The billing record must not require a `GuildConfig` relation that would cascade-delete it when operational guild data is cleared.

### 14.2 BillingEvent

Store an append-only audit event for billing mutations.

Suggested fields:

- `id`
- `guildId`
- `actorUserId`
- `action`
- `durationValue`
- `durationUnit`
- `previousProEndsAt`
- `newProEndsAt`
- `metadata` as JSON or text when needed
- `createdAt`

Expected actions:

- `trial_started`
- `pro_activated`
- `pro_renewed`
- `pro_customized`
- `pro_deactivated`
- `partner_added`
- `partner_removed`

Trial creation may use a system actor marker instead of an owner Discord ID.

### 14.3 Concurrency

Billing mutations must be transactional. Concurrent owner commands must not lose subscription time. Renewal and custom extension should read, calculate, write, and create the audit event inside one transaction.

## 15. Data deletion and retention

### 15.1 `/pixy-clear`

Continue deleting operational guild data, including learned content and encrypted Groq credentials.

Do not delete:

- `GuildBilling`.
- `BillingEvent`.

Update the command copy so it accurately states that billing and anti-abuse subscription records are retained.

### 15.2 Bot removal

When Pixy is removed from a guild, delete operational guild data as currently designed but retain billing and billing-event records.

This prevents reinvitation from granting another Trial and preserves paid or Partner status.

### 15.3 Privacy documentation

Update the privacy policy during implementation to disclose:

- Subscription state and dates.
- Billing management events.
- Owner Discord IDs involved in manual account administration.
- Retention of minimal billing records after `/pixy-clear` or bot removal for subscription continuity, audit, and trial-abuse prevention.
- Pixy does not collect payment card or wallet credentials.

## 16. Access-control architecture

Create a centralized billing/entitlement service responsible for:

- Loading or creating billing state where appropriate.
- Resolving the effective plan.
- Returning remaining time.
- Returning premium entitlement booleans.
- Formatting plan metadata for commands.
- Starting a Trial atomically.
- Activating, renewing, customizing, and deactivating Pro.
- Adding and removing Partner status.

Avoid embedding date comparisons independently across commands and event handlers.

Premium gates are required at minimum in:

- AI prompt/context construction.
- AI action execution.
- Ticket select-menu preflight.
- Ticket action component and modal handlers.
- Ticket control rendering.
- `/pixy-learn` command execution.
- `/pixy-learn` modal submissions.

## 17. Error handling

- Invalid guild IDs must produce a clear owner-only error.
- Owner commands must not create billing records for malformed or inaccessible guild IDs.
- Billing reads for a guild without a billing row should report an uninitialized state unless called from the first successful setup flow.
- Payment contact selection must fail safely if the configured owner cannot be resolved or mentioned.
- Discord refresh failures must be logged without rolling back a successful billing transaction.
- Database failures must not partially update subscription state without its audit event.
- Unauthorized prefix attempts remain completely silent.

## 18. Testing requirements

Automated tests must cover:

- Effective-plan priority.
- Boundary behavior exactly at Trial and Pro expiration.
- One-time Trial creation.
- Repeated setup does not extend Trial.
- Clear and guild removal preserve billing.
- Activate behavior.
- Resub active-only behavior.
- Custom duration parsing and date arithmetic.
- Deactivate fallback behavior.
- Partner add/remove fallback behavior.
- Concurrent renewal safety.
- Expired AI context excludes learned knowledge.
- Expired AI prompt excludes agent action schemas.
- Backend rejects premium actions after expiration.
- Expired ticket controls contain only AI On/Off.
- Learn add actions are blocked while list/delete/clear remain available.
- Unauthorized owner commands produce no reply.
- `/pixy-billing` state-specific rendering and payment-owner routing.

## 19. Acceptance criteria

The payments feature is complete when:

1. The first successful setup grants exactly one seven-day Trial.
2. Trial, Pro, and Partner have full premium entitlement.
3. Expired servers continue generic AI replies and AI On/Off controls.
4. Expired servers cannot add or use learned knowledge.
5. Expired servers cannot execute close, rename, escalation, or any AI agent action.
6. Premium actions are protected at backend execution time.
7. `/pixy-billing` accurately shows Trial, Expired, Pro, and Partner states.
8. Payment selections direct the user to the correct configured owner without notifying or activating automatically.
9. `^activate`, `^resub`, `^custom`, `^deactivate`, `^status`, Partner commands, and `^help` work only for configured owners.
10. Unauthorized users receive no response for owner-only commands.
11. Pro and Trial expiration occurs automatically through date evaluation.
12. Billing state survives `/pixy-clear`, bot removal, and reinvitation.
13. Billing mutations have an audit event.
14. Existing guild feature settings survive expiration and resume after renewal.
15. Tests cover plan resolution, access gates, lifecycle operations, and anti-repeat Trial behavior.
