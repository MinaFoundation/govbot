import { Screen, Action, Dashboard, Permission, TrackedInteraction, RenderArgs } from '../../../core/BaseClasses';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageActionRowComponentBuilder, MessageCreateOptions, ModalBuilder, StringSelectMenuBuilder, TextChannel, TextInputBuilder, TextInputStyle } from 'discord.js';
import { CustomIDOracle } from '../../../CustomIDOracle';
import { AnyInteractionWithShowModal, AnyInteractionWithValues, IHomeScreen } from '../../../types/common';
import { ProposalLogic } from '../../../logic/ProposalLogic';
import { InteractionProperties } from '../../../core/Interaction';
import { FundingRoundLogic } from '../../admin/screens/FundingRoundLogic';
import { PaginationComponent } from '../../../components/PaginationComponent';
import { FundingRound, Proposal } from '../../../models';
import { ProposalStatus } from '../../../types';

export class ProposalHomeScreen extends Screen implements IHomeScreen {
    public static readonly ID = 'proposalHome';

    protected permissions: Permission[] = []; // Add appropriate permissions if needed

    public readonly manageSubmittedProposalsAction: ManageSubmittedProposalsAction;
    public readonly manageDraftsAction: ManageDraftsAction;
    public readonly createNewProposalAction: CreateNewProposalAction;
    public readonly submitProposalToFundingRoundAction: SubmitProposalToFundingRoundAction;

    constructor(dashboard: Dashboard, screenId: string) {
        super(dashboard, screenId);
        this.manageSubmittedProposalsAction = new ManageSubmittedProposalsAction(this, ManageSubmittedProposalsAction.ID);
        this.manageDraftsAction = new ManageDraftsAction(this, ManageDraftsAction.ID);
        this.createNewProposalAction = new CreateNewProposalAction(this, CreateNewProposalAction.ID);
        this.submitProposalToFundingRoundAction = new SubmitProposalToFundingRoundAction(this, SubmitProposalToFundingRoundAction.ID);
    }

    public async renderToTextChannel(channel: TextChannel): Promise<void> {
        const content: MessageCreateOptions = await this.getResponse();
        await channel.send(content);

    }

    protected allSubScreens(): Screen[] {
        return [];
    }

    protected allActions(): Action[] {
        return [
            this.manageSubmittedProposalsAction,
            this.manageDraftsAction,
            this.createNewProposalAction,
            this.submitProposalToFundingRoundAction,
        ];
    }

    protected async getResponse(interaction?: TrackedInteraction, args?: RenderArgs): Promise<any> {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Proposal Management')
            .setDescription('Welcome to the Proposal Management channel. Here you can create, manage, and submit proposals for funding rounds.');

        const manageSubmittedButton = this.manageSubmittedProposalsAction.getComponent();
        const manageDraftsButton = this.manageDraftsAction.getComponent();
        const createNewButton = this.createNewProposalAction.getComponent();
        const submitToFundingRoundButton = this.submitProposalToFundingRoundAction.getComponent();

        const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(manageSubmittedButton, manageDraftsButton, createNewButton, submitToFundingRoundButton);

        const components = [row];

        if (args?.successMessage) {
            const successEmbed = new EmbedBuilder()
                .setColor('#28a745')
                .setDescription(args.successMessage);
            return {
                embeds: [embed, successEmbed],
                components,
                ephemeral: true
            };
        } else if (args?.errorMessage) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#dc3545')
                .setDescription(args.errorMessage);
            return {
                embeds: [embed, errorEmbed],
                components,
                ephemeral: true
            };
        }

        return {
            embeds: [embed],
            components,
            ephemeral: true
        };
    }
}

export class ManageSubmittedProposalsAction extends PaginationComponent {
    public static readonly ID: string = 'manageSubmittedProposals';

    private static readonly OPERATIONS = {
        SHOW_FUNDING_ROUNDS: 'showFundingRounds',
        SELECT_FUNDING_ROUND: 'selectFundingRound',
        SHOW_PROPOSALS: 'showProposals',
        SHOW_PROPOSAL_DETAILS: 'showProposalDetails',
        CONFIRM_CANCEL_PROPOSAL: 'confirmCancelProposal',
        EXECUTE_CANCEL_PROPOSAL: 'executeCancelProposal',
    };

    protected async getTotalPages(interaction: TrackedInteraction): Promise<number> {
        const fundingRounds: FundingRound[] = await FundingRoundLogic.getFundingRoundsWithUserProposals(interaction.interaction.user.id);
        return Math.ceil(fundingRounds.length / 25);
    }

    protected async getItemsForPage(interaction: TrackedInteraction, page: number): Promise<FundingRound[]> {
        const fundingRounds: FundingRound[] = await FundingRoundLogic.getFundingRoundsWithUserProposals(interaction.interaction.user.id);
        return fundingRounds.slice(page * 25, (page + 1) * 25);
    }

