
import { Client, Guild, ChannelType, CategoryChannel } from 'discord.js';
import { CONSTANTS } from '../constants';

export async function checkRequiredChannels(client: Client): Promise<void> {
  const guild: Guild | undefined = client.guilds.cache.get(process.env.GUILD_ID!);
  if (!guild) {
    console.error(`${CONSTANTS.EMOJIS.ERROR} Guild not found`);
    return;
  }

  const govbotCategory: CategoryChannel | undefined = guild.channels.cache.find(
    (ch): boolean => ch.name === CONSTANTS.CATEGORY.GOVBOT && ch.type === ChannelType.GuildCategory
  ) as CategoryChannel | undefined;

  if (!govbotCategory) {
    console.log(`${CONSTANTS.EMOJIS.ERROR} 'govbot' category not found`);
    return;
  }

  console.log(`${CONSTANTS.EMOJIS.SUCCESS} 'govbot' category found`);

  const requiredChannels: string[] = Object.values(CONSTANTS.CHANNELS);

  for (const channelName of requiredChannels) {
    const channel = govbotCategory.children.cache.find(
      (ch): boolean => ch.name === channelName && ch.type === ChannelType.GuildText
    );

    if (channel) {
      console.log(`${CONSTANTS.EMOJIS.SUCCESS} '${channelName}' channel found in 'govbot' category`);
    } else {
      console.log(`${CONSTANTS.EMOJIS.ERROR} '${channelName}' channel not found in 'govbot' category`);
    }
  }
}