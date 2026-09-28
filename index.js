require('dotenv').config();

const crypto = require('node:crypto');
const express = require('express');
const session = require('express-session');
const {
  Client,
  GatewayIntentBits,
  Events,
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');

const {
  getSettings,
  updateSettings,
  listCustomCommands,
  addCustomCommand,
  deleteCustomCommand,
  getCustomCommand
} = require('./db');

const requiredEnv = ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_BOT_TOKEN', 'BASE_URL', 'OAUTH_CALLBACK_URL', 'SESSION_SECRET'];
for (const key of requiredEnv) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}

const isProduction = process.env.NODE_ENV === 'production';
const baseUrl = process.env.BASE_URL.replace(/\/$/, '');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const app = express();
app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(express.json({ limit: '20kb' }));
app.use(session({
  name: 'custombot.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

function csrfToken(req) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  return req.session.csrfToken;
}

function checkCsrf(req, res, next) {
  if (!req.session.csrfToken || req.body._csrf !== req.session.csrfToken) {
    return res.status(403).send(page('Request rejected', '<p>Security token expired. Go back and try again.</p><a class="button" href="/">Return to dashboard</a>', req));
  }
  next();
}

async function discordApi(path, accessToken) {
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error(`Discord API returned ${response.status}`);
  return response.json();
}

function page(title, body, req) {
  const user = req?.session?.user;
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · CustomBot</title>
<style>
:root{color-scheme:dark;--bg:#090a0d;--panel:#121419;--panel2:#191c23;--line:#292d36;--text:#f4f5f7;--muted:#a4a9b4;--accent:#fff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,sans-serif}
a{color:var(--text)}.nav{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px max(20px,calc((100% - 1080px)/2));border-bottom:1px solid var(--line);background:#0d0e12}.brand{font-weight:800;letter-spacing:-.04em;text-decoration:none;font-size:19px}.nav-right{display:flex;align-items:center;gap:14px;color:var(--muted);font-size:13px}.wrap{max-width:1080px;margin:0 auto;padding:36px 20px 64px}.hero{margin-bottom:28px}.eyebrow{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.14em;font-weight:700}.hero h1{font-size:clamp(28px,5vw,42px);letter-spacing:-.05em;line-height:1.1;margin:8px 0 10px}.muted{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:14px}.panel,.server{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:20px}.server{display:flex;flex-direction:column;gap:12px;text-decoration:none;transition:border-color .15s}.server:hover{border-color:#777}.server strong{font-size:17px}.avatar{width:42px;height:42px;border-radius:14px;background:var(--panel2);display:grid;place-items:center;font-weight:800}.server-top{display:flex;align-items:center;gap:12px}.button,button{display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:10px;padding:10px 14px;background:#f4f5f7;color:#111318;font-weight:700;text-decoration:none;cursor:pointer;font:inherit;font-size:14px}.button.secondary,button.secondary{background:var(--panel2);color:var(--text)}button.danger{background:#241416;color:#ffdfe1;border-color:#553035}input,select,textarea{display:block;width:100%;background:#0b0c10;color:var(--text);border:1px solid var(--line);border-radius:10px;padding:11px 12px;font:inherit;margin-top:6px}textarea{min-height:100px;resize:vertical}label{display:block;font-size:13px;font-weight:650;margin:16px 0 0}.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}.toggle{display:flex;align-items:center;gap:10px;margin:14px 0}.toggle input{width:auto;margin:0}.section-title{font-size:19px;margin:0 0 6px}.row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.notice{padding:12px 14px;background:var(--panel2);border:1px solid var(--line);border-radius:10px;margin:16px 0}.command{border-top:1px solid var(--line);padding:14px 0;overflow-wrap:anywhere}.command:first-of-type{margin-top:12px}.inline-form{display:flex;gap:8px;align-items:center}.inline-form input{margin:0}.inline-form button{flex-shrink:0}.footer{margin-top:28px;color:var(--muted);font-size:12px}code{background:var(--panel2);padding:2px 5px;border-radius:5px}@media(max-width:520px){.wrap{padding-top:26px}.nav{padding:15px 18px}.nav-right .username{display:none}.panel{padding:16px}}
</style></head><body>
<header class="nav"><a class="brand" href="/">CustomBot<span class="muted"> / dashboard</span></a>
<div class="nav-right">${user ? `<span class="username">${escapeHtml(user.username)}</span><a href="/logout">Log out</a>` : `<a href="/login">Log in</a>`}</div></header>
<main class="wrap">${body}<div class="footer">CustomBot · Settings are saved per server. Never share your Discord bot token.</div></main>
</body></html>`;
}

app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.send(page('Dashboard', `
      <section class="hero"><div class="eyebrow">A bot that fits your server</div><h1>Your server.<br> Your rules.</h1>
      <p class="muted">Configure welcome messages, modules, prefixes, and custom commands from one clean dashboard.</p>
      <p><a class="button" href="/login">Continue with Discord</a></p></section>
      <section class="grid">
        <div class="panel"><h2 class="section-title">Server-specific settings</h2><p class="muted">Every server has its own saved configuration.</p></div>
        <div class="panel"><h2 class="section-title">No coding required</h2><p class="muted">Create simple text commands from the dashboard.</p></div>
        <div class="panel"><h2 class="section-title">Discord + web</h2><p class="muted">Use the dashboard or supported slash commands.</p></div>
      </section>`, req));
  }

  if (!req.session.accessToken) {
    req.session.user = null;
    return res.redirect('/login');
  }

  discordApi('/users/@me/guilds', req.session.accessToken)
    .then(guilds => {
      const manageable = guilds.filter(g => {
        try {
          const permissions = BigInt(g.permissions);
          return g.owner || (permissions & PermissionFlagsBits.ManageGuild) === PermissionFlagsBits.ManageGuild ||
            (permissions & PermissionFlagsBits.Administrator) === PermissionFlagsBits.Administrator;
        } catch { return false; }
      });
      const cards = manageable.map(g => {
        const icon = g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64` : '';
        const image = icon ? `<img src="${icon}" alt="" class="avatar" style="object-fit:cover">` : `<div class="avatar">${escapeHtml(g.name.slice(0, 1).toUpperCase())}</div>`;
        const inBot = client.guilds.cache.has(g.id);
        return `<a class="server" href="/guild/${encodeURIComponent(g.id)}"><div class="server-top">${image}<div><strong>${escapeHtml(g.name)}</strong><div class="muted" style="font-size:12px">${inBot ? 'Bot connected' : 'Bot not detected'}</div></div></div><span class="muted">Open settings →</span></a>`;
      }).join('');
      const body = `<section class="hero"><div class="eyebrow">Control center</div><h1>Choose a server.</h1><p class="muted">Only servers where you have Manage Server or Administrator access are shown.</p></section>
        ${manageable.length ? `<div class="grid">${cards}</div>` : `<div class="panel"><p>No manageable servers were found for this account.</p><p class="muted">Log in with the correct Discord account, or make sure you have Manage Server permission.</p></div>`}`;
      res.send(page('Your servers', body, req));
    })
    .catch(err => {
      console.error('Could not fetch user guilds:', err.message);
      res.status(502).send(page('Discord connection error', '<div class="panel"><h1>Could not load servers</h1><p class="muted">Your Discord session may have expired. Please log in again.</p><a class="button" href="/logout">Log in again</a></div>', req));
    });
});

