# Multipurpose Discord Bot

A modular `discord.py` bot designed to support both prefix commands and slash commands.

## Features scaffolded

- Moderation
- Auto moderation
- Utility
- Administration
- Fun
- Economy
- Levels
- Giveaways
- Tickets
- Welcome/goodbye
- Logging
- Automations
- Server configuration
- Information
- AI integration placeholder
- Owner/developer tools

## Requirements

- Python 3.12+
- A Discord application/bot
- Message Content Intent enabled for prefix commands
- Server Members Intent enabled for member-related features
- Presence Intent only if presence features are enabled

## Local setup

```bash
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

Linux/macOS:

```bash
source .venv/bin/activate
```

Install:

```bash
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and set `DISCORD_TOKEN`.

Run:

```bash
python main.py
```

## Command architecture

Every command is implemented as a `commands.Bot` cog and can expose:

- A prefix command, such as `!ping`
- A slash command, such as `/ping`

Commands are grouped by directory:

```text
commands/
  moderation/
  automod/
  utility/
  admin/
  fun/
  economy/
  levels/
  giveaways/
  tickets/
  welcome/
  logging/
  automation/
  information/
  ai/
  owner/
```

The loader in `main.py` automatically discovers Python files in these directories.

## Database

The project is initially configured for SQLite through SQLAlchemy.

For production, PostgreSQL is recommended. The database layer is intentionally separated so the storage backend can be changed without rewriting command logic.

## Deployment

The repository includes a Dockerfile for hosts that support Docker. For Orihost, configure the environment variables in the hosting panel rather than committing `.env`.

## Security

Never commit:

- Discord bot tokens
- API keys
- Database passwords
- OAuth secrets
- `.env`

If a Discord token is ever exposed, immediately regenerate it in the Discord Developer Portal.
