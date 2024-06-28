// src/interactions/modalHandlers.ts

import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ModalBuilder, ModalSubmitInteraction, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import * as adminDB from '../database/admin';
import { temporaryStorage } from '../utils/temporaryStorage';
import { CONSTANTS } from '../constants';
import { chunkArray } from '../utils/arrayUtils';

export async function handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    const [customId, ...params] = interaction.customId.split(':');

    console.log(`Handling modal submit: ${customId}`);

    if (interaction.customId.startsWith('setCommitteeModal:')) {
        await handleSetCommitteeModalSubmit(interaction);
        return;
    }
    switch (customId) {
        case CONSTANTS.MODAL_IDS.ADD_SME_CATEGORY:
            await handleAddSMECategorySubmit(interaction);
            break;
          case CONSTANTS.MODAL_IDS.REMOVE_SME:
            await handleRemoveSMESubmit(interaction);
            break;
          case CONSTANTS.MODAL_IDS.ADD_PROPOSAL_TOPIC:
            await handleAddProposalTopicSubmit(interaction);
            break;
          case CONSTANTS.MODAL_IDS.ADD_SME:
            await handleAddSMESubmit(interaction, params[0]);
            break;
        // Add more cases as needed
    }
}

async function handleAddSMECategorySubmit(interaction: ModalSubmitInteraction): Promise<void> {
    const categoryName = interaction.fields.getTextInputValue('categoryName');

    try {
        await adminDB.addSMECategory(categoryName);
        await interaction.reply({ content: `SME Category "${categoryName}" has been added successfully.`, ephemeral: true });
    } catch (error) {
        console.error('Error adding SME category:', error);
        await interaction.reply({ content: 'An error occurred while adding the SME category. Please try again.', ephemeral: true });
    }
}

async function handleRemoveSMESubmit(interaction: ModalSubmitInteraction): Promise<void> {
    const discordUserId = interaction.fields.getTextInputValue('discordUserId');

    try {
        await adminDB.removeSME(discordUserId);
        await interaction.reply({ content: `SME with Discord User ID "${discordUserId}" has been removed successfully.`, ephemeral: true });
    } catch (error) {
        console.error('Error removing SME:', error);
        await interaction.reply({ content: 'An error occurred while removing the SME. Please try again.', ephemeral: true });
    }
}

async function handleAddProposalTopicSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    const topicName = interaction.fields.getTextInputValue('topicName');
    const topicDetails = interaction.fields.getTextInputValue('topicDetails');

    try {
        await adminDB.addProposalTopic(topicName, topicDetails);
        await interaction.reply({ content: `Proposal Topic "${topicName}" has been added successfully.`, ephemeral: true });
    } catch (error) {
        console.error('Error adding proposal topic:', error);
        await interaction.reply({ content: 'An error occurred while adding the proposal topic. Please try again.', ephemeral: true });
    }
}
export async function handleStringSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
    const [customId, pageIndex] = interaction.customId.split(':');

    console.log(`Handling string select menu. custonId: ${customId}, pageIndex: ${pageIndex}`);
    try {
        switch (customId) {
            case CONSTANTS.CUSTOM_IDS.SME_CATEGORY_SELECT:
                await handleAddSMECategorySelect(interaction);
                break;
            case CONSTANTS.CUSTOM_IDS.REMOVE_TOPIC_SELECT:
                await handleRemoveTopicSelectSubmit(interaction);
                break;
            case CONSTANTS.CUSTOM_IDS.TOPIC_SELECT                :
            case CONSTANTS.CUSTOM_IDS.CATEGORY_SELECT:
                await handleMultiStepSelectMenu(interaction);
                break;
        }
    } catch (error) {
        console.error('Error handling string select menu:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'An error occurred while processing your selection. Please try again.', ephemeral: true });
        }
    }
}

async function handleAddSMECategorySelect(interaction: StringSelectMenuInteraction): Promise<void> {
    const [categoryId] = interaction.values[0].split(':');
    
    const modal = new ModalBuilder()
      .setCustomId(`${CONSTANTS.MODAL_IDS.ADD_SME}:${categoryId}`)
      .setTitle('Add SME');
  
    const discordUserIdInput = new TextInputBuilder()
      .setCustomId(CONSTANTS.INPUT_IDS.DISCORD_USER_ID)
      .setLabel('Discord User ID')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
  
    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(discordUserIdInput);
    modal.addComponents(row);
  
    await interaction.showModal(modal);
  }
  
  async function handleAddSMESubmit(interaction: ModalSubmitInteraction, categoryId: string): Promise<void> {
    const discordUserId = interaction.fields.getTextInputValue(CONSTANTS.INPUT_IDS.DISCORD_USER_ID);
    
    try {
      await adminDB.addSME(parseInt(categoryId), discordUserId);
      await interaction.reply({ content: `SME with Discord User ID "${discordUserId}" has been added successfully to the category.`, ephemeral: true });
    } catch (error) {
      console.error('Error adding SME:', error);
      await interaction.reply({ content: 'An error occurred while adding the SME. Please try again.', ephemeral: true });
    }
  }

