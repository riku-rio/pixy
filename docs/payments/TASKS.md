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

- [ ] Add `OWNERS` to `.env.example`.
- [ ] Add `PAYPAL_OWNER_ID` to `.env.example`.
- [ ] Add `VODAFONE_OWNER_ID` to `.env.example`.
- [ ] Parse `OWNERS` into a trimmed and deduplicated `Set`.
- [ ] Validate Discord snowflake formatting.
- [ ] Validate both payment-owner IDs.
- [ ] Fail production startup when required owner configuration is invalid.
- [ ] Expose parsed owner configuration through `client.appEnv`.
- [ ] Add environment parsing tests.

### Prefix command pipeline

- [ ] Add a reusable `ownerOnly: true` prefix command property.
- [ ] Check owner authorization immediately after command lookup.
- [ ] Run owner authorization before argument, usage, permission, cooldown, or disabled checks.
- [ ] Return silently for every unauthorized owner-only command attempt.
- [ ] Add tests proving no reply, usage hint, or error is emitted to unauthorized users.
- [ ] Ensure ordinary non-owner prefix commands retain their existing behavior.

## Phase 3 — One-time Trial lifecycle

### Trial creation

- [ ] Add an atomic `startTrialOnce(guildId)` billing operation.
- [ ] Set Trial start to the current time.
- [ ] Set Trial end to exactly seven days later.
- [ ] Create a `trial_started` audit event in the same transaction.
- [ ] Return the existing billing record without extending dates when one already exists.

### Setup integration

- [ ] Integrate Trial creation after successful existing-category setup.
- [ ] Integrate Trial creation after successful automatic-category setup.
- [ ] Do not start a Trial before the category save succeeds.
- [ ] Do not fail a successful category update because a billing row already exists.
- [ ] Add tests for both setup paths.
- [ ] Add tests proving repeated `/pixy-setup` does not extend the Trial.

## Phase 4 — Premium entitlement gates

### Shared capability helpers

- [ ] Add a helper that reports whether a guild has premium entitlement.
- [ ] Add a helper that reports whether a specific premium capability is available after combining billing entitlement and guild feature flags.
- [ ] Keep billing state separate from stored feature flags.
- [ ] Add stable rejection codes for subscription-locked actions.
- [ ] Add user-facing messages for Trial expiration and Pro requirements.

### Ticket action execution

- [ ] Gate `close_ticket` at backend execution time.
- [ ] Gate `rename_ticket` at backend execution time.
- [ ] Gate `escalate_ticket` at backend execution time.
- [ ] Gate the general AI agent-action capability.
- [ ] Preserve existing safety validation and guild feature gates.
- [ ] Log subscription rejection statuses in AI usage logs.
- [ ] Add tests proving stale UI cannot bypass expiration.

### Ticket interaction preflight

- [ ] Extend ticket-action availability checks with billing entitlement.
- [ ] Reject expired select-menu actions.
- [ ] Reject expired confirmation buttons.
- [ ] Reject expired escalation role choices.
- [ ] Reject expired rename and escalation modal submissions.
- [ ] Refresh the shared ticket control message after a stale premium interaction when possible.
- [ ] Add subscription-specific disabled messages.
- [ ] Add tests for every component path.

## Phase 5 — AI assistant mode versus agent mode

### Prompt construction

- [ ] Resolve billing entitlement before building ticket context and prompt.
- [ ] Keep recent ticket conversation available in Expired mode.
- [ ] Exclude learned Q&A from Expired AI context.
- [ ] Exclude learned free-form knowledge from Expired AI context.
- [ ] Create or parameterize a non-agent assistant prompt.
- [ ] Remove action capability descriptions from Expired prompts.
- [ ] Remove close, rename, and escalation JSON schemas from Expired prompts.
- [ ] Explicitly instruct Expired mode to return text only.
- [ ] Keep existing premium prompt behavior for Trial, Pro, and Partner.

### Runtime safety

- [ ] Continue parsing AI output defensively.
- [ ] Reject any action JSON returned in Expired mode.
- [ ] Return a normal helpful failure response without executing an action.
- [ ] Add AI usage statuses for subscription-blocked agent output.
- [ ] Add tests verifying learned data and action instructions are absent in Expired mode.

## Phase 6 — Ticket control rendering

### Entitlement-aware controls

- [ ] Make ticket control rendering aware of effective plan.
- [ ] Render Escalate, Rename, Close, and AI On/Off for Trial.
- [ ] Render Escalate, Rename, Close, and AI On/Off for Pro.
- [ ] Render Escalate, Rename, Close, and AI On/Off for Partner.
- [ ] Render only AI On/Off for Expired.
- [ ] Preserve the existing reset-menu behavior only where appropriate.
- [ ] Ensure Expired does not display premium options as disabled choices.

