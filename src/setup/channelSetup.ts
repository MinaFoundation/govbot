import { Client, TextChannel, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, CategoryChannel } from 'discord.js';
import { CONSTANTS } from '../constants';

export async function setupAdminChannel(client: Client): Promise<void> {
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

  const row1: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>()
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
        .setStyle(ButtonStyle.Danger)
    );

  const row2: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(CONSTANTS.CUSTOM_IDS.ADD_PROPOSAL_TOPIC)
        .setLabel('Add Proposal Topic')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(CONSTANTS.CUSTOM_IDS.REMOVE_PROPOSAL_TOPIC)
        .setLabel('Remove Proposal Topic')
        .setStyle(ButtonStyle.Danger)
    );

  const row3: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>()
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

  await adminChannel.send({ embeds: [embed], components: [row1, row2, row3] });
}