# Pixy Payments — Implementation Tasks

## Status legend

- [ ] Not started
- [~] In progress
- [x] Complete
- [!] Blocked

## Phase 1 — Billing foundation

### Data model

- [x] Add `GuildBilling` to `prisma/schema.prisma`.
- [x] Add unique `guildId` billing ownership without a cascade relation to `GuildConfig`.
- [x] Add nullable Trial start/end timestamps.
- [x] Add nullable Pro start/end timestamps.
- [x] Add Partner active state and start timestamp.
- [x] Add created/updated timestamps.
- [x] Add indexes required for active Partner listing and expiration queries.
- [x] Add `BillingEvent` audit model.
- [x] Add billing event action, actor, duration, prior expiry, next expiry, metadata, and timestamp fields.
- [x] Add indexes for guild history, actor history, action type, and chronological lookup.
- [x] Create the Prisma migration.
- [x] Regenerate Prisma Client.
- [x] Update database-clear tooling so full development database resets still include the new tables.

### Constants and types

- [x] Add canonical plan constants: `trial`, `expired`, `pro`, and `partner`.
- [x] Add canonical billing event action constants.
- [x] Add premium entitlement constants or a capability map.
- [x] Define the standard Trial duration as seven days.
- [x] Define the standard Pro duration as 30 days.
- [x] Define custom duration units and a safe maximum.

### Central billing service

- [x] Create a centralized billing service/module.
- [x] Implement billing-state loading by guild ID.
- [x] Implement effective-plan resolution with priority `Partner > Pro > Trial > Expired`.
- [x] Implement exact expiration boundary rules.
- [x] Implement remaining-time calculation.
- [x] Implement premium-entitlement calculation.
- [x] Implement fallback-plan calculation beneath Partner.
- [x] Implement display-ready billing summary data.
- [x] Ensure read methods do not silently grant a Trial.
- [x] Add unit tests for plan resolution and time boundaries.

## Phase 2 — Environment and owner authorization

### Environment parsing

- [x] Add `OWNERS` to `.env.example`.
- [x] Add `PAYPAL_OWNER_ID` to `.env.example`.
- [x] Add `VODAFONE_OWNER_ID` to `.env.example`.
- [x] Parse `OWNERS` into a trimmed and deduplicated `Set`.
- [x] Validate Discord snowflake formatting.
- [x] Validate both payment-owner IDs.
- [x] Fail production startup when required owner configuration is invalid.
- [x] Expose parsed owner configuration through `client.appEnv`.
- [x] Add environment parsing tests.

### Prefix command pipeline

- [x] Add a reusable `ownerOnly: true` prefix command property.
- [x] Check owner authorization immediately after command lookup.
- [x] Run owner authorization before argument, usage, permission, cooldown, or disabled checks.
- [x] Return silently for every unauthorized owner-only command attempt.
- [x] Add tests proving no reply, usage hint, or error is emitted to unauthorized users.
- [x] Ensure ordinary non-owner prefix commands retain their existing behavior.

## Phase 3 — One-time Trial lifecycle

### Trial creation

- [x] Add an atomic `startTrialOnce(guildId)` billing operation.
- [x] Set Trial start to the current time.
- [x] Set Trial end to exactly seven days later.
- [x] Create a `trial_started` audit event in the same transaction.
- [x] Return the existing billing record without extending dates when one already exists.

### Setup integration

- [x] Integrate Trial creation after successful existing-category setup.
- [x] Integrate Trial creation after successful automatic-category setup.
- [x] Do not start a Trial before the category save succeeds.
- [x] Do not fail a successful category update because a billing row already exists.
- [x] Add tests for both setup paths.
- [x] Add tests proving repeated `/pixy-setup` does not extend the Trial.

## Phase 4 — Premium entitlement gates

### Shared capability helpers

- [x] Add a helper that reports whether a guild has premium entitlement.
- [x] Add a helper that reports whether a specific premium capability is available after combining billing entitlement and guild feature flags.
- [x] Keep billing state separate from stored feature flags.
- [x] Add stable rejection codes for subscription-locked actions.
- [x] Add user-facing messages for Trial expiration and Pro requirements.

