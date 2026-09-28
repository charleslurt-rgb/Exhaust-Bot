# Customizable Discord Bot

A starter public Discord bot with a web dashboard. Each server has its own settings stored in SQLite.

## Included in this starter

- Discord OAuth2 login
- Dashboard lists servers where the signed-in user has Manage Server or Administrator permission
- Per-server prefix, welcome channel, welcome message, and module toggles
- Custom text commands managed from the dashboard and `/customcommand`
- Slash commands: `/ping`, `/settings`, `/customcommand`
- SQLite database
- Basic session and OAuth state protection
- Dark, responsive dashboard

## Requirements

- Node.js 22.12+ (Node.js 24 LTS is suitable)
- A Discord application and bot
- A Node.js host that keeps the bot process running and provides persistent disk storage

## 1. Create the Discord application

1. Open https://discord.com/developers/applications and create an application.
2. Under **Bot**, create/reset the bot token and copy it to `.env` as `DISCORD_BOT_TOKEN`.
3. Under **OAuth2**, copy the Client ID and Client Secret.
4. Add the exact callback URL from `OAUTH_CALLBACK_URL` to the OAuth2 Redirects list.
5. Under **Bot**, enable **Server Members Intent** only if you later add features that require it. This starter does not require Message Content Intent.
6. Make sure the app is configured so server owners can install the bot. Use the invite link below.

## 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the values. Never commit `.env` or share your bot token/client secret.

For local testing, set:
- `BASE_URL=http://localhost:3000`
- `OAUTH_CALLBACK_URL=http://localhost:3000/auth/discord/callback`

For deployment, use your HTTPS domain for both values, with the callback path `/auth/discord/callback`.

## 3. Install and run

```bash
npm install
npm run deploy:commands
npm start
```

Open `http://localhost:3000`.

Commands are registered globally by default and can take a while to appear. For development, set `DEV_GUILD_ID` to your test server ID and restart `npm run deploy:commands`.

## 4. Invite the bot

Replace `YOUR_CLIENT_ID` and open this URL:

```text
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot%20applications.commands&permissions=3072
```

The permissions integer above requests Manage Messages and Read Message History for the starter moderation module. If you only want basic commands, use `permissions=0`. Add only permissions your enabled features need.

## Deployment notes

- Deploy this as a **single persistent Node.js service**. The bot and dashboard run in the same process.
- SQLite needs persistent disk storage. If your host has an ephemeral filesystem, the database can disappear after redeploy/restart. Set `DATABASE_PATH` to a path on a persistent disk.
- Set `BASE_URL` and `OAUTH_CALLBACK_URL` to your public HTTPS URL.
- Set `NODE_ENV=production` on your host so secure cookies are enabled.
- Some free hosting plans sleep, limit hours, or do not provide persistent disks. Verify the current plan limits before choosing a host.
- Do not deploy the dashboard as a static-only site: OAuth and the bot require a running backend.
- This is a starter, not a fully audited production service. Before opening it widely, add rate limiting, audit logs, automated backups, and a managed database if you outgrow SQLite.

## Current behavior

- Dashboard changes are saved per guild.
- Only users whose Discord guild list reports Manage Server or Administrator can edit a guild.
- Welcome messages are sent when a new member joins, if the feature is enabled and a welcome channel is selected.
- Custom commands are plain text responses. They do not execute JavaScript or arbitrary code.
- Prefix commands are triggered only when the bot can read message content. The starter avoids enabling Message Content Intent and uses slash commands for normal interactions. Custom prefix text commands require enabling the privileged **Message Content Intent** in the Developer Portal and adding `GatewayIntentBits.MessageContent` in `src/index.js`; slash commands and dashboard configuration work without it.