### Existing tickets

- [ ] Render controls from current entitlement when a new ticket is tracked.
- [ ] Add a reusable best-effort open-ticket control refresh routine.
- [ ] Refresh controls after owner activation, renewal, custom extension, deactivation, Partner add, and Partner remove.
- [ ] Refresh stale controls when a blocked interaction occurs.
- [ ] Optionally refresh controls on the next ticket message after entitlement changes.
- [ ] Ensure refresh failures are logged and do not roll back billing changes.
- [ ] Add tests for premium and Expired component payloads.

## Phase 7 — Learned knowledge subscription behavior

### Slash command gates

- [ ] Resolve effective plan at `/pixy-learn` execution time.
- [ ] Allow `add-qna` only for Trial, Pro, and Partner.
- [ ] Allow `add-freeform` only for Trial, Pro, and Partner.
- [ ] Keep `list` available for Expired.
- [ ] Keep `delete` available for Expired.
- [ ] Keep `clear` available for Expired.
- [ ] Direct expired administrators to `/pixy-billing` when an add action is blocked.

### Component and modal gates

- [ ] Recheck entitlement when the Q&A modal is submitted.
- [ ] Recheck entitlement when the free-form modal is submitted.
- [ ] Ensure a modal opened before expiration cannot write after expiration.
- [ ] Keep delete and clear component flows working for Expired.
- [ ] Add tests for all Learn action states.

## Phase 8 — `/pixy-billing`

### Command and permissions

- [ ] Add `src/slash/billing.js` or equivalent.
- [ ] Register the command as `/pixy-billing` through existing production naming behavior.
- [ ] Require guild context.
- [ ] Require Administrator permission.
- [ ] Scope all controls to the administrator who opened the panel.
- [ ] Use ephemeral responses.

### Status embed

- [ ] Render Trial plan details.
- [ ] Render Expired plan details.
- [ ] Render Pro plan details.
- [ ] Render Partner plan details.
- [ ] Show remaining time.
- [ ] Show relevant Trial and Pro dates.
- [ ] Show Partner start date.
- [ ] Show generic AI availability.
- [ ] Show learned knowledge availability.
- [ ] Show agent-action availability.
- [ ] Explain that Groq usage belongs to the guild.
- [ ] Add a prominent renewal warning at three days or fewer remaining.
- [ ] Handle a missing/uninitialized billing record clearly.

### Payment-method menu

- [ ] Show PayPal for Trial, Expired, and Pro.
- [ ] Show Vodafone Cash for Trial, Expired, and Pro.
- [ ] Use Subscribe, Activate, or Renew wording based on state.
- [ ] Hide the payment menu for Partner.
- [ ] Map PayPal to `PAYPAL_OWNER_ID`.
- [ ] Map Vodafone Cash to `VODAFONE_OWNER_ID`.
- [ ] Return a clickable owner mention.
- [ ] Tell the user to open the profile and send a DM.
- [ ] Include guild name and guild ID in the instructions.
- [ ] Ask the user to include the desired duration.
- [ ] Warn against sending passwords, tokens, Groq keys, or secrets.
- [ ] Do not send an owner DM automatically.
- [ ] Do not activate or renew automatically.
- [ ] Add tests for contact-owner routing and state-specific labels.

## Phase 9 — Owner billing commands

### Shared command utilities

- [ ] Add guild ID validation.
- [ ] Add accessible-guild resolution through the Discord client.
- [ ] Add owner-only response formatting.
- [ ] Add duration parser for `d`, `w`, `m`, and `y`.
- [ ] Treat months as 30 days.
- [ ] Treat years as 365 days.
- [ ] Reject malformed, zero, negative, decimal, and unsupported durations.
- [ ] Enforce a safe maximum duration.
- [ ] Add transactional billing mutation helpers.
- [ ] Add best-effort ticket control refresh after mutations.

### `^help`

- [ ] Add Owner-only `^help`.
- [ ] Document every billing and Partner command.
- [ ] Include duration units and examples.
- [ ] Attempt DM delivery first.
- [ ] Fall back to the invoking channel if DMs are unavailable.
- [ ] Keep the command silent for non-owners.

### `^activate <guild-id>`

- [ ] Add Owner-only `activate` command.
- [ ] Require exactly one guild ID.
- [ ] Require Pixy access to the guild.
- [ ] Start 30 days from now.
- [ ] Reject when active Pro already exists.
- [ ] Recommend `^resub` in the active-Pro rejection.
- [ ] Preserve Partner as the effective plan when applicable.
- [ ] Create `pro_activated` audit event.
- [ ] Show previous and new effective states.

### `^resub <guild-id>`