app.get('/login', (req, res) => {
  const state = crypto.randomBytes(24).toString('hex');
  req.session.oauthState = state;
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.OAUTH_CALLBACK_URL,
    response_type: 'code',
    scope: 'identify guilds',
    state
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

app.get('/auth/discord/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.status(400).send(page('Login cancelled', '<p>Discord login was cancelled.</p><a class="button" href="/login">Try again</a>', req));
  if (!code || !state || !req.session.oauthState || state !== req.session.oauthState) {
    return res.status(400).send(page('Login failed', '<p>Invalid or expired login state. Please try again.</p><a class="button" href="/login">Try again</a>', req));
  }
  delete req.session.oauthState;
  try {
    const form = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: process.env.OAUTH_CALLBACK_URL
    });
    const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form
    });
    if (!tokenResponse.ok) throw new Error(`Token exchange failed (${tokenResponse.status})`);
    const token = await tokenResponse.json();
    const user = await discordApi('/users/@me', token.access_token);
    req.session.regenerate(err => {
      if (err) return res.status(500).send('Could not create session.');
      req.session.user = { id: user.id, username: user.global_name || user.username, avatar: user.avatar };
      req.session.accessToken = token.access_token;
      req.session.csrfToken = crypto.randomBytes(24).toString('hex');
      res.redirect('/');
    });
  } catch (err) {
    console.error('OAuth callback error:', err.message);
    res.status(502).send(page('Login failed', '<p>Discord login could not be completed. Please try again.</p><a class="button" href="/login">Try again</a>', req));
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

async function getManageableGuild(req, guildId) {
  if (!req.session.accessToken) return null;
  const guilds = await discordApi('/users/@me/guilds', req.session.accessToken);
  const guild = guilds.find(g => g.id === guildId);
  if (!guild) return null;
  const permissions = BigInt(guild.permissions);
  const allowed = guild.owner ||
    (permissions & PermissionFlagsBits.ManageGuild) === PermissionFlagsBits.ManageGuild ||
    (permissions & PermissionFlagsBits.Administrator) === PermissionFlagsBits.Administrator;
  return allowed ? guild : null;
}

function guildPage(guild, settings, commands, req, errorMessage = '') {
  const channels = client.guilds.cache.get(guild.id)?.channels.cache
    .filter(c => c.type === ChannelType.GuildText)
    .map(c => `<option value="${escapeHtml(c.id)}" ${settings.welcome_channel_id === c.id ? 'selected' : ''}># ${escapeHtml(c.name)}</option>`)
    .join('') || '';
  const commandItems = commands.map(c => `<div class="command"><div class="row"><strong>!${escapeHtml(c.name)}</strong><form method="post" action="/guild/${encodeURIComponent(guild.id)}/commands/delete" class="inline-form"><input type="hidden" name="_csrf" value="${csrfToken(req)}"><input type="hidden" name="name" value="${escapeHtml(c.name)}"><button class="danger" type="submit">Delete</button></form></div><p class="muted">${escapeHtml(c.response)}</p></div>`).join('');
  const body = `<section class="hero"><div class="eyebrow"><a href="/">← All servers</a></div><h1>${escapeHtml(guild.name)}</h1><p class="muted">Manage this server's bot configuration.</p></section>
    ${errorMessage ? `<div class="notice">${escapeHtml(errorMessage)}</div>` : ''}
    ${!client.guilds.cache.has(guild.id) ? `<div class="notice">The bot is not currently detected in this server. Invite it before using the settings. Channel choices appear after the bot joins.</div>` : ''}
    <form method="post" action="/guild/${encodeURIComponent(guild.id)}/settings" class="panel">
      <input type="hidden" name="_csrf" value="${csrfToken(req)}">
      <h2 class="section-title">General settings</h2><p class="muted">These settings affect this server only.</p>
      <div class="form-grid">
        <div><label for="prefix">Prefix</label><input id="prefix" name="prefix" maxlength="5" required value="${escapeHtml(settings.prefix)}"><p class="muted">Example: ! or ? (slash commands work independently).</p></div>
        <div><label for="welcome_channel_id">Welcome channel</label><select id="welcome_channel_id" name="welcome_channel_id"><option value="">Choose a text channel</option>${channels}</select></div>
      </div>
      <label for="welcome_message">Welcome message</label><textarea id="welcome_message" name="welcome_message" maxlength="1800" required>${escapeHtml(settings.welcome_message)}</textarea>
      <p class="muted">Available placeholders: <code>{user}</code>, <code>{server}</code>.</p>
      <label class="toggle"><input type="checkbox" name="welcome_enabled" value="1" ${settings.welcome_enabled ? 'checked' : ''}> Enable welcome messages</label>
      <label class="toggle"><input type="checkbox" name="moderation_enabled" value="1" ${settings.moderation_enabled ? 'checked' : ''}> Enable moderation module (starter toggle)</label>
      <button type="submit">Save settings</button>
    </form>
    <section class="panel" style="margin-top:16px"><h2 class="section-title">Custom commands</h2><p class="muted">Create simple text responses. Names use letters, numbers, underscores, and hyphens. These responses do not execute code.</p>
      <form method="post" action="/guild/${encodeURIComponent(guild.id)}/commands/add">
        <input type="hidden" name="_csrf" value="${csrfToken(req)}">
        <label for="command_name">Command name</label><input id="command_name" name="name" maxlength="32" pattern="[a-zA-Z0-9_-]+" required placeholder="rules">
        <label for="command_response">Response</label><textarea id="command_response" name="response" maxlength="1800" required placeholder="Read the rules in #rules."></textarea>
        <p style="margin-top:14px"><button type="submit">Save custom command</button></p>
      </form>
      ${commandItems || '<p class="muted">No custom commands yet.</p>'}
    </section>`;
  return page(`${guild.name} settings`, body, req);
}

app.get('/guild/:id', requireLogin, async (req, res) => {
  try {
    const guild = await getManageableGuild(req, req.params.id);
    if (!guild) return res.status(403).send(page('Access denied', '<div class="panel"><h1>Access denied</h1><p class="muted">You need Manage Server or Administrator permission for this server.</p><a class="button" href="/">Back</a></div>', req));
    res.send(guildPage(guild, getSettings(guild.id), listCustomCommands(guild.id), req));
  } catch (err) {
    console.error('Guild page error:', err.message);
    res.status(502).send(page('Error', '<p>Could not verify your server permissions. Try logging in again.</p><a class="button" href="/logout">Log in again</a>', req));
  }
});

app.post('/guild/:id/settings', requireLogin, checkCsrf, async (req, res) => {
  try {
    const guild = await getManageableGuild(req, req.params.id);
    if (!guild) return res.status(403).send('Forbidden');
    const prefix = String(req.body.prefix || '').trim();
    const welcomeMessage = String(req.body.welcome_message || '').trim();
    const channelId = String(req.body.welcome_channel_id || '');
    if (!prefix || prefix.length > 5) return res.status(400).send('Prefix must be 1–5 characters.');
    if (!welcomeMessage || welcomeMessage.length > 1800) return res.status(400).send('Welcome message must be 1–1800 characters.');
    const botGuild = client.guilds.cache.get(guild.id);
    if (channelId && (!botGuild || !botGuild.channels.cache.get(channelId) || botGuild.channels.cache.get(channelId).type !== ChannelType.GuildText)) {
      return res.status(400).send('Choose a valid text channel the bot can access.');
    }
    updateSettings(guild.id, {
      prefix,
      welcome_enabled: req.body.welcome_enabled === '1' ? 1 : 0,
      welcome_channel_id: channelId,
      welcome_message: welcomeMessage,
      moderation_enabled: req.body.moderation_enabled === '1' ? 1 : 0
    });
    res.redirect(`/guild/${encodeURIComponent(guild.id)}`);
  } catch (err) {
    console.error('Settings save error:', err.message);
    res.status(500).send('Could not save settings.');
  }
});

app.post('/guild/:id/commands/add', requireLogin, checkCsrf, async (req, res) => {
  try {
    const guild = await getManageableGuild(req, req.params.id);
    if (!guild) return res.status(403).send('Forbidden');
    const name = String(req.body.name || '').trim().toLowerCase();
    const response = String(req.body.response || '').trim();
    if (!/^[a-z0-9_-]{1,32}$/.test(name)) return res.status(400).send('Use 1–32 letters, numbers, underscores, or hyphens.');
    if (!response || response.length > 1800) return res.status(400).send('Response must be 1–1800 characters.');
    addCustomCommand(guild.id, name, response);
    res.redirect(`/guild/${encodeURIComponent(guild.id)}`);
  } catch (err) {
    console.error('Custom command save error:', err.message);
    res.status(500).send('Could not save custom command.');
  }
});

app.post('/guild/:id/commands/delete', requireLogin, checkCsrf, async (req, res) => {
  try {
    const guild = await getManageableGuild(req, req.params.id);
    if (!guild) return res.status(403).send('Forbidden');
    const name = String(req.body.name || '').trim().toLowerCase();
    deleteCustomCommand(guild.id, name);
    res.redirect(`/guild/${encodeURIComponent(guild.id)}`);
  } catch (err) {
    console.error('Custom command delete error:', err.message);
    res.status(500).send('Could not delete custom command.');
  }
});

client.once(Events.ClientReady, readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  console.log(`Connected to ${readyClient.guilds.cache.size} server(s).`);
});