    protected async handleOperation(interaction: TrackedInteraction, operationId: string): Promise<void> {
        switch (operationId) {
            case ManageSubmittedProposalsAction.OPERATIONS.SHOW_FUNDING_ROUNDS:
                await this.handleShowFundingRounds(interaction);
                break;
            case ManageSubmittedProposalsAction.OPERATIONS.SELECT_FUNDING_ROUND:
                await this.handleSelectFundingRound(interaction);
                break;
            case ManageSubmittedProposalsAction.OPERATIONS.SHOW_PROPOSALS:
                await this.handleShowProposals(interaction);
                break;
            case ManageSubmittedProposalsAction.OPERATIONS.SHOW_PROPOSAL_DETAILS:
                await this.handleShowProposalDetails(interaction);
                break;
            case ManageSubmittedProposalsAction.OPERATIONS.CONFIRM_CANCEL_PROPOSAL:
                await this.handleConfirmCancelProposal(interaction);
                break;
            case ManageSubmittedProposalsAction.OPERATIONS.EXECUTE_CANCEL_PROPOSAL:
                await this.handleExecuteCancelProposal(interaction);
                break;
            default:
                await this.handleInvalidOperation(interaction, operationId);
        }
    }

    private async handleShowFundingRounds(interaction: TrackedInteraction): Promise<void> {
        const currentPage: number = this.getCurrentPage(interaction);
        const totalPages: number = await this.getTotalPages(interaction);
        const fundingRounds: FundingRound[] = await this.getItemsForPage(interaction, currentPage);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Select A Funding Round')
            .setDescription('To proceed, please select a funding round from the list below.');

        const selectMenu: StringSelectMenuBuilder = new StringSelectMenuBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction(this, ManageSubmittedProposalsAction.OPERATIONS.SELECT_FUNDING_ROUND))
            .setPlaceholder('Select a Funding Round')
            .addOptions(fundingRounds.map((fr: FundingRound) => ({
                label: `${fr.name}${fr.endAt < new Date() ? ' (Ended)' : ''}`,
                value: fr.id.toString(),
                description: `Budget: ${fr.budget}, Status: ${fr.status}`
            })));

        const row: ActionRowBuilder<StringSelectMenuBuilder> = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
        const components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [row];

        if (totalPages > 1) {
            const paginationRow: ActionRowBuilder<ButtonBuilder> = this.getPaginationRow(interaction, currentPage, totalPages);
            components.push(paginationRow);
        }