- [ ] Add Owner-only `resub` command.
- [ ] Require active Pro.
- [ ] Add 30 days after current `proEndsAt`.
- [ ] Reject expired or missing Pro and recommend `^activate`.
- [ ] Preserve Partner as the effective plan when applicable.
- [ ] Create `pro_renewed` audit event.
- [ ] Show old and new expiry.

### `^custom <guild-id> <duration>`

- [ ] Add Owner-only `custom` command.
- [ ] Parse and normalize duration.
- [ ] Extend from current `proEndsAt` when active.
- [ ] Start from now when no active Pro exists.
- [ ] Preserve Partner as the effective plan when applicable.
- [ ] Create `pro_customized` audit event.
- [ ] Persist normalized duration metadata.
- [ ] Show old and new expiry.

### `^deactivate <guild-id>`

- [ ] Add Owner-only `deactivate` command.
- [ ] End Pro immediately.
- [ ] Preserve Trial dates.
- [ ] Preserve Partner state.
- [ ] Resolve and display fallback effective plan.
- [ ] Create `pro_deactivated` audit event.
- [ ] Handle already inactive Pro as a safe no-op or explicit error.

### `^status <guild-id>`

- [ ] Add Owner-only `status` command.
- [ ] Display guild name and ID.
- [ ] Display effective plan.
- [ ] Display Trial dates and active/expired state.
- [ ] Display Pro dates and active/expired state.
- [ ] Display Partner state and start date.
- [ ] Display remaining duration.
- [ ] Display fallback state beneath Partner.
- [ ] Display latest billing event and actor.
- [ ] Handle an uninitialized guild clearly.

## Phase 10 — Partner management

### `^partner add <guild-id>`

- [ ] Add Owner-only Partner add subcommand.
- [ ] Require Pixy access to the guild.
- [ ] Set Partner active.
- [ ] Set Partner start timestamp.
- [ ] Preserve Trial and Pro dates.
- [ ] Handle an already active Partner safely.
- [ ] Create `partner_added` audit event.
- [ ] Refresh open ticket controls.

### `^partner remove <guild-id>`

- [ ] Add Owner-only Partner remove subcommand.
- [ ] Set Partner inactive.
- [ ] Preserve Trial and Pro dates.
- [ ] Resolve fallback to Pro, Trial, or Expired.
- [ ] Handle a non-Partner safely.
- [ ] Create `partner_removed` audit event.
- [ ] Refresh open ticket controls.

### `^partner list`

- [ ] Add Owner-only Partner list subcommand.
- [ ] Query all active Partner billing rows.
- [ ] Resolve guild names when available.
- [ ] Always show guild IDs.
- [ ] Split or paginate safely for Discord limits.
- [ ] Handle no active Partners.

## Phase 11 — Billing mutation safety

### Transactions and concurrency

- [ ] Wrap every billing mutation and its audit event in one Prisma transaction.
- [ ] Prevent lost updates during simultaneous renewals.
- [ ] Choose and document a concurrency strategy compatible with MySQL and Prisma.
- [ ] Add a concurrency test for two near-simultaneous extensions.
- [ ] Ensure failed audit creation rolls back the billing mutation.
- [ ] Ensure failed Discord refresh does not roll back a committed billing mutation.

### Validation

- [ ] Prevent owner commands from creating rows for malformed guild IDs.
- [ ] Prevent owner commands from operating on inaccessible guilds.
- [ ] Validate date arithmetic before persistence.
- [ ] Prevent overflow or unreasonable far-future expiries.
- [ ] Sanitize all status output and allowed mentions.

## Phase 12 — Clear, guild removal, and anti-repeat Trial behavior

### `/pixy-clear`

- [ ] Preserve `GuildBilling` rows.
- [ ] Preserve `BillingEvent` rows.
- [ ] Continue deleting all operational guild data.
- [ ] Update confirmation copy to disclose retained billing records.
- [ ] Update completion copy to disclose retained billing records.
- [ ] Add tests proving setup after clear does not grant another Trial.

### Guild removal

- [ ] Preserve billing rows in `guildDelete` handling.
- [ ] Preserve billing events in `guildDelete` handling.
- [ ] Continue deleting operational guild data.
- [ ] Add tests proving reinvitation does not grant another Trial.
- [ ] Ensure an active Pro or Partner entitlement remains available after reinvitation and setup.

## Phase 13 — Documentation and product copy

- [ ] Update `README.md` MVP scope to include manual billing, Trial, Pro, and Partner states.
- [ ] Document free Expired behavior.
- [ ] Document the guild-provided Groq responsibility.
- [ ] Document `/pixy-billing`.
- [ ] Document payment owner environment variables.
- [ ] Document owner-only prefix commands in an operator section.
- [ ] Document standard and custom duration rules.
- [ ] Update `/pixy-help` content where billing belongs in public help.
- [ ] Update `/pixy-settings` copy when premium feature controls are subscription-locked.
- [ ] Update ticket and Learn lock messages with `/pixy-billing` guidance.