client.on(Events.GuildMemberAdd, async member => {
  try {
    const settings = getSettings(member.guild.id);
    if (!settings.welcome_enabled || !settings.welcome_channel_id) return;
    const channel = member.guild.channels.cache.get(settings.welcome_channel_id);
    if (!channel || !channel.isTextBased()) return;
    const message = settings.welcome_message
      .replaceAll('{user}', `<@${member.id}>`)
      .replaceAll('{server}', member.guild.name);
    await channel.send({ content: message, allowedMentions: { parse: [], users: [member.id] } });
  } catch (err) {
    console.error(`Welcome message failed in ${member.guild.name}:`, err.message);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  try {
    if (interaction.commandName === 'ping') {
      return interaction.reply({ content: `Pong! ${client.ws.ping}ms`, ephemeral: true });
    }
    if (interaction.commandName === 'settings') {
      const s = getSettings(interaction.guildId);
      return interaction.reply({
        content: `**Server settings**\nPrefix: \`${s.prefix}\`\nWelcome messages: ${s.welcome_enabled ? 'Enabled' : 'Disabled'}\nModeration module: ${s.moderation_enabled ? 'Enabled' : 'Disabled'}\nCustom commands: ${listCustomCommands(interaction.guildId).length}`,
        ephemeral: true
      });
    }
    if (interaction.commandName === 'customcommand') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: 'You need Manage Server permission to do that.', ephemeral: true });
      }
      const sub = interaction.options.getSubcommand();
      const name = interaction.options.getString('name', true).trim().toLowerCase();
      if (!/^[a-z0-9_-]{1,32}$/.test(name)) {
        return interaction.reply({ content: 'Use 1–32 letters, numbers, underscores, or hyphens for the command name.', ephemeral: true });
      }
      if (sub === 'add') {
        const response = interaction.options.getString('response', true).trim();
        if (!response) return interaction.reply({ content: 'Response cannot be empty.', ephemeral: true });
        addCustomCommand(interaction.guildId, name, response);
        return interaction.reply({ content: `Saved custom command \`${name}\`.`, ephemeral: true });
      }
      const removed = deleteCustomCommand(interaction.guildId, name);
      return interaction.reply({ content: removed ? `Removed custom command \`${name}\`.` : `No custom command named \`${name}\` was found.`, ephemeral: true });
    }
  } catch (err) {
    console.error('Command error:', err);
    const reply = { content: 'Something went wrong while running that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(reply).catch(() => {});
    else await interaction.reply(reply).catch(() => {});
  }
});

// Optional prefix-based custom commands. Enable Message Content Intent in the Developer Portal
// and add GatewayIntentBits.MessageContent above if you want these to respond to plain messages.
client.on(Events.MessageCreate, async message => {
  if (!message.guild || message.author.bot) return;
  const settings = getSettings(message.guild.id);
  if (!message.content.startsWith(settings.prefix)) return;
  const commandName = message.content.slice(settings.prefix.length).trim().split(/\s+/)[0]?.toLowerCase();
  if (!commandName) return;
  const command = getCustomCommand(message.guild.id, commandName);
  if (command) await message.reply({ content: command.response, allowedMentions: { parse: [] } }).catch(() => {});
});

app.get('/health', (req, res) => res.json({ ok: true, botReady: client.isReady(), guilds: client.guilds.cache.size }));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Dashboard listening on port ${port}`));

client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
  console.error('Discord login failed:', err);
  process.exit(1);
});
