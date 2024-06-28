import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { initializeDatabase } from '../src/database';
import { addAdmin, removeAdmin } from '../src/database/admin';
import { checkRequiredChannels } from '../src/commands/checkChannels';

dotenv.config();

const client: Client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

async function main(): Promise<void> {
  await initializeDatabase();

  yargs(hideBin(process.argv))
    .command('addAdmin <discordUserId>', 'Add an admin', {}, async (argv): Promise<void> => {
      await addAdmin(argv.discordUserId as string);
      console.log(`Admin added: ${argv.discordUserId}`);
    })
    .command('removeAdmin <discordUserId>', 'Remove an admin', {}, async (argv): Promise<void> => {
      await removeAdmin(argv.discordUserId as string);
      console.log(`Admin removed: ${argv.discordUserId}`);
    })
    .command('checkChannels', 'Check required channels', {}, async (): Promise<void> => {
      await client.login(process.env.DISCORD_TOKEN);
      await checkRequiredChannels(client);
      client.destroy();
    })
    .demandCommand(1)
    .parse();
}

main().catch(console.error);