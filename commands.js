const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check whether the bot is responding.'),
  new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Show this server’s current customizable settings.'),
  new SlashCommandBuilder()
    .setName('customcommand')
    .setDescription('Create or remove a simple custom text command.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Create or update a custom command.')
      .addStringOption(option => option.setName('name').setDescription('Command name, without prefix').setRequired(true).setMaxLength(32))
      .addStringOption(option => option.setName('response').setDescription('Text the bot should send').setRequired(true).setMaxLength(1800)))
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Remove a custom command.')
      .addStringOption(option => option.setName('name').setDescription('Command name to remove').setRequired(true).setMaxLength(32)))
].map(command => command.toJSON());

module.exports = commands;