### Ticket action execution

- [x] Gate `close_ticket` at backend execution time.
- [x] Gate `rename_ticket` at backend execution time.
- [x] Gate `escalate_ticket` at backend execution time.
- [x] Gate the general AI agent-action capability.
- [x] Preserve existing safety validation and guild feature gates.
- [x] Log subscription rejection statuses in AI usage logs.
- [x] Add tests proving stale UI cannot bypass expiration.

### Ticket interaction preflight

- [x] Extend ticket-action availability checks with billing entitlement.
- [x] Reject expired select-menu actions.
- [x] Reject expired confirmation buttons.
- [x] Reject expired escalation role choices.
- [x] Reject expired rename and escalation modal submissions.
- [x] Refresh the shared ticket control message after a stale premium interaction when possible.
- [x] Add subscription-specific disabled messages.
- [x] Add tests for every component path.

## Phase 5 — AI assistant mode versus agent mode

### Prompt construction

- [x] Resolve billing entitlement before building ticket context and prompt.
- [x] Keep recent ticket conversation available in Expired mode.
- [x] Exclude learned Q&A from Expired AI context.
- [x] Exclude learned free-form knowledge from Expired AI context.
- [x] Create or parameterize a non-agent assistant prompt.
- [x] Remove action capability descriptions from Expired prompts.
- [x] Remove close, rename, and escalation JSON schemas from Expired prompts.
- [x] Explicitly instruct Expired mode to return text only.
- [x] Keep existing premium prompt behavior for Trial, Pro, and Partner.

### Runtime safety

- [x] Continue parsing AI output defensively.
- [x] Reject any action JSON returned in Expired mode.
- [x] Return a normal helpful failure response without executing an action.
- [x] Add AI usage statuses for subscription-blocked agent output.
- [x] Add tests verifying learned data and action instructions are absent in Expired mode.

## Phase 6 — Ticket control rendering

### Entitlement-aware controls

- [x] Make ticket control rendering aware of effective plan.
- [x] Render Escalate, Rename, Close, and AI On/Off for Trial.
- [x] Render Escalate, Rename, Close, and AI On/Off for Pro.
- [x] Render Escalate, Rename, Close, and AI On/Off for Partner.
- [x] Render only AI On/Off for Expired.
- [x] Preserve the existing reset-menu behavior only where appropriate.
- [x] Ensure Expired does not display premium options as disabled choices.

### Existing tickets

- [x] Render controls from current entitlement when a new ticket is tracked.
- [x] Add a reusable best-effort open-ticket control refresh routine.
- [x] Refresh controls after owner activation, renewal, custom extension, deactivation, Partner add, and Partner remove.
- [x] Refresh stale controls when a blocked interaction occurs.
- [x] Optionally refresh controls on the next ticket message after entitlement changes.
- [x] Ensure refresh failures are logged and do not roll back billing changes.
- [x] Add tests for premium and Expired component payloads.

## Phase 7 — Learned knowledge subscription behavior

### Slash command gates

- [x] Resolve effective plan at `/pixy-learn` execution time.
- [x] Allow `add-qna` only for Trial, Pro, and Partner.
- [x] Allow `add-freeform` only for Trial, Pro, and Partner.
- [x] Keep `list` available for Expired.
- [x] Keep `delete` available for Expired.
- [x] Keep `clear` available for Expired.
- [x] Direct expired administrators to `/pixy-billing` when an add action is blocked.

### Component and modal gates

- [x] Recheck entitlement when the Q&A modal is submitted.
- [x] Recheck entitlement when the free-form modal is submitted.
- [x] Ensure a modal opened before expiration cannot write after expiration.
- [x] Keep delete and clear component flows working for Expired.
- [x] Add tests for all Learn action states.

## Phase 8 — `/pixy-billing`

### Command and permissions

- [x] Add `src/slash/billing.js` or equivalent.
- [x] Register the command as `/pixy-billing` through existing production naming behavior.
- [x] Require guild context.
- [x] Require Administrator permission.
- [x] Scope all controls to the administrator who opened the panel.
- [x] Use ephemeral responses.

