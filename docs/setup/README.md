# Setup guides

Choose the guide for the machine that will run Pixy:

- [Windows quick start](WINDOWS.md) — PowerShell and Docker Desktop
- [Ubuntu quick start](UBUNTU.md) — Ubuntu, Docker Engine, and Docker Compose
- [Troubleshooting](TROUBLESHOOTING.md) — database ports, Prisma connectivity, environment files, Discord commands, and encryption-key recovery

## Repository roles

- **Pixy AI Tickets** is the public multi-server AI ticket assistant. Its local MySQL service uses host port `3306`, and its setup includes `npm run prisma:seed`.
- **Pixy System** is the companion Discord system bot. Its local MySQL service uses host port `3308`, and it currently has no seed command.

Keep each repository in a separate directory. Both projects can run at the same time because their Docker Compose files publish MySQL on different host ports.

## Shared setup order

1. Clone the repository or pull `main`.
2. Copy `.env.example` to `.env` and `.env.docker.example` to `.env.docker`.
3. Fill in Discord, database, and project-specific values.
4. Run `npm ci`.
5. Run `npm run db:up`.
6. Generate Prisma Client and deploy migrations.
7. Run the Pixy AI Tickets seed command when setting up that repository.
8. Start the bot with `node .` or `npm start`.

Never commit `.env`, `.env.docker`, Discord tokens, API keys, database passwords, or encryption keys.