async function handleMultiStepSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
    const { customId, values } = interaction;
    const [selectedId] = values;

    const key = `${interaction.user.id}:${customId}`;
    await temporaryStorage.set(key, selectedId);

    if (customId === CONSTANTS.CUSTOM_IDS.TOPIC_SELECT) {
        await interaction.update({ content: 'Now select an SME category:', components: [interaction.message.components[1]] });
    } else if (customId === CONSTANTS.CUSTOM_IDS.CATEGORY_SELECT) {
        const topicId = await temporaryStorage.get(`${interaction.user.id}:${CONSTANTS.CUSTOM_IDS.TOPIC_SELECT}`);
        const categoryId = selectedId;

        if (!topicId) {
            await interaction.reply({ content: 'An error occurred. Please start the process again.', ephemeral: true });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId(`${CONSTANTS.MODAL_IDS.SET_COMMITTEE}:${topicId}:${categoryId}`)
            .setTitle('Set Committee');

        const numberOfSMEsInput = new TextInputBuilder()
            .setCustomId(CONSTANTS.INPUT_IDS.NUMBER_OF_SMES)
            .setLabel('Number of SMEs')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row = new ActionRowBuilder<TextInputBuilder>().addComponents(numberOfSMEsInput);
        modal.addComponents(row);

        await interaction.showModal(modal);

        // Clear temporary storage
        await temporaryStorage.delete(`${interaction.user.id}:${CONSTANTS.CUSTOM_IDS.TOPIC_SELECT}`);
    }
}

async function handleSetCommitteeModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    const [, topicId, categoryId] = interaction.customId.split(':');
    const numberOfSMEs = parseInt(interaction.fields.getTextInputValue(CONSTANTS.INPUT_IDS.NUMBER_OF_SMES));

    try {
        await adminDB.setProposalTopicCommittee(parseInt(topicId), parseInt(categoryId), numberOfSMEs);
        await interaction.reply({ content: 'Proposal topic committee has been set successfully.', ephemeral: true });
    } catch (error) {
        console.error('Error setting proposal topic committee:', error);
        await interaction.reply({ content: 'An error occurred while setting the proposal topic committee. Please try again.', ephemeral: true });
    }
}

async function handleAddSMESelectSubmit(interaction: StringSelectMenuInteraction): Promise<void> {
    const [categoryId] = interaction.values[0].split(':');
    
    console.log(`Selected category ID: ${categoryId}`);
    const modal = new ModalBuilder()
      .setCustomId(`${CONSTANTS.MODAL_IDS.ADD_SME}:${categoryId}`)
      .setTitle('Add SME');
  
    const discordUserIdInput = new TextInputBuilder()
      .setCustomId(CONSTANTS.INPUT_IDS.DISCORD_USER_ID)
      .setLabel('Discord User ID')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
  
    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(discordUserIdInput);
    modal.addComponents(row);
  
    await interaction.showModal(modal);
  }

async function handleRemoveTopicSelectSubmit(interaction: StringSelectMenuInteraction): Promise<void> {
    const [topicId] = interaction.values[0].split(':');
    
    console.log(`Selected topic ID to remove: ${topicId}`);
    try {
      const topic = await adminDB.getProposalTopicById(parseInt(topicId));
      if (topic) {
        await adminDB.removeProposalTopic(topic.name);
        await interaction.reply({ content: `Proposal Topic "${topic.name}" has been removed successfully.`, ephemeral: true });
      } else {
        await interaction.reply({ content: 'Topic not found. Please try again.', ephemeral: true });
      }
    } catch (error) {
      console.error('Error removing proposal topic:', error);
      await interaction.reply({ content: 'An error occurred while removing the proposal topic. Please try again.', ephemeral: true });
    }
  }

  export async function handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    const [customIdPrefix, action, newPageIndex] = interaction.customId.split(':');
  
    if (action === 'next' || action === 'prev') {
      let items: any[];
      let title: string;
  
      if (customIdPrefix === CONSTANTS.CUSTOM_IDS.SME_CATEGORY_SELECT) {
        items = await adminDB.getSMECategories();
        title = 'Add SME';
      } else if (customIdPrefix === CONSTANTS.CUSTOM_IDS.REMOVE_TOPIC_SELECT) {
        items = await adminDB.getProposalTopics();
        title = 'Remove Proposal Topic';
      } else {
        await interaction.reply({ content: 'Invalid button interaction.', ephemeral: true });
        return;
      }
  
      const chunks = chunkArray(items, 25);
      const totalPages = chunks.length;
      const currentPage = parseInt(newPageIndex);
  
      const options = chunks[currentPage].map((item, index) => 
        new StringSelectMenuOptionBuilder()
          .setLabel(item.name)
          .setValue(`${item.id}:${index + currentPage * 25}`)
      );
  
      const select = new StringSelectMenuBuilder()
        .setCustomId(`${customIdPrefix}:${currentPage}`)
        .setPlaceholder(`Select ${title} (Page ${currentPage + 1}/${totalPages})`)
        .addOptions(options);
  
      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  
      const buttonRow = new ActionRowBuilder<ButtonBuilder>();
  
      if (currentPage > 0) {
        buttonRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`${customIdPrefix}:prev:${currentPage - 1}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
        );
      }
  
      if (currentPage < totalPages - 1) {
        buttonRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`${customIdPrefix}:next:${currentPage + 1}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
        );
      }
  
      await interaction.update({
        content: `${title} (Page ${currentPage + 1}/${totalPages}):`,
        components: [row, buttonRow],
      });
    }
  }