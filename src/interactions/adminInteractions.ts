import { ButtonInteraction, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { checkAdminStatus} from '../utils/adminChecker';
import * as adminDB from '../database/admin';
import { CONSTANTS } from '../constants';
import { chunkArray } from '../utils/arrayUtils';

export async function handleAdminInteractions(interaction: ButtonInteraction): Promise<void> {
    if (!await checkAdminStatus(interaction)) return;

    try {
        console.log(`Handling interaction: ${interaction.customId}`);
        switch (interaction.customId) {
            case CONSTANTS.CUSTOM_IDS.ADD_SME_CATEGORY:
                await handleAddSMECategory(interaction);
                break;
            case CONSTANTS.CUSTOM_IDS.ADD_SME:
                await handleAddSME(interaction);
                break;
            case CONSTANTS.CUSTOM_IDS.REMOVE_SME:
                await handleRemoveSME(interaction);
                break;
            case CONSTANTS.CUSTOM_IDS.ADD_PROPOSAL_TOPIC:
                await handleAddProposalTopic(interaction);
                break;
            case CONSTANTS.CUSTOM_IDS.REMOVE_PROPOSAL_TOPIC:
                await handleRemoveProposalTopic(interaction);
                break;
            case CONSTANTS.CUSTOM_IDS.SET_PROPOSAL_TOPIC_COMMITTEE:
                await handleSetProposalTopicCommittee(interaction);
                break;
            case CONSTANTS.CUSTOM_IDS.SET_PROPOSAL_TOPIC_PROPOSERS:
                await handleSetProposalTopicProposers(interaction);
                break;
            default:
                await interaction.reply({ content: 'Unknown command', ephemeral: true });
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'An error occurred while processing your request. Please try again.', ephemeral: true });
        }
    }
}