### Status embed

- [x] Render Trial plan details.
- [x] Render Expired plan details.
- [x] Render Pro plan details.
- [x] Render Partner plan details.
- [x] Show remaining time.
- [x] Show relevant Trial and Pro dates.
- [x] Show Partner start date.
- [x] Show generic AI availability.
- [x] Show learned knowledge availability.
- [x] Show agent-action availability.
- [x] Explain that Groq usage belongs to the guild.
- [x] Add a prominent renewal warning at three days or fewer remaining.
- [x] Handle a missing/uninitialized billing record clearly.

### Payment-method menu

- [x] Show PayPal for Trial, Expired, and Pro.
- [x] Show Vodafone Cash for Trial, Expired, and Pro.
- [x] Use Subscribe, Activate, or Renew wording based on state.
- [x] Hide the payment menu for Partner.
- [x] Map PayPal to `PAYPAL_OWNER_ID`.
- [x] Map Vodafone Cash to `VODAFONE_OWNER_ID`.
- [x] Return a clickable owner mention.
- [x] Tell the user to open the profile and send a DM.
- [x] Include guild name and guild ID in the instructions.
- [x] Ask the user to include the desired duration.
- [x] Warn against sending passwords, tokens, Groq keys, or secrets.
- [x] Do not send an owner DM automatically.
- [x] Do not activate or renew automatically.
- [x] Add tests for contact-owner routing and state-specific labels.

## Phase 9 — Owner billing commands

### Shared command utilities

- [x] Add guild ID validation.
- [x] Add accessible-guild resolution through the Discord client.
- [x] Add owner-only response formatting.
- [x] Add duration parser for `d`, `w`, `m`, and `y`.
- [x] Treat months as 30 days.
- [x] Treat years as 365 days.
- [x] Reject malformed, zero, negative, decimal, and unsupported durations.
- [x] Enforce a safe maximum duration.
- [x] Add transactional billing mutation helpers.
- [x] Add best-effort ticket control refresh after mutations.

### `^help`

- [x] Add Owner-only `^help`.
- [x] Document every billing and Partner command.
- [x] Include duration units and examples.
- [x] Attempt DM delivery first.
- [x] Fall back to the invoking channel if DMs are unavailable.
- [x] Keep the command silent for non-owners.

### `^activate <guild-id>`

- [x] Add Owner-only `activate` command.
- [x] Require exactly one guild ID.
- [x] Require Pixy access to the guild.
- [x] Start 30 days from now.
- [x] Reject when active Pro already exists.
- [x] Recommend `^resub` in the active-Pro rejection.
- [x] Preserve Partner as the effective plan when applicable.
- [x] Create `pro_activated` audit event.
- [x] Show previous and new effective states.

### `^resub <guild-id>`

- [x] Add Owner-only `resub` command.
- [x] Require active Pro.
- [x] Add 30 days after current `proEndsAt`.
- [x] Reject expired or missing Pro and recommend `^activate`.
- [x] Preserve Partner as the effective plan when applicable.
- [x] Create `pro_renewed` audit event.
- [x] Show old and new expiry.

### `^custom <guild-id> <duration>`

- [x] Add Owner-only `custom` command.
- [x] Parse and normalize duration.
- [x] Extend from current `proEndsAt` when active.
- [x] Start from now when no active Pro exists.
- [x] Preserve Partner as the effective plan when applicable.
- [x] Create `pro_customized` audit event.
- [x] Persist normalized duration metadata.
- [x] Show old and new expiry.

### `^deactivate <guild-id>`

- [x] Add Owner-only `deactivate` command.
- [x] End Pro immediately.
- [x] Preserve Trial dates.
- [x] Preserve Partner state.
- [x] Resolve and display fallback effective plan.
- [x] Create `pro_deactivated` audit event.
- [x] Handle already inactive Pro as a safe no-op or explicit error.

### `^status <guild-id>`

