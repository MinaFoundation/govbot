import { ButtonInteraction } from 'discord.js';
import { isAdmin } from '../database/admin';

export async function checkAdminStatus(interaction: ButtonInteraction): Promise<boolean> {
  const isUserAdmin = await isAdmin(interaction.user.id);
  if (!isUserAdmin) {
    await interaction.reply({ content: 'You do not have permission to perform this action.', ephemeral: true });
    return false;
  }
  return true;
}