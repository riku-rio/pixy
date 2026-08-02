# Pixy AI Tickets setup guides

These guides apply only to the public multi-server **Pixy AI Tickets** bot:

- [Windows quick start](WINDOWS.md) — PowerShell and Docker Desktop
- [Ubuntu quick start](UBUNTU.md) — Docker Engine and Docker Compose
- [Troubleshooting](TROUBLESHOOTING.md) — Docker, port 3306, Prisma, environment files, Discord commands, and credential recovery

## Setup order

1. Clone `riku-rio/pixy-ai-tickets` or pull the latest `main` branch.
2. Copy `.env.example` to `.env` and `.env.docker.example` to `.env.docker`.
3. Fill the Discord, billing-owner, database, and encryption values.
4. Install dependencies with `npm ci`.
5. Start MySQL with `npm run db:up`.
6. Run `npm run prisma:generate`.
7. Run `npm run prisma:migrate`.
8. Run `npm run prisma:seed`.
9. Start Pixy AI Tickets with `npm start` or `node .`.

Pixy AI Tickets uses local MySQL host port `3306` and requires the seed step after migrations.

Pixy System is a separate bot with its own setup documentation in the [`pixy-system`](https://github.com/riku-rio/pixy-system) repository.
