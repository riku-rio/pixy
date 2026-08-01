# Billing mutation concurrency

Pixy uses MySQL row locking and Prisma interactive transactions for every owner billing mutation.

## Strategy

1. The command validates the target guild before a database row can be created or changed.
2. The mutation starts a Prisma interactive transaction with `Serializable` isolation.
3. Inside the transaction, Pixy runs `SELECT guildId FROM GuildBilling WHERE guildId = ? FOR UPDATE`.
   - Existing billing rows are locked until commit or rollback.
   - Under MySQL/InnoDB serializable semantics, a missing unique-key row is protected by the corresponding key-range lock while it is created.
4. Pixy reloads the billing row after the lock is acquired, computes the new state from that locked value, writes the row, and inserts the matching `BillingEvent` before committing.
5. MySQL deadlocks and Prisma write-conflict errors are retried a small bounded number of times.
6. Discord ticket-control refresh runs only after the transaction commits and is best effort.

This prevents two near-simultaneous renewals from reading the same old expiry and losing one extension. The second transaction waits, reloads the first transaction's committed expiry, and extends from that newer value.

## Safety boundaries

- Pro expiries may not be persisted more than ten years from the mutation time.
- Invalid dates, arithmetic overflow, malformed guild IDs, and inaccessible guilds are rejected before persistence.
- Audit insertion failure rolls back the billing mutation.
- Discord refresh failure does not roll back committed billing state.
