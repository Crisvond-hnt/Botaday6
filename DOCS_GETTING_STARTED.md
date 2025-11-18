# Getting Started (Towns Bots)

> Source: `https://docs.towns.com/build/bots/getting-started`

This document is a local mirror of the official **Towns Bot Getting Started guide**,
used as an additional knowledge source for BeaverDev alongside `AGENTS.md`.

---

## Overview

This guide walks you through creating, developing, and deploying your first Towns bot. You'll learn how to:

1. Create a bot in Towns
2. Set up your development environment
3. Deploy to Render.com
4. Configure your bot in Towns

## Prerequisites

- Node.js v20+
- Bun installed
- GitHub account with SSH key configured

## Create a Bot

1. Visit the Developer Portal: `https://app.towns.com/developer`
2. Create a new bot and save:
   - `APP_PRIVATE_DATA` – bot's private key + encryption device (base64)
   - `JWT_SECRET` – used to verify webhook requests

These values are required for deployment.

## Develop Your Bot

### Initialize Your Project

Create a new bot project using the Towns bot CLI:

```bash
bunx towns-bot init my-bot
```

Then:

```bash
cd my-bot
bun install
cp .env.sample .env
```

Commit to a new GitHub repository once ready.

## Deploy Your Bot (Render.com)

1. Sign up at `https://render.com`
2. Create a new **Web Service** pointing at your GitHub repo
3. Configure:
   - **Language**: Node
   - **Build Command**: `bun install`
   - **Start Command**: `bun run start`
4. Add environment variables:

   - `APP_PRIVATE_DATA`
   - `JWT_SECRET`
   - `PORT` (e.g. `5123`)

Render will clone, install, build and start your bot, giving you a URL like:

`https://my-bot.onrender.com`

> Note: Free tier can spin down after inactivity; first request will be slower.

## Configure in Towns

### Webhook URL

Back in the Developer Portal:

1. Open your bot
2. Set **Webhook URL** to:

   `https://my-bot.onrender.com/webhook`

   (include the `/webhook` path)

3. Save.

### Forwarding Settings

Choose which messages your bot receives:

- **All Messages**
  - Bot receives every event in channels it's in
  - Use for: AI agents, moderation, analytics, or when you need tip/membership events
- **Mentions, Commands, Replies & Reactions** (default)
  - Bot only receives:
    - Direct @mentions
    - Replies to bot's messages
    - Reactions
    - Slash commands
- **No Messages**
  - Bot receives no message events
  - Use for external-only bots (e.g. GitHub webhooks, scheduled tasks)

After configuring, **install the bot into a space** (Space Settings → Bots).

## Bot Wallet Architecture (from Getting Started)

The Getting Started docs describe a **dual-wallet architecture**:

### Bot Treasury Wallet (`bot.appAddress`)

- A SimpleAccount (ERC-4337) smart contract
- Holds the bot's funds:
  - Receives tips and payments
  - Stores ETH/tokens
  - Pays for on-chain operations on behalf of the bot

### Gas Wallet (`bot.viem.account`)

- The EOA that signs transactions and pays gas for operations
- Derived from `APP_PRIVATE_DATA`
- Must be funded with **Base ETH** to execute on-chain operations

> Important: The docs explicitly state that the **gas wallet must be funded** to pay gas
> for blockchain transactions, while the treasury wallet holds funds/tips.

## Testing Your Bot

Once deployed & configured:

- Mention your bot in a channel:

  `@mybot hello`

  The default starter bot should respond with a simple greeting.

## Next Steps

- Local development & hot-reload
- Event handler deep dives
- Slash command patterns
- External integrations (webhooks, timers, custom APIs)

---

This file is intentionally focused and high-signal so BeaverDev can combine it
with the more exhaustive `AGENTS.md` reference when answering questions about:

- Bot setup & credentials
- Webhook configuration
- Render.com deployment
- Forwarding settings
- Wallet architecture (treasury + gas wallet)