### Privacy policy

- [ ] Add billing state and date collection.
- [ ] Add billing audit-event collection.
- [ ] Explain owner IDs used for manual administration.
- [ ] Explain retained minimal billing records after clear/removal.
- [ ] Explain the purposes: continuity, audit, and Trial abuse prevention.
- [ ] Confirm Pixy does not collect payment card, PayPal credential, or Vodafone wallet credential data.
- [ ] Update the policy's last-updated date.

## Phase 14 — Automated test coverage

### Billing service tests

- [ ] Partner overrides Pro and Trial.
- [ ] Active Pro overrides Trial.
- [ ] Active Trial resolves correctly.
- [ ] Expired resolves correctly.
- [ ] Exact Trial expiration timestamp resolves Expired.
- [ ] Exact Pro expiration timestamp falls back correctly.
- [ ] Remaining-time formatting is stable.

### Trial tests

- [ ] First successful existing-category setup starts Trial.
- [ ] First successful automatic-category setup starts Trial.
- [ ] Failed setup does not start Trial.
- [ ] Repeated setup does not extend Trial.
- [ ] Category changes do not extend Trial.
- [ ] Clear and re-setup do not restart Trial.
- [ ] Remove, rejoin, and setup do not restart Trial.

### Command tests

- [ ] Unauthorized owner-only commands are silent.
- [ ] `^help` lists current command syntax.
- [ ] Activate starts 30 days.
- [ ] Activate rejects active Pro.
- [ ] Resub adds 30 days after current expiry.
- [ ] Resub rejects inactive Pro.
- [ ] Custom duration parses all supported units.
- [ ] Custom duration rejects invalid values.
- [ ] Custom extends active Pro.
- [ ] Custom starts from now without active Pro.
- [ ] Deactivate resolves fallback correctly.
- [ ] Status reports all layers accurately.
- [ ] Partner add/remove/list work and audit correctly.

### Entitlement tests

- [ ] Premium AI context includes learned data.
- [ ] Expired AI context excludes learned data.
- [ ] Premium prompt includes agent tools.
- [ ] Expired prompt excludes agent tools.
- [ ] Backend action execution rejects Expired.
- [ ] Stale select menu rejects Expired.
- [ ] Stale modal rejects Expired.
- [ ] Expired ticket controls contain only AI On/Off.
- [ ] Learn add actions reject Expired.
- [ ] Learn list/delete/clear remain available to Expired.

### Billing command tests

- [ ] Trial embed and menu.
- [ ] Expired embed and menu.
- [ ] Pro embed and renewal menu.
- [ ] Pro three-day warning.
- [ ] Partner embed without payment menu.
- [ ] PayPal routes to configured PayPal owner mention.
- [ ] Vodafone Cash routes to configured Vodafone owner mention.
- [ ] Payment selection sends no owner DM and performs no activation.

### Regression tests

- [ ] Existing ticket safety validation still passes.
- [ ] Existing feature-flag behavior still passes for premium plans.
- [ ] Existing AI On/Off controls still work for Expired.
- [ ] Existing Groq credential handling remains guild-scoped and encrypted.
- [ ] Existing guild data deletion still removes operational data.
- [ ] Full test database reset includes billing tables.

## Phase 15 — Final verification

- [ ] Run `npm run prisma:generate`.
- [ ] Apply the migration to the test database.
- [ ] Run `npm test`.
- [ ] Verify global slash command registration includes `/pixy-billing`.
- [ ] Verify owner prefix commands are loaded.
- [ ] Manually test first setup and seven-day Trial timestamps.
- [ ] Manually test Expired generic AI behavior.
- [ ] Manually test learned-data lock and restoration after activation.
- [ ] Manually test premium ticket controls and Expired AI-only controls.
- [ ] Manually test PayPal and Vodafone owner instructions.
- [ ] Manually test activation, early renewal, custom extension, and natural expiration.
- [ ] Manually test Partner fallback behavior.
- [ ] Manually test `/pixy-clear` and reinvitation anti-repeat Trial behavior.
- [ ] Confirm README and privacy policy match implemented behavior.
- [ ] Confirm no payment details or secrets are written to logs or database.

## Definition of done

- [ ] All PRD acceptance criteria are implemented.
- [ ] No premium capability can be reached through stale UI or direct interaction IDs while Expired.
- [ ] Subscription expiration requires no cron or manual command.
- [ ] Trial cannot be repeated by setup, clear, removal, or reinvitation.
- [ ] Billing changes are transactional and audited.
- [ ] Owner commands are silent for unauthorized users.
- [ ] The free Expired mode continues generic AI and AI On/Off behavior.
- [ ] Automated tests and manual verification pass.
- [ ] Public and operator documentation are accurate.