async function handleAddSMECategory(interaction: ButtonInteraction): Promise<void> {
    const modal = new ModalBuilder()
        .setCustomId(CONSTANTS.MODAL_IDS.ADD_SME_CATEGORY)
        .setTitle('Add SME Category');

    const categoryNameInput = new TextInputBuilder()
        .setCustomId(CONSTANTS.INPUT_IDS.CATEGORY_NAME)
        .setLabel('Category Name')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(categoryNameInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

async function handleAddSME(interaction: ButtonInteraction): Promise<void> {
    const categories = await adminDB.getSMECategories();
    
    if (categories.length === 0) {
      await interaction.reply({ content: 'No SME categories found. Please add a category first.', ephemeral: true });
      return;
    }
  
    await showPaginatedMenu(interaction, categories, 'Add SME', CONSTANTS.CUSTOM_IDS.SME_CATEGORY_SELECT);
  }

async function handleRemoveSME(interaction: ButtonInteraction): Promise<void> {
    const modal = new ModalBuilder()
        .setCustomId(CONSTANTS.MODAL_IDS.REMOVE_SME)
        .setTitle('Remove SME');

    const discordUserIdInput = new TextInputBuilder()
        .setCustomId(CONSTANTS.INPUT_IDS.DISCORD_USER_ID)
        .setLabel('Discord User ID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(discordUserIdInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

async function handleAddProposalTopic(interaction: ButtonInteraction): Promise<void> {
    const modal = new ModalBuilder()
        .setCustomId(CONSTANTS.MODAL_IDS.ADD_PROPOSAL_TOPIC)
        .setTitle('Add Proposal Topic');

    const topicNameInput = new TextInputBuilder()
        .setCustomId(CONSTANTS.INPUT_IDS.TOPIC_NAME)
        .setLabel('Topic Name')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const topicDetailsInput = new TextInputBuilder()
        .setCustomId(CONSTANTS.INPUT_IDS.TOPIC_DETAILS)
        .setLabel('Topic Details')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(topicNameInput);
    const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(topicDetailsInput);
    modal.addComponents(row1, row2);

    await interaction.showModal(modal);
}

async function handleRemoveProposalTopic(interaction: ButtonInteraction): Promise<void> {
    const topics = await adminDB.getProposalTopics();
    
    if (topics.length === 0) {
      await interaction.reply({ content: 'No proposal topics found.', ephemeral: true });
      return;
    }
  
    await showPaginatedMenu(interaction, topics, 'Remove Proposal Topic', CONSTANTS.CUSTOM_IDS.REMOVE_TOPIC_SELECT);
  }


async function handleSetProposalTopicCommittee(interaction: ButtonInteraction): Promise<void> {
    const topics = await adminDB.getProposalTopics();
    const categories = await adminDB.getSMECategories();

    if (topics.length === 0 || categories.length === 0) {
        await interaction.reply({ content: 'Not enough data to set up a committee. Ensure you have both proposal topics and SME categories.', ephemeral: true });
        return;
    }

    const topicOptions = topics.slice(0, 25).map(topic =>
        new StringSelectMenuOptionBuilder()
            .setLabel(topic.name)
            .setValue(topic.id.toString())
    );

    const categoryOptions = categories.slice(0, 25).map(category =>
        new StringSelectMenuOptionBuilder()
            .setLabel(category.name)
            .setValue(category.id.toString())
    );

    const topicSelect = new StringSelectMenuBuilder()
        .setCustomId(CONSTANTS.CUSTOM_IDS.TOPIC_SELECT)
        .setPlaceholder('Select Proposal Topic')
        .addOptions(topicOptions);

    const categorySelect = new StringSelectMenuBuilder()
        .setCustomId(CONSTANTS.CUSTOM_IDS.CATEGORY_SELECT)
        .setPlaceholder('Select SME Category')
        .addOptions(categoryOptions);

    const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(topicSelect);
    const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(categorySelect);

    await interaction.reply({
        content: 'Select a proposal topic and SME category:',
        components: [row1, row2],
        ephemeral: true
    });
}

async function handleSetProposalTopicProposers(interaction: ButtonInteraction): Promise<void> {
    const topics = await adminDB.getProposalTopics();
    const categories = await adminDB.getSMECategories();

    if (topics.length === 0 || categories.length === 0) {
        await interaction.reply({ content: 'Not enough data to set up proposers. Ensure you have both proposal topics and SME categories.', ephemeral: true });
        return;
    }

    const topicOptions = topics.slice(0, 25).map(topic =>
        new StringSelectMenuOptionBuilder()
            .setLabel(topic.name)
            .setValue(topic.id.toString())
    );

    const categoryOptions = categories.slice(0, 25).map(category =>
        new StringSelectMenuOptionBuilder()
            .setLabel(category.name)
            .setValue(category.id.toString())
    );

    const topicSelect = new StringSelectMenuBuilder()
        .setCustomId(CONSTANTS.CUSTOM_IDS.TOPIC_SELECT)
        .setPlaceholder('Select Proposal Topic')
        .addOptions(topicOptions);

    const categorySelect = new StringSelectMenuBuilder()
        .setCustomId(CONSTANTS.CUSTOM_IDS.CATEGORY_SELECT)
        .setPlaceholder('Select SME Category')
        .addOptions(categoryOptions);

    const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(topicSelect);
    const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(categorySelect);

    await interaction.reply({
        content: 'Select a proposal topic and SME category for proposers:',
        components: [row1, row2],
        ephemeral: true
    });
}


async function showPaginatedMenu(interaction: ButtonInteraction, items: any[], title: string, customIdPrefix: string): Promise<void> {
    const chunks = chunkArray(items, 25);
    const totalPages = chunks.length;
  
    if (totalPages === 1) {
      const options = items.map((item, index) => 
        new StringSelectMenuOptionBuilder()
          .setLabel(item.name)
          .setValue(`${item.id}:${index}`)
      );
  
      const select = new StringSelectMenuBuilder()
        .setCustomId(`${customIdPrefix}:0`)
        .setPlaceholder(`Select ${title}`)
        .addOptions(options);
  
      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  
      await interaction.reply({
        content: `${title}:`,
        components: [row],
        ephemeral: true
      });
    } else {
      const options = chunks[0].map((item, index) => 
        new StringSelectMenuOptionBuilder()
          .setLabel(item.name)
          .setValue(`${item.id}:${index}`)
      );
  
      const select = new StringSelectMenuBuilder()
        .setCustomId(`${customIdPrefix}:0`)
        .setPlaceholder(`Select ${title} (Page 1/${totalPages})`)
        .addOptions(options);
  
      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  
      const nextButton = new ButtonBuilder()
        .setCustomId(`${customIdPrefix}:next:1`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary);
  
      const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(nextButton);
  
      await interaction.reply({
        content: `${title} (Page 1/${totalPages}):`,
        components: [row, buttonRow],
        ephemeral: true
      });
    }
  }
  