        await interaction.respond({ embeds: [embed], components });
    }

    private async handleSelectFundingRound(interaction: TrackedInteraction): Promise<void> {
        const interactionWithValues: AnyInteractionWithValues | undefined = InteractionProperties.toInteractionWithValuesOrUndefined(interaction.interaction);
        if (!interactionWithValues) {
            await interaction.respond({ content: 'Invalid interaction type.', ephemeral: true });
            return;
        }

        const fundingRoundId: number = parseInt(interactionWithValues.values[0]);
        await this.handleShowProposals(interaction, fundingRoundId);
    }

    private async handleShowProposals(interaction: TrackedInteraction, fundingRoundId?: number): Promise<void> {
        if (!fundingRoundId) {
            fundingRoundId = parseInt(CustomIDOracle.getNamedArgument(interaction.customId, 'fundingRoundId') || '');
        }

        if (!fundingRoundId) {
            await interaction.respond({ content: 'Invalid funding round ID.', ephemeral: true });
            return;
        }

        const fundingRound: FundingRound | null = await FundingRoundLogic.getFundingRoundById(fundingRoundId);
        if (!fundingRound) {
            await interaction.respond({ content: 'Funding round not found.', ephemeral: true });
            return;
        }

        const proposals: Proposal[] = await ProposalLogic.getUserProposalsForFundingRound(interaction.interaction.user.id, fundingRoundId);
        const eligibleProposals: Proposal[] = proposals.filter((p: Proposal) =>
            FundingRoundLogic.isProposalActiveForFundingRound(p, fundingRound)
        );

        const embed: EmbedBuilder = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Select ${fundingRound.name} Proposals`)
            .setDescription('To proceed please select a proposal from the list below.');

        const selectMenu: StringSelectMenuBuilder = new StringSelectMenuBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction(this, ManageSubmittedProposalsAction.OPERATIONS.SHOW_PROPOSAL_DETAILS, 'fundingRoundId', fundingRoundId.toString()))
            .setPlaceholder('Select a Proposal')
            .addOptions(eligibleProposals.map((p: Proposal) => ({
                label: p.name,
                value: p.id.toString(),
                description: `ID: ${p.id} Budget: ${p.budget}, Status: ${p.status}`
            })));

        const row: ActionRowBuilder<StringSelectMenuBuilder> = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

        await interaction.respond({ embeds: [embed], components: [row] });
    }

    private async handleShowProposalDetails(interaction: TrackedInteraction): Promise<void> {
        const interactionWithValues: AnyInteractionWithValues | undefined = InteractionProperties.toInteractionWithValuesOrUndefined(interaction.interaction);
        if (!interactionWithValues) {
            await interaction.respond({ content: 'Invalid interaction type.', ephemeral: true });
            return;
        }

        const proposalId: number = parseInt(interactionWithValues.values[0]);
        const fundingRoundId: number = parseInt(CustomIDOracle.getNamedArgument(interaction.customId, 'fundingRoundId') || '');

        const proposal: Proposal | null = await ProposalLogic.getProposalById(proposalId);
        const fundingRound: FundingRound | null = await FundingRoundLogic.getFundingRoundById(fundingRoundId);

        if (!proposal || !fundingRound) {
            await interaction.respond({ content: 'Proposal or Funding Round not found.', ephemeral: true });
            return;
        }

        const embed: EmbedBuilder = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Proposal: ${proposal.name}`)
            .addFields(
                { name: 'Proposal Details', value: `Budget: ${proposal.budget}\nStatus: ${proposal.status}\nURI: ${proposal.uri}` },
                { name: 'Funding Round', value: `Name: ${fundingRound.name}\nBudget: ${fundingRound.budget}\nStatus: ${fundingRound.status}` }
            );

        const cancelButton: ButtonBuilder = new ButtonBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction(this, ManageSubmittedProposalsAction.OPERATIONS.CONFIRM_CANCEL_PROPOSAL, 'proposalId', proposalId.toString(), 'fundingRoundId', fundingRoundId.toString()))
            .setLabel('Cancel My Proposal')
            .setStyle(ButtonStyle.Danger);

        if (proposal.status === ProposalStatus.CANCELLED) {
            cancelButton.setDisabled(true);
        }

        const row: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>().addComponents(cancelButton);

        await interaction.respond({ embeds: [embed], components: [row], ephemeral: true });
    }

    private async handleConfirmCancelProposal(interaction: TrackedInteraction): Promise<void> {
        const proposalId: string | undefined = CustomIDOracle.getNamedArgument(interaction.customId, 'proposalId');
        const fundingRoundId: string | undefined = CustomIDOracle.getNamedArgument(interaction.customId, 'fundingRoundId');

        if (!proposalId || !fundingRoundId) {
            await interaction.respond({ content: 'Invalid proposal or funding round ID.', ephemeral: true });
            return;
        }

        const proposal: Proposal | null = await ProposalLogic.getProposalById(parseInt(proposalId));
        const fundingRound: FundingRound | null = await FundingRoundLogic.getFundingRoundById(parseInt(fundingRoundId));

        if (!proposal || !fundingRound) {
            await interaction.respond({ content: 'Proposal or Funding Round not found.', ephemeral: true });
            return;
        }

        const embed: EmbedBuilder = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('Confirm Proposal Cancellation')
            .setDescription('Are you sure you want to cancel this proposal? This action cannot be undone.')
            .addFields(
                { name: 'Proposal Details', value: `Name: ${proposal.name}\nBudget: ${proposal.budget}\nStatus: ${proposal.status}\nURI: ${proposal.uri}` },
                { name: 'Funding Round', value: `Name: ${fundingRound.name}\nBudget: ${fundingRound.budget}\nStatus: ${fundingRound.status}` }
            )
            .setFooter({ text: 'Once cancelled, this proposal cannot be re-submitted to the funding round. You will need to create a new proposal if you want to submit again.' });

        const confirmButton: ButtonBuilder = new ButtonBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction(this, ManageSubmittedProposalsAction.OPERATIONS.EXECUTE_CANCEL_PROPOSAL, 'proposalId', proposalId, 'fundingRoundId', fundingRoundId))
            .setLabel('Confirm Cancellation')
            .setStyle(ButtonStyle.Danger);

        const cancelButton: ButtonBuilder = new ButtonBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction(this, ManageSubmittedProposalsAction.OPERATIONS.SHOW_PROPOSAL_DETAILS, 'proposalId', proposalId, 'fundingRoundId', fundingRoundId))
            .setLabel('Go Back')
            .setStyle(ButtonStyle.Secondary);

        const row: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);

        await interaction.update({ embeds: [embed], components: [row] });
    }

    private async handleExecuteCancelProposal(interaction: TrackedInteraction): Promise<void> {
        const proposalId: string | undefined = CustomIDOracle.getNamedArgument(interaction.customId, 'proposalId');
        const fundingRoundId: string | undefined = CustomIDOracle.getNamedArgument(interaction.customId, 'fundingRoundId');

        if (!proposalId || !fundingRoundId) {
            await interaction.respond({ content: 'Invalid proposal or funding round ID.', ephemeral: true });
            return;
        }

        try {
            await ProposalLogic.cancelProposal(parseInt(proposalId));

            const successEmbed: EmbedBuilder = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Proposal Cancelled Successfully')
                .setDescription('Your proposal has been cancelled and cannot be re-submitted to this funding round.');

            const backButton: ButtonBuilder = new ButtonBuilder()
                .setCustomId(CustomIDOracle.addArgumentsToAction(this, ManageSubmittedProposalsAction.OPERATIONS.SHOW_PROPOSALS, 'fundingRoundId', fundingRoundId))
                .setLabel('Back to My Proposals')
                .setStyle(ButtonStyle.Primary);

            const row: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>().addComponents(backButton);

            await interaction.update({ embeds: [successEmbed], components: [row] });
        } catch (error) {
            await interaction.respond({ content: 'Error cancelling proposal: ' + (error instanceof Error ? error.message : 'Unknown error'), ephemeral: true });
        }
    }

    public allSubActions(): Action[] {
        return [];
    }

    getComponent(): ButtonBuilder {
        return new ButtonBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction(this, ManageSubmittedProposalsAction.OPERATIONS.SHOW_FUNDING_ROUNDS))
            .setLabel('Manage My Proposals')
            .setStyle(ButtonStyle.Primary);
    }
}


