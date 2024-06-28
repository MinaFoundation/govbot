import { Client, GatewayIntentBits, Interaction, TextChannel, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, CategoryChannel } from 'discord.js';
import dotenv from 'dotenv';
import { initializeDatabase } from './database';
import { handleAdminInteractions } from './interactions/adminInteractions';
import { CONSTANTS } from './constants';
import { handleButtonInteraction, handleModalSubmit, handleStringSelectMenu } from './interactions/modalHandlers';

dotenv.config();

const client: Client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', async (): Promise<void> => {
  console.log('Bot is ready!');
  await initializeDatabase();
  await setupAdminChannel(client);
});

client.on('interactionCreate', async (interaction: Interaction): Promise<void> => {
  try {
    if (interaction.isButton()) {
      if (interaction.customId.includes('next') || interaction.customId.includes('prev')) {
        await handleButtonInteraction(interaction);
      } else {
        await handleAdminInteractions(interaction);
      }
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleStringSelectMenu(interaction);
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'An error occurred while processing your request. Please try again.', ephemeral: true });
    }
  }
});

async function setupAdminChannel(client: Client): Promise<void> {
  const guild = client.guilds.cache.get(process.env.GUILD_ID!);
  if (!guild) {
    console.error('Guild not found');
    return;
  }

  const govbotCategory: CategoryChannel | undefined = guild.channels.cache.find(
    (ch): boolean => ch.name === CONSTANTS.CATEGORY.GOVBOT && ch.type === ChannelType.GuildCategory
  ) as CategoryChannel | undefined;

  if (!govbotCategory) {
    console.error(`${CONSTANTS.EMOJIS.ERROR} 'govbot' category not found`);
    return;
  }

  const adminChannel: TextChannel | undefined = govbotCategory.children.cache.find(
    (ch): boolean => ch.name === CONSTANTS.CHANNELS.ADMIN && ch.type === ChannelType.GuildText
  ) as TextChannel | undefined;

  if (!adminChannel) {
    console.error(`${CONSTANTS.EMOJIS.ERROR} 'admin' channel not found in 'govbot' category`);
    return;
  }

  const embed: EmbedBuilder = new EmbedBuilder()
    .setTitle('Admin Dashboard')
    .setDescription('Manage SMEs and Proposal Topics here.')
    .setColor(0x0099FF);

  const row: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(CONSTANTS.CUSTOM_IDS.ADD_SME_CATEGORY)
        .setLabel('Add SME Category')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(CONSTANTS.CUSTOM_IDS.ADD_SME)
        .setLabel('Add SME')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(CONSTANTS.CUSTOM_IDS.REMOVE_SME)
        .setLabel('Remove SME')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(CONSTANTS.CUSTOM_IDS.ADD_PROPOSAL_TOPIC)
        .setLabel('Add Proposal Topic')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(CONSTANTS.CUSTOM_IDS.REMOVE_PROPOSAL_TOPIC)
        .setLabel('Remove Proposal Topic')
        .setStyle(ButtonStyle.Danger)
    );

  const row2: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(CONSTANTS.CUSTOM_IDS.SET_PROPOSAL_TOPIC_COMMITTEE)
        .setLabel('Set Topic Committee')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(CONSTANTS.CUSTOM_IDS.SET_PROPOSAL_TOPIC_PROPOSERS)
        .setLabel('Set Topic Proposers')
        .setStyle(ButtonStyle.Secondary)
    );

  await adminChannel.send({ embeds: [embed], components: [row, row2] });
}

client.login(process.env.DISCORD_TOKEN);