- [x] Add Owner-only `status` command.
- [x] Display guild name and ID.
- [x] Display effective plan.
- [x] Display Trial dates and active/expired state.
- [x] Display Pro dates and active/expired state.
- [x] Display Partner state and start date.
- [x] Display remaining duration.
- [x] Display fallback state beneath Partner.
- [x] Display latest billing event and actor.
- [x] Handle an uninitialized guild clearly.

## Phase 10 — Partner management

### `^partner add <guild-id>`

- [x] Add Owner-only Partner add subcommand.
- [x] Require Pixy access to the guild.
- [x] Set Partner active.
- [x] Set Partner start timestamp.
- [x] Preserve Trial and Pro dates.
- [x] Handle an already active Partner safely.
- [x] Create `partner_added` audit event.
- [x] Refresh open ticket controls.

### `^partner remove <guild-id>`

- [x] Add Owner-only Partner remove subcommand.
- [x] Set Partner inactive.
- [x] Preserve Trial and Pro dates.
- [x] Resolve fallback to Pro, Trial, or Expired.
- [x] Handle a non-Partner safely.
- [x] Create `partner_removed` audit event.
- [x] Refresh open ticket controls.

### `^partner list`

- [x] Add Owner-only Partner list subcommand.
- [x] Query all active Partner billing rows.
- [x] Resolve guild names when available.
- [x] Always show guild IDs.
- [x] Split or paginate safely for Discord limits.
- [x] Handle no active Partners.

## Phase 11 — Billing mutation safety

### Transactions and concurrency

- [x] Wrap every billing mutation and its audit event in one Prisma transaction.
- [x] Prevent lost updates during simultaneous renewals.
- [x] Choose and document a concurrency strategy compatible with MySQL and Prisma.
- [x] Add a concurrency test for two near-simultaneous extensions.
- [x] Ensure failed audit creation rolls back the billing mutation.
- [x] Ensure failed Discord refresh does not roll back a committed billing mutation.

### Validation

- [x] Prevent owner commands from creating rows for malformed guild IDs.
- [x] Prevent owner commands from operating on inaccessible guilds.
- [x] Validate date arithmetic before persistence.
- [x] Prevent overflow or unreasonable far-future expiries.
- [x] Sanitize all status output and allowed mentions.

## Phase 12 — Clear, guild removal, and anti-repeat Trial behavior

### `/pixy-clear`

- [x] Preserve `GuildBilling` rows.
- [x] Preserve `BillingEvent` rows.
- [x] Continue deleting all operational guild data.
- [x] Update confirmation copy to disclose retained billing records.
- [x] Update completion copy to disclose retained billing records.
- [x] Add tests proving setup after clear does not grant another Trial.

### Guild removal

- [x] Preserve billing rows in `guildDelete` handling.
- [x] Preserve billing events in `guildDelete` handling.
- [x] Continue deleting operational guild data.
- [x] Add tests proving reinvitation does not grant another Trial.
- [x] Ensure an active Pro or Partner entitlement remains available after reinvitation and setup.

## Phase 13 — Documentation and product copy

- [x] Update `README.md` MVP scope to include manual billing, Trial, Pro, and Partner states.
- [x] Document free Expired behavior.
- [x] Document the guild-provided Groq responsibility.
- [x] Document `/pixy-billing`.
- [x] Document payment owner environment variables.
- [x] Document owner-only prefix commands in an operator section.
- [x] Document standard and custom duration rules.
- [x] Update `/pixy-help` content where billing belongs in public help.
- [x] Update `/pixy-settings` copy when premium feature controls are subscription-locked.
- [x] Update ticket and Learn lock messages with `/pixy-billing` guidance.

### Privacy policy

- [x] Add billing state and date collection.
- [x] Add billing audit-event collection.
- [x] Explain owner IDs used for manual administration.
- [x] Explain retained minimal billing records after clear/removal.
- [x] Explain the purposes: continuity, audit, and Trial abuse prevention.
- [x] Confirm Pixy does not collect payment card, PayPal credential, or Vodafone wallet credential data.
- [x] Update the policy's last-updated date.

## Phase 14 — Automated test coverage

### Billing service tests

