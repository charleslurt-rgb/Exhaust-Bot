require('dotenv').config();
const { REST, Routes } = require('discord.js');
const commands = require('./commands');

const { DISCORD_CLIENT_ID, DISCORD_BOT_TOKEN, DEV_GUILD_ID } = process.env;

if (!DISCORD_CLIENT_ID || !DISCORD_BOT_TOKEN) {
  throw new Error('Set DISCORD_CLIENT_ID and DISCORD_BOT_TOKEN before deploying commands.');
}

const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

(async () => {
  if (DEV_GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DEV_GUILD_ID), { body: commands });
    console.log(`Registered ${commands.length} command(s) in development guild ${DEV_GUILD_ID}.`);
  } else {
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commands });
    console.log(`Registered ${commands.length} global command(s). They may take time to appear.`);
  }
})().catch(error => {
  console.error('Command registration failed:', error);
  process.exit(1);
});