export class ManageDraftsAction extends PaginationComponent {
    public static readonly ID = 'manageDrafts';

    public static readonly OPERATIONS = {
        SHOW_DRAFTS: 'showDrafts',
        SELECT_DRAFT: 'selectDraft',
        EDIT_DRAFT: 'editDraft',
        SUBMIT_EDIT: 'submitEdit',
        DELETE_DRAFT: 'deleteDraft',
        CONFIRM_DELETE: 'confirmDelete',
        SUBMIT_TO_FUNDING_ROUND: 'submitToFundingRound',
    };

    public static readonly INPUT_IDS = {
        NAME: 'name',
        DESCRIPTION: 'description',
        BUDGET: 'budget',
        URI: 'uri',
    };

    protected async getTotalPages(interaction: TrackedInteraction): Promise<number> {
        const drafts = await ProposalLogic.getUserDraftProposals(interaction.interaction.user.id);
        return Math.ceil(drafts.length / 25);
    }

    protected async getItemsForPage(interaction: TrackedInteraction, page: number): Promise<Proposal[]> {
        const drafts = await ProposalLogic.getUserDraftProposals(interaction.interaction.user.id);
        return drafts.slice(page * 25, (page + 1) * 25);
    }

    protected async handleOperation(interaction: TrackedInteraction, operationId: string): Promise<void> {
        switch (operationId) {
            case ManageDraftsAction.OPERATIONS.SHOW_DRAFTS:
                await this.handleShowDrafts(interaction);
                break;
            case ManageDraftsAction.OPERATIONS.SELECT_DRAFT:
                await this.handleSelectDraft(interaction);
                break;
            case ManageDraftsAction.OPERATIONS.EDIT_DRAFT:
                await this.handleEditDraft(interaction);
                break;
            case ManageDraftsAction.OPERATIONS.SUBMIT_EDIT:
                await this.handleSubmitEdit(interaction);
                break;
            case ManageDraftsAction.OPERATIONS.DELETE_DRAFT:
                await this.handleDeleteDraft(interaction);
                break;
            case ManageDraftsAction.OPERATIONS.CONFIRM_DELETE:
                await this.handleConfirmDelete(interaction);
                break;
            case ManageDraftsAction.OPERATIONS.SUBMIT_TO_FUNDING_ROUND:
                await this.handleSubmitToFundingRound(interaction);
                break;
            default:
                await this.handleInvalidOperation(interaction, operationId);
        }
    }