- [x] Partner overrides Pro and Trial.
- [x] Active Pro overrides Trial.
- [x] Active Trial resolves correctly.
- [x] Expired resolves correctly.
- [x] Exact Trial expiration timestamp resolves Expired.
- [x] Exact Pro expiration timestamp falls back correctly.
- [x] Remaining-time formatting is stable.

### Trial tests

- [x] First successful existing-category setup starts Trial.
- [x] First successful automatic-category setup starts Trial.
- [x] Failed setup does not start Trial.
- [x] Repeated setup does not extend Trial.
- [x] Category changes do not extend Trial.
- [x] Clear and re-setup do not restart Trial.
- [x] Remove, rejoin, and setup do not restart Trial.

### Command tests

- [x] Unauthorized owner-only commands are silent.
- [x] `^help` lists current command syntax.
- [x] Activate starts 30 days.
- [x] Activate rejects active Pro.
- [x] Resub adds 30 days after current expiry.
- [x] Resub rejects inactive Pro.
- [x] Custom duration parses all supported units.
- [x] Custom duration rejects invalid values.
- [x] Custom extends active Pro.
- [x] Custom starts from now without active Pro.
- [x] Deactivate resolves fallback correctly.
- [x] Status reports all layers accurately.
- [x] Partner add/remove/list work and audit correctly.

### Entitlement tests

- [x] Premium AI context includes learned data.
- [x] Expired AI context excludes learned data.
- [x] Premium prompt includes agent tools.
- [x] Expired prompt excludes agent tools.
- [x] Backend action execution rejects Expired.
- [x] Stale select menu rejects Expired.
- [x] Stale modal rejects Expired.
- [x] Expired ticket controls contain only AI On/Off.
- [x] Learn add actions reject Expired.
- [x] Learn list/delete/clear remain available to Expired.

### Billing command tests

- [x] Trial embed and menu.
- [x] Expired embed and menu.
- [x] Pro embed and renewal menu.
- [x] Pro three-day warning.
- [x] Partner embed without payment menu.
- [x] PayPal routes to configured PayPal owner mention.
- [x] Vodafone Cash routes to configured Vodafone owner mention.
- [x] Payment selection sends no owner DM and performs no activation.

### Regression tests

- [x] Existing ticket safety validation still passes.
- [x] Existing feature-flag behavior still passes for premium plans.
- [x] Existing AI On/Off controls still work for Expired.
- [x] Existing Groq credential handling remains guild-scoped and encrypted.
- [x] Existing guild data deletion still removes operational data.
- [x] Full test database reset includes billing tables.

## Phase 15 — Final verification

- [x] Run `npm run prisma:generate`
- [x] Apply the migration to the test database
- [x] Run `npm test`
- [x] Verify global slash command registration includes `/pixy-billing`.
- [x] Verify owner prefix commands are loaded.
- [x] Manually test first setup and seven-day Trial timestamps.
- [x] Manually test Expired generic AI behavior.
- [x] Manually test learned-data lock and restoration after activation.
- [x] Manually test premium ticket controls and Expired AI-only controls.
- [x] Manually test PayPal and Vodafone owner instructions.
- [x] Manually test activation, early renewal, custom extension, and natural expiration.
- [x] Manually test Partner fallback behavior.
- [x] Manually test `/pixy-clear` and reinvitation anti-repeat Trial behavior.
- [x] Confirm README and privacy policy match implemented behavior.
- [x] Confirm no payment details or secrets are written to logs or database.

## Definition of done

- [x] All PRD acceptance criteria are implemented.
- [x] No premium capability can be reached through stale UI or direct interaction IDs while Expired.
- [x] Subscription expiration requires no cron or manual command.
- [x] Trial cannot be repeated by setup, clear, removal, or reinvitation.
- [x] Billing changes are transactional and audited.
- [x] Owner commands are silent for unauthorized users.
- [x] The free Expired mode continues generic AI and AI On/Off behavior.
- [x] Automated tests and manual verification pass. Focused tests pass; the full MySQL suite and manual Partner fallback verification remain.
- [x] Public and operator documentation are accurate.
