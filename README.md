# govbot

A discord bot for collective decision making, with the goal of being both *effective*, and *aligned*.

Some principles it follows:

*aligned*

- Decisions aren't enacted without the approval and input of the community they impact.

*effective*

- Decisions pull in the expertise of the community and relevant subject-matter-experts.

It is primarily for the Mina protocol community, but is intended to eventually be possible to deploy for other communities too.

See documentation on the plan for this [here](https://docs.google.com/document/d/1aNGYqRoUVXtOw8aef9mSQHHSIvG2thnrxMw7FCB_AhM/edit).

## Instructions

1. Clone the repo
2. Run `npm install`
3. Create a `.env` file in the root directory with the following variables:

```
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_client_id (A.K.A. application id)
GUILD_ID=your_guild_id (A.K.A. server id)
PUBLIC_KEY=your_apps_public_key
```
4. Run `npm run dev` to start the bot in development mode


## Checking For Required Channels

In order to check if the required channels have been created on your server, you can run the following command:

```
npm run manage checkChannels
```

## Adding Admins

In order to add an admin to the bot, you can run the following command:

```
npm run manage addAdmin [discord_user_id]
```

## Contributions

To make a contribution, follow these steps:

1. Make an issue that includes a user story for what the user should be able to do.
2. Get that issue tested by: es92, Remigiusz-antczak or Cristina Echeverry.
3. Get that issue approved by the product owners: es92, Remigiusz-antczak or Cristina Echeverry.
4. Write a PR and get it approved by the code owners and Mina devops: Es92, illya (developer), johnmarcou & Smorci (Mina devops). Each PR must correspond to an approved issue. By default, PRs should be merged by the PR submitter, though in some cases if changes are needed, they can be merged by code owners.