    private async handleShowDrafts(interaction: TrackedInteraction): Promise<void> {
        const currentPage = this.getCurrentPage(interaction);
        const totalPages = await this.getTotalPages(interaction);
        const drafts: Proposal[] = await this.getItemsForPage(interaction, currentPage);

        if (drafts.length === 0) {
            await interaction.respond({ content: 'ℹ️ You have no draft proposals.', ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Select a Draft Proposal')
            .setDescription('To proceed, please select a draft proposal from the list below.');

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction(this, ManageDraftsAction.OPERATIONS.SELECT_DRAFT))
            .setPlaceholder('Select a Draft Proposal')
            .addOptions(drafts.map(draft => ({
                label: draft.name,
                value: draft.id.toString(),
                description: `Budget: ${draft.budget}`
            })));

        const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(selectMenu);
        const components = [row];

        if (totalPages > 1) {
            const paginationRow = this.getPaginationRow(interaction, currentPage, totalPages);
            components.push(paginationRow);
        }

        const asUpdate = CustomIDOracle.getNamedArgument(interaction.customId, 'udt') === '1';

        if (asUpdate) {
            await interaction.update({ embeds: [embed], components });
        } else {
            await interaction.respond({ embeds: [embed], components });
        }


    }

    private async handleSelectDraft(interaction: TrackedInteraction, asUpdate: boolean = false, successMessage?: string): Promise<void> {
        let proposalId: number;

        const interactionWithValues: AnyInteractionWithValues | undefined = InteractionProperties.toInteractionWithValuesOrUndefined(interaction.interaction);
        if (interactionWithValues) {
            proposalId = parseInt(interactionWithValues.values[0]);
        } else {
            const proposalIdFromCustomId: string | undefined = CustomIDOracle.getNamedArgument(interaction.customId, 'proposalId');
            if (!proposalIdFromCustomId) {
                await interaction.respond({ content: '🐞 Interaction neither passes proposalId in values, nor in customId.', ephemeral: true });
                return;
            } else {
                proposalId = parseInt(proposalIdFromCustomId);
            }
        }

        const proposal: Proposal | null = await ProposalLogic.getProposalById(proposalId);

        if (!proposal) {
            await interaction.respond({ content: 'Proposal not found.', ephemeral: true });
            return;
        }

        let successEmbed: EmbedBuilder | undefined;
        if (successMessage) {
            successEmbed = new EmbedBuilder()
                .setColor('#28a745')
                .setDescription(successMessage);
        }

        const embed: EmbedBuilder = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Draft Proposal: ${proposal.name}`)
            .setDescription(`Proposal URI: ${proposal.uri}`)
            .addFields(
                { name: 'ID (auto-assigned)', value: proposal.id.toString(), inline: true },
                { name: 'Budget', value: proposal.budget.toString(), inline: true },
                { name: 'URL', value: proposal.uri, inline: true },
                { name: 'Status', value: proposal.status, inline: true }
            );


        const editButton = new ButtonBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction(this, ManageDraftsAction.OPERATIONS.EDIT_DRAFT, 'proposalId', proposalId.toString()))
            .setLabel('Edit Proposal')
            .setStyle(ButtonStyle.Primary);

        const deleteButton = new ButtonBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction(this, ManageDraftsAction.OPERATIONS.DELETE_DRAFT, 'proposalId', proposalId.toString()))
            .setLabel('Delete Proposal')
            .setStyle(ButtonStyle.Danger);

        const submitButton = new ButtonBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction(this, ManageDraftsAction.OPERATIONS.SUBMIT_TO_FUNDING_ROUND, 'proposalId', proposalId.toString()))
            .setLabel('Submit to Funding Round')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(editButton, deleteButton, submitButton);

        let embeds: EmbedBuilder[];
        if (successEmbed) {
            embeds = [successEmbed, embed];
        } else {
            embeds = [embed];
        }

        const asUpdateFromCustomId = CustomIDOracle.getNamedArgument(interaction.customId, 'udt');

        let doUpdate: boolean = asUpdate;

        if (asUpdateFromCustomId) {
            if (asUpdateFromCustomId === '1') {
                doUpdate = true;
            }
        }

        if (doUpdate) {
            await interaction.update({ embeds, components: [row] });
        } else {
            await interaction.respond({ embeds, components: [row] });
        }
    }

    private async handleEditDraft(interaction: TrackedInteraction): Promise<void> {
        const proposalId: string | undefined = CustomIDOracle.getNamedArgument(interaction.customId, 'proposalId');
        if (!proposalId) {
            await interaction.respond({ content: 'Invalid proposal ID.', ephemeral: true });
            return;
        }

        const proposal: Proposal | null = await ProposalLogic.getProposalById(parseInt(proposalId));
        if (!proposal) {
            await interaction.respond({ content: 'Proposal not found.', ephemeral: true });
            return;
        }

        const modalInteraction: AnyInteractionWithShowModal | undefined = InteractionProperties.toShowModalOrUndefined(interaction.interaction);
        if (!modalInteraction) {
            await interaction.respond({ content: 'This interaction does not support modals.', ephemeral: true });
            return;
        }

        const modal: ModalBuilder = new ModalBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction(this, ManageDraftsAction.OPERATIONS.SUBMIT_EDIT, 'proposalId', proposalId))
            .setTitle('Edit Proposal');

        const nameInput = new TextInputBuilder()
            .setCustomId(ManageDraftsAction.INPUT_IDS.NAME)
            .setLabel('Proposal Name')
            .setStyle(TextInputStyle.Short)
            .setValue(proposal.name)
            .setRequired(true);

        const budgetInput = new TextInputBuilder()
            .setCustomId(ManageDraftsAction.INPUT_IDS.BUDGET)
            .setLabel('Budget')
            .setStyle(TextInputStyle.Short)
            .setValue(proposal.budget.toString())
            .setRequired(true);

        const uriInput = new TextInputBuilder()
            .setCustomId(ManageDraftsAction.INPUT_IDS.URI)
            .setLabel('URI (https://forums.minaprotocol.com)')
            .setStyle(TextInputStyle.Short)
            .setValue(proposal.uri)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(budgetInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(uriInput)
        );

        await modalInteraction.showModal(modal);
    }

    private async handleSubmitEdit(interaction: TrackedInteraction): Promise<void> {
        const modalInteraction = InteractionProperties.toModalSubmitInteractionOrUndefined(interaction.interaction);
        if (!modalInteraction) {
            await interaction.respond({ content: 'Invalid interaction type.', ephemeral: true });
            return;
        }

        const proposalId = CustomIDOracle.getNamedArgument(interaction.customId, 'proposalId');
        if (!proposalId) {
            await interaction.respond({ content: 'Invalid proposal ID.', ephemeral: true });
            return;
        }

        const name = modalInteraction.fields.getTextInputValue(ManageDraftsAction.INPUT_IDS.NAME);
        const budget = parseFloat(modalInteraction.fields.getTextInputValue(ManageDraftsAction.INPUT_IDS.BUDGET));
        const uri = modalInteraction.fields.getTextInputValue(ManageDraftsAction.INPUT_IDS.URI);

        if (isNaN(budget)) {
            await interaction.respond({ content: 'Invalid budget value.', ephemeral: true });
            return;
        }

        if (!uri.startsWith('https://forums.minaprotocol.com')) {
            await interaction.respond({ content: 'Invalid URI. Please use a link from https://forums.minaprotocol.com', ephemeral: true });
            return;
        }

        try {
            await ProposalLogic.updateProposal(parseInt(proposalId), { name, budget, uri });
            const successMessage = `✅ '${name}' details updated successfully`;
            await this.handleSelectDraft(interaction, true, successMessage);
        } catch (error) {
            await interaction.respond({ content: 'Error updating proposal: ' + (error instanceof Error ? error.message : 'Unknown error'), ephemeral: true });
        }
    }

    private async handleDeleteDraft(interaction: TrackedInteraction): Promise<void> {
        const proposalId = CustomIDOracle.getNamedArgument(interaction.customId, 'proposalId');
        if (!proposalId) {
            await interaction.respond({ content: 'Invalid proposal ID.', ephemeral: true });
            return;
        }

        const proposal = await ProposalLogic.getProposalById(parseInt(proposalId));
        if (!proposal) {
            await interaction.respond({ content: 'Proposal not found.', ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle(`Confirm Delete: ${proposal.name}`)
            .setDescription('Are you sure you want to delete this proposal? This action cannot be undone.')
            .addFields(
                { name: 'Name', value: proposal.name },
                { name: 'ID', value: proposal.id.toString() },
                { name: 'Budget', value: proposal.budget.toString() },
                { name: 'URL', value: proposal.uri }
            );

        const confirmButton = new ButtonBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction(this, ManageDraftsAction.OPERATIONS.CONFIRM_DELETE, 'proposalId', proposalId))
            .setLabel('Confirm Delete')
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction(this, ManageDraftsAction.OPERATIONS.SELECT_DRAFT, 'proposalId', proposalId, 'udt', '1'))
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);

        await interaction.update({ embeds: [embed], components: [row] });
    }

    private async handleConfirmDelete(interaction: TrackedInteraction): Promise<void> {
        const proposalId = CustomIDOracle.getNamedArgument(interaction.customId, 'proposalId');
        if (!proposalId) {
            await interaction.respond({ content: 'Invalid proposal ID.', ephemeral: true });
            return;
        }

        try {
            await ProposalLogic.deleteProposal(parseInt(proposalId));
            await interaction.respond({ content: 'Proposal deleted successfully.', ephemeral: true });
            await this.handleShowDrafts(interaction);
        } catch (error) {
            await interaction.respond({ content: 'Error deleting proposal: ' + (error instanceof Error ? error.message : 'Unknown error'), ephemeral: true });
        }
    }

    private async handleSubmitToFundingRound(interaction: TrackedInteraction): Promise<void> {
        const proposalId = CustomIDOracle.getNamedArgument(interaction.customId, 'proposalId');
        if (!proposalId) {
            await interaction.respond({ content: 'Invalid proposal ID.', ephemeral: true });
            return;
        }

        const eligibleFundingRounds: FundingRound[] = await FundingRoundLogic.getEligibleFundingRoundsForProposal(parseInt(proposalId), interaction.interaction.user.id);

        if (eligibleFundingRounds.length === 0) {
            await interaction.respond({ content: 'ℹ️ There are no eligible funding rounds for this proposal at the moment.', ephemeral: true });
            return;
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction((this.screen as ProposalHomeScreen).submitProposalToFundingRoundAction, SubmitProposalToFundingRoundAction.OPERATIONS.CONFIRM_SUBMISSION, 'proposalId', proposalId.toString()))
            .setPlaceholder('Select a Funding Round')
            .addOptions(eligibleFundingRounds.map(fr => ({
                label: fr.name,
                value: fr.id.toString(),
                description: `Budget: ${fr.budget}, Ends: ${fr.endAt.toLocaleDateString()}`
            })));

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

        await interaction.respond({ content: 'Please select a funding round to submit your proposal to:', components: [row] });
    }

    public allSubActions(): Action[] {
        return [];
    }

    getComponent(): ButtonBuilder {
        return new ButtonBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction(this, ManageDraftsAction.OPERATIONS.SHOW_DRAFTS))
            .setLabel('Manage Drafts')
            .setStyle(ButtonStyle.Primary);
    }
}

export class CreateNewProposalAction extends Action {
    public static readonly ID = 'createNewProposal';

    public static readonly OPERATIONS = {
        SHOW_CREATE_FORM: 'showCreateForm',
        SUBMIT_CREATE_FORM: 'submitCreateForm',
    };

    public static readonly INPUT_IDS = {
        NAME: 'name',
        BUDGET: 'budget',
        URI: 'uri',
    };

    protected async handleOperation(interaction: TrackedInteraction, operationId: string): Promise<void> {
        switch (operationId) {
            case CreateNewProposalAction.OPERATIONS.SHOW_CREATE_FORM:
                await this.handleShowCreateForm(interaction);
                break;
            case CreateNewProposalAction.OPERATIONS.SUBMIT_CREATE_FORM:
                await this.handleSubmitCreateForm(interaction);
                break;
            default:
                await this.handleInvalidOperation(interaction, operationId);
        }
    }

    private async handleShowCreateForm(interaction: TrackedInteraction): Promise<void> {
        const modalInteraction: AnyInteractionWithShowModal | undefined = InteractionProperties.toShowModalOrUndefined(interaction.interaction);
        if (!modalInteraction) {
            await interaction.respond({ content: 'This interaction does not support modals.', ephemeral: true });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction(this, CreateNewProposalAction.OPERATIONS.SUBMIT_CREATE_FORM))
            .setTitle('Create New Proposal');

        const nameInput = new TextInputBuilder()
            .setCustomId(CreateNewProposalAction.INPUT_IDS.NAME)
            .setLabel('Proposal Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const budgetInput = new TextInputBuilder()
            .setCustomId(CreateNewProposalAction.INPUT_IDS.BUDGET)
            .setLabel('Budget')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const uriInput = new TextInputBuilder()
            .setCustomId(CreateNewProposalAction.INPUT_IDS.URI)
            .setLabel('URL (https://forums.minaprotocol.com/....)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(budgetInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(uriInput)
        );

        await modalInteraction.showModal(modal);
    }

    private async handleSubmitCreateForm(interaction: TrackedInteraction): Promise<void> {
        const modalInteraction = InteractionProperties.toModalSubmitInteractionOrUndefined(interaction.interaction);
        if (!modalInteraction) {
            await interaction.respond({ content: 'Invalid interaction type.', ephemeral: true });
            return;
        }

        const name = modalInteraction.fields.getTextInputValue(CreateNewProposalAction.INPUT_IDS.NAME);
        const budget = parseFloat(modalInteraction.fields.getTextInputValue(CreateNewProposalAction.INPUT_IDS.BUDGET));
        let uri = modalInteraction.fields.getTextInputValue(CreateNewProposalAction.INPUT_IDS.URI);

        if (uri.startsWith('http://')) {
            uri = uri.replace('http://', 'https://');
        } else if (uri.startsWith('forums.minaprotocol.com/')) {
            uri = 'https://' + uri;
        }

        if (isNaN(budget)) {
            await interaction.respond({ content: 'Invalid budget value.', ephemeral: true });
            return;
        }

        if (!uri.startsWith('https://forums.minaprotocol.com')) {
            await interaction.respond({ content: 'ℹ️ Invalid URL. Please use a link from https://forums.minaprotocol.com', ephemeral: true });
            return;
        }

        try {
            const newProposal = await ProposalLogic.createProposal({
                name,
                budget,
                uri,
                proposerDuid: interaction.interaction.user.id,
                status: ProposalStatus.DRAFT,
                fundingRoundId: null,
            });

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Proposal Created Successfully')
                .setDescription('Your new proposal draft has been created.')
                .addFields(
                    { name: 'ID (auto-assigned)', value: newProposal.id.toString() },
                    { name: 'Name', value: newProposal.name },
                    { name: 'Budget', value: newProposal.budget.toString() },
                    { name: 'URL', value: newProposal.uri }
                );

            const manageButton = new ButtonBuilder()
                .setCustomId(CustomIDOracle.addArgumentsToAction((this.screen as ProposalHomeScreen).manageDraftsAction, ManageDraftsAction.OPERATIONS.SHOW_DRAFTS, "udt", "1"))
                .setLabel('Manage Drafts')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(manageButton);

            await interaction.respond({ embeds: [embed], components: [row] });
        } catch (error) {
            await interaction.respond({ content: 'Error creating proposal: ' + (error instanceof Error ? error.message : 'Unknown error'), ephemeral: true });
        }
    }

    public allSubActions(): Action[] {
        return [];
    }

    getComponent(): ButtonBuilder {
        return new ButtonBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction(this, CreateNewProposalAction.OPERATIONS.SHOW_CREATE_FORM))
            .setLabel('Create New Proposal')
            .setStyle(ButtonStyle.Success);
    }
}

export class SubmitProposalToFundingRoundAction extends Action {
    public static readonly ID = 'submitProposalToFundingRound';

    public static readonly OPERATIONS = {
        SHOW_DRAFT_PROPOSALS: 'showDraftProposals',
        SELECT_FUNDING_ROUND: 'selectFundingRound',
        CONFIRM_SUBMISSION: 'confirmSubmission',
        EXECUTE_SUBMISSION: 'executeSubmission',
    };

    protected async handleOperation(interaction: TrackedInteraction, operationId: string): Promise<void> {
        switch (operationId) {
            case SubmitProposalToFundingRoundAction.OPERATIONS.SHOW_DRAFT_PROPOSALS:
                await this.handleShowDraftProposals(interaction);
                break;
            case SubmitProposalToFundingRoundAction.OPERATIONS.SELECT_FUNDING_ROUND:
                await this.handleSelectFundingRound(interaction);
                break;
            case SubmitProposalToFundingRoundAction.OPERATIONS.CONFIRM_SUBMISSION:
                await this.handleConfirmSubmission(interaction);
                break;
            case SubmitProposalToFundingRoundAction.OPERATIONS.EXECUTE_SUBMISSION:
                await this.handleExecuteSubmission(interaction);
                break;
            default:
                await this.handleInvalidOperation(interaction, operationId);
        }
    }

    private async handleShowDraftProposals(interaction: TrackedInteraction): Promise<void> {
        const draftProposals = await ProposalLogic.getUserDraftProposals(interaction.interaction.user.id);

        if (draftProposals.length === 0) {
            await interaction.respond({ content: 'ℹ️ You have no draft proposals to submit.', ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Select Draft Proposal')
            .setDescription('Please select a draft proposal to submit to a funding round.');

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction(this, SubmitProposalToFundingRoundAction.OPERATIONS.SELECT_FUNDING_ROUND))
            .setPlaceholder('Select a Draft Proposal')
            .addOptions(draftProposals.map(proposal => ({
                label: proposal.name,
                value: proposal.id.toString(),
                description: `Budget: ${proposal.budget}`
            })));

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

        const asUpdate = CustomIDOracle.getNamedArgument(interaction.customId, 'udt');

        const isUpdate: boolean = asUpdate === '1';

        if (isUpdate) {
            await interaction.update({ embeds: [embed], components: [row] });
        } else {

            await interaction.respond({ embeds: [embed], components: [row] });
        }
    }

    private async handleSelectFundingRound(interaction: TrackedInteraction): Promise<void> {
        const interactionWithValues = InteractionProperties.toInteractionWithValuesOrUndefined(interaction.interaction);
        if (!interactionWithValues) {
            await interaction.respond({ content: 'Invalid interaction type.', ephemeral: true });
            return;
        }

        const proposalId = parseInt(interactionWithValues.values[0]);
        const eligibleFundingRounds: FundingRound[] = await FundingRoundLogic.getEligibleFundingRoundsForProposal(proposalId, interaction.interaction.user.id);

        if (eligibleFundingRounds.length === 0) {
            await interaction.respond({ content: 'There are no eligible funding rounds for this proposal at the moment.', ephemeral: true });
            return;
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction(this, SubmitProposalToFundingRoundAction.OPERATIONS.CONFIRM_SUBMISSION, 'proposalId', proposalId.toString()))
            .setPlaceholder('Select a Funding Round')
            .addOptions(eligibleFundingRounds.map(fr => ({
                label: fr.name,
                value: fr.id.toString(),
                description: `Budget: ${fr.budget}, Ends: ${fr.endAt.toLocaleDateString()}`
            })));

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

        await interaction.respond({ content: 'Please select a funding round to submit your proposal to:', components: [row] });
    }

    private async handleConfirmSubmission(interaction: TrackedInteraction): Promise<void> {
        const interactionWithValues = InteractionProperties.toInteractionWithValuesOrUndefined(interaction.interaction);
        if (!interactionWithValues) {
            await interaction.respond({ content: 'Invalid interaction type.', ephemeral: true });
            return;
        }

        const fundingRoundId = parseInt(interactionWithValues.values[0]);
        const proposalId = parseInt(CustomIDOracle.getNamedArgument(interaction.customId, 'proposalId') || '');

        const proposal = await ProposalLogic.getProposalById(proposalId);
        const fundingRound = await FundingRoundLogic.getFundingRoundById(fundingRoundId);

        if (!proposal || !fundingRound) {
            await interaction.respond({ content: 'Proposal or Funding Round not found.', ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('Confirm Proposal Submission')
            .setDescription('Please review the details below and confirm your submission.')
            .addFields(
                { name: 'Proposal ID (auto-assigned)', value: proposal.id.toString() },
                { name: 'Proposal Name', value: proposal.name },
                { name: 'Proposal Budget', value: proposal.budget.toString() },
                { name: 'Proposal URI', value: proposal.uri },
                { name: 'Funding Round', value: fundingRound.name },
                { name: 'Funding Round Budget', value: fundingRound.budget.toString() },
                { name: 'Funding Round End Date', value: fundingRound.endAt.toLocaleDateString() }
            )
            .setFooter({ text: 'Note: Once submitted, you cannot remove or reassign this proposal to another funding round. You can cancel your proposal later.' });

        const confirmButton = new ButtonBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction(this, SubmitProposalToFundingRoundAction.OPERATIONS.EXECUTE_SUBMISSION, 'proposalId', proposalId.toString(), 'fundingRoundId', fundingRoundId.toString()))
            .setLabel('Confirm Submission')
            .setStyle(ButtonStyle.Success);

        const cancelButton = new ButtonBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction(this, SubmitProposalToFundingRoundAction.OPERATIONS.SHOW_DRAFT_PROPOSALS, "udt", "1"))
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);

        await interaction.update({ embeds: [embed], components: [row] });
    }

    private async handleExecuteSubmission(interaction: TrackedInteraction): Promise<void> {
        const proposalId = parseInt(CustomIDOracle.getNamedArgument(interaction.customId, 'proposalId') || '');
        const fundingRoundId = parseInt(CustomIDOracle.getNamedArgument(interaction.customId, 'fundingRoundId') || '');

        try {
            await ProposalLogic.submitProposalToFundingRound(proposalId, fundingRoundId);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Proposal Submitted Successfully')
                .setDescription('Your proposal has been submitted to the funding round.')
                .setFooter({ text: 'You can view and manage your submitted proposals in the "Manage Submitted Proposals" section.' });

            const manageButton = new ButtonBuilder()
                .setCustomId(CustomIDOracle.addArgumentsToAction((this.screen as ProposalHomeScreen).manageSubmittedProposalsAction, 'showFundingRounds'))
                .setLabel('Manage Submitted Proposals')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(manageButton);

            await interaction.update({ embeds: [embed], components: [row] });
        } catch (error) {
            await interaction.respond({ content: 'Error submitting proposal: ' + (error instanceof Error ? error.message : 'Unknown error'), ephemeral: true });
        }
    }

    public allSubActions(): Action[] {
        return [];
    }

    getComponent(): ButtonBuilder {
        return new ButtonBuilder()
            .setCustomId(CustomIDOracle.addArgumentsToAction(this, SubmitProposalToFundingRoundAction.OPERATIONS.SHOW_DRAFT_PROPOSALS))
            .setLabel('Submit Proposal To Funding Round')
            .setStyle(ButtonStyle.Primary);
    }
}