# 🦫 BeaverDev - Tip-to-Unlock AI Agent for Towns

> **Build monetized AI agents that users pay to unlock!** A complete RAG-powered bot with tip-based micropayments, real-time ETH pricing, and fair retry system.

**Live Demo:** Ask BeaverDev anything about @towns-protocol/bot - just tip $0.50 to unlock the answer! 💰

---

## 🚀 Why This Is Awesome

**Monetize Your Knowledge Instantly**
- Users pay **$0.50 per question** to unlock AI-powered answers
- Real-time ETH pricing via CoinGecko API
- Automatic tip validation with 5% margin
- **Fair retry system** - Users never lose money on errors

**Production-Ready AI Bot**
- 📚 **RAG System** with OpenAI embeddings for semantic search
- 🧠 **GPT-4o-mini** powered responses
- 💾 **Thread context** - Remembers conversations
- 🔄 **Auto-retry** - If answer fails, user can retry without new tip
- ⚡ **Fast** - Embedding cache for quick deployments

**Perfect For:**
- 💡 Monetizing expertise (coding help, tutorials, consulting)
- 🎓 Educational bots (paid Q&A, courses)
- 🤖 Premium support bots
- 📖 Paywalled knowledge bases

---

## 💰 How Tip-to-Unlock Works

### User Experience

```
User: /ask how to build a Towns bot

Bot: 🦫 Great question! I've got the answer you need.
     To unlock my expert knowledge, please tip $0.50 on this message. ☕

[User tips $0.50]

Bot: 🦫 Tip received! Thank you for the 0.000160 ETH tip! ☕
     Let me dig through my knowledge base and get you that answer... 🔍

Bot: [Comprehensive answer with code examples, best practices, etc.]
```

### Features

✅ **Real-Time ETH Pricing**
- Fetches current ETH/USD from CoinGecko (free API)
- 1-hour caching to avoid rate limits
- Smart fallback if API unavailable

✅ **5% Acceptance Margin**
- Prevents rejections from price volatility
- User tips $0.475+ = accepted
- Better UX, fewer errors

✅ **Fair Retry System**
- If bot fails to answer → User can retry **without new tip**
- 2 OpenAI attempts with validation
- Clear error messages explaining what to do
- **Users never lose money on bot errors**

✅ **Multiple Ways to Ask**
- `/ask <question>` - Slash command
- `@BotName <question>` - Mention
- Reply in thread - Follow-up questions

---

## 🎯 Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime
- Towns Protocol bot credentials ([create here](https://app.alpha.towns.com/developer))
- OpenAI API key ([get here](https://platform.openai.com/api-keys))

### Installation

```bash
# Clone the repository
git clone https://github.com/Crisvond-hnt/AIAgent_Towns_Bot.git
cd AIAgent_Towns_Bot

# Install dependencies
bun install

# Create .env file
cp .env.sample .env
```

### Environment Variables

Edit `.env` with your credentials:

```bash
# Bot Credentials (Required)
APP_PRIVATE_DATA=your_base64_encoded_bot_credentials
JWT_SECRET=your_jwt_secret_token

# OpenAI (Required)
OPENAI_API_KEY=sk-...

# Optional
PORT=5124
DB_PATH=./beaverdev.db
NODE_ENV=development
```

### Run Locally

```bash
# Development with hot reload
bun dev

# Production build
bun run build
bun start
```

### Deploy to Render

1. **Connect GitHub** to Render.com
2. **Add Environment Variables** in dashboard
3. **Build Command:**
   ```bash
   curl -fsSL https://bun.sh/install | bash && export PATH=$HOME/.bun/bin:$PATH && bun install && bun run build
   ```
4. **Start Command:**
   ```bash
   $HOME/.bun/bin/bun run dist/index.js
   ```
5. **Configure Webhook** in Towns dashboard:
   ```
   https://your-app.onrender.com/webhook
   ```

---

## 🏗️ Architecture

### Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Bot Framework** | @towns-protocol/bot | Towns Protocol integration |
| **AI Model** | OpenAI GPT-4o-mini | Answer generation |
| **Embeddings** | text-embedding-3-small | Semantic search |
| **Price Feed** | CoinGecko API (free) | Real-time ETH/USD |
| **Database** | SQLite (bun:sqlite) | Thread context storage |
| **Web Server** | Hono | Webhook handling |
| **Runtime** | Bun | Fast JavaScript runtime |

### System Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User asks question                                          │
├─────────────────────────────────────────────────────────────┤
│ Bot stores question as "pending" → Requests $0.50 tip       │
├─────────────────────────────────────────────────────────────┤
│ User tips → CoinGecko validates amount (with 5% margin)     │
├─────────────────────────────────────────────────────────────┤
│ Bot retrieves relevant chunks via RAG (semantic search)     │
├─────────────────────────────────────────────────────────────┤
│ OpenAI generates answer (2 attempts with validation)        │
├─────────────────────────────────────────────────────────────┤
│ Success → Send answer + clean up                            │
│ Failure → Keep pending, user can retry without new tip      │
└─────────────────────────────────────────────────────────────┘
```

### RAG (Retrieval-Augmented Generation)

1. **Load Knowledge**
   - `AGENTS.md` - 2400+ line comprehensive @towns-protocol/bot guide
   - `DOCS_GETTING_STARTED.md` - Official getting started docs

2. **Chunk Documents**
   - Split by headers (~180 chunks)
   - ~1500 chars per chunk
   - Extract keywords (function names, SDK terms)

3. **Generate Embeddings**
   - OpenAI text-embedding-3-small
   - Cached for fast deploys
   - Stored in memory

4. **Retrieve & Answer**
   - Embed user question
   - Find top 5 relevant chunks (cosine similarity)
   - Generate answer with GPT-4o-mini
   - Include source citations

---

## 💡 Customization Guide

### Change Tip Amount

Edit `src/index.ts`:

```typescript
// In the onTip handler
const minTipUSD = 0.50  // Change to your desired amount (e.g., 1.00, 0.25)
```

### Add Your Own Knowledge

1. **Create markdown file** with your content (e.g., `MY_EXPERTISE.md`)
2. **Update `src/config/knowledge.ts`:**
   ```typescript
   const KNOWN_SOURCES: KnowledgeSource[] = [
     { id: 'agents_md', label: 'Towns Bot SDK', fileName: 'AGENTS.md' },
     { id: 'my_knowledge', label: 'My Expertise', fileName: 'MY_EXPERTISE.md' },
   ]
   ```
3. **Rebuild embeddings** (happens automatically on next deploy)

### Customize Persona

Edit `src/prompt/agent.ts`:

```typescript
export const beaverPersona: PersonaConfig = {
  displayName: 'YourBotName',
  emoji: '🤖',
  tone: 'Professional expert in [your domain]',
  rules: [
    'Provide accurate information about [your topic]',
    'Use clear examples',
    // Add your rules...
  ],
  acknowledgements: {
    mention: ['Custom greeting 1', 'Custom greeting 2'],
    thread: ['Follow-up message 1', 'Follow-up message 2'],
  },
}
```

### Adjust Pricing Settings

```typescript
// ETH Price Cache Duration
const PRICE_CACHE_DURATION = 60 * 60 * 1000  // 1 hour (adjust as needed)

// Tip Acceptance Margin
const marginPercent = 0.05  // 5% (adjust 0.03-0.10 recommended)
```

---

## 📋 Commands

### User Commands

| Command | Description |
|---------|-------------|
| `/help` | Show bot capabilities and usage |
| `/info` | About the bot and pricing |
| `/docs` | Links to documentation |
| `/ask <question>` | Ask a question (starts tip flow) |
| `@BotName <question>` | Mention to ask (starts tip flow) |

### Free Commands

`/help`, `/info`, `/docs` are **always free** - no tip required!

### Admin Commands

```bash
# Register slash commands after deployment
bunx towns-bot update-commands src/commands.ts YOUR_BEARER_TOKEN
```

---

## 🔧 Configuration

### Tip System

**Minimum Tip:** $0.50 (configurable)
**Accepted Margin:** 5% below minimum ($0.475+)
**Price Feed:** CoinGecko API (free tier)
**Cache Duration:** 1 hour

### OpenAI Settings

**Model:** gpt-4o-mini (cost-effective)
**Temperature:** 0.2 (focused responses)
**Max Tokens:** 2000 (detailed answers)
**Retries:** 2 attempts with validation

### Database

**Type:** SQLite (via bun:sqlite)
**Purpose:** Thread context storage
**Location:** `./beaverdev.db` (configurable via `DB_PATH`)

---

## 📊 Monitoring

### Health Check Endpoint

```bash
curl https://your-bot.onrender.com/health
```

**Response:**
```json
{
  "status": "ok",
  "bot": {
    "id": "0x...",
    "appAddress": "0x...",
    "commands": 4
  },
  "knowledge": {
    "sources": [
      { "id": "agents_md", "label": "Towns Bot SDK", "bytes": 123456 },
      { "id": "docs_getting_started", "label": "Getting Started", "bytes": 45678 }
    ]
  },
  "cache": {
    "embeddings": 180,
    "cacheHits": 150,
    "cacheMisses": 30
  },
  "timestamp": "2025-11-18T..."
}
```

### Key Metrics to Watch

- **CoinGecko API calls** - Should be ~1 per hour
- **OpenAI success rate** - Should be >95%
- **Tip validation failures** - Should be <5%
- **Answer retry rate** - How often users need to retry

---

## 🎨 Use Cases

### 1. Expert Consulting Bot
```
Topic: Web3 Development
Price: $2.00 per question
Knowledge: Your expertise in markdown files
Revenue: Direct micropayments for your time
```

### 2. Course Material Bot
```
Topic: Online Course Q&A
Price: $0.50 per question
Knowledge: Course transcripts, slides, exercises
Revenue: Supplement course sales with paid support
```

### 3. API Documentation Bot
```
Topic: Your Product API
Price: $1.00 per question
Knowledge: API docs, guides, examples
Revenue: Monetize premium support
```

### 4. Community Support Bot
```
Topic: Open Source Project Help
Price: $0.25 per question
Knowledge: README, docs, issues, discussions
Revenue: Sustainable funding for maintainers
```

---

## 🛠️ Troubleshooting

### Bot Not Responding

**Check:**
- ✅ Webhook URL configured correctly
- ✅ JWT_SECRET matches Towns dashboard
- ✅ Bot has permissions in space
- ✅ Forwarding setting is `ALL_MESSAGES` or `MENTIONS_REPLIES_REACTIONS`

### Tip Validation Failing

**Check:**
- ✅ CoinGecko API accessible (check `/health`)
- ✅ ETH price cache is valid
- ✅ Tip amount meets minimum (check logs for calculated amounts)
- ✅ User tipped bot's address (bot.botId or bot.appAddress)

### Answer Generation Failing

**Check:**
- ✅ OpenAI API key valid
- ✅ RAG index built successfully (check startup logs)
- ✅ Knowledge files loaded (check `/health`)
- ✅ User sees retry instructions (fair system working)

### CoinGecko Rate Limit (429)

**Solution:**
- Cache duration already set to 1 hour
- Bot auto-extends cache on 429
- Uses fallback $3000 if needed
- No action required - system handles it

---

## 📚 Documentation

### For Users
- `TIP_TO_UNLOCK_SYSTEM.md` - Complete tip system guide
- `TIP_REFUND_SYSTEM.md` - How retry protection works

### For Developers
- `AGENTS.md` - Complete @towns-protocol/bot reference (2400+ lines)
- `DOCS_GETTING_STARTED.md` - Getting started guide
- `COINGECKO_INTEGRATION.md` - Price feed implementation
- `RAG_IMPROVEMENTS.md` - Response quality enhancements
- `CRITICAL_FIXES.md` - Production issue resolutions

---

## 🚀 Deployment Checklist

- [ ] Create bot at https://app.alpha.towns.com/developer
- [ ] Get OpenAI API key
- [ ] Set up Render.com account
- [ ] Configure environment variables
- [ ] Deploy to Render
- [ ] Configure webhook URL
- [ ] Register slash commands
- [ ] Test `/ask` command
- [ ] Verify tip flow works
- [ ] Check `/health` endpoint
- [ ] Monitor logs for errors
- [ ] **Fund bot.appAddress** (if bot will send tips/payments back)

---

## 💎 Revenue Tracking

### Track Your Earnings

Add to `src/index.ts`:

```typescript
// Track total revenue
let totalRevenue = 0n
let tipCount = 0

bot.onTip(async (handler, event) => {
  if (isForBot) {
    totalRevenue += event.amount
    tipCount++
    
    const ethTotal = Number(totalRevenue) / 1e18
    const usdTotal = ethTotal * ethPrice
    
    console.log(`💰 Revenue Stats:`)
    console.log(`   Tips: ${tipCount}`)
    console.log(`   Total: ${ethTotal.toFixed(4)} ETH (~$${usdTotal.toFixed(2)})`)
  }
  // ... rest of handler
})
```

### Withdraw Earnings

Your bot's earnings go to `bot.appAddress`. To withdraw:

```typescript
import { execute } from 'viem/experimental/erc7821'

// Send ETH from bot to your wallet
await execute(bot.viem, {
  address: bot.appAddress,
  account: bot.viem.account,
  calls: [{
    to: yourWalletAddress,
    value: amountInWei,
  }]
})
```

---

## 🤝 Contributing

Want to improve the bot? PRs welcome!

**Ideas:**
- Additional knowledge sources
- Better answer formatting
- Analytics dashboard
- Multiple currency support
- Subscription model option
- Admin commands for stats

---

## 📄 License

MIT License - Build amazing monetized AI agents! 🦫

---

## 🙏 Credits

**Built with:**
- @towns-protocol/bot - Towns Protocol bot framework
- OpenAI GPT-4o-mini - AI responses
- CoinGecko API - Real-time crypto prices
- Bun + Hono + SQLite - Lightning-fast stack

**Created with sass, coffee, and a passion for monetizing knowledge** ☕💻

---

## ⭐ Star This Repo!

If you build a cool monetized AI agent with this, **star the repo** and share what you built! 🚀

**Questions?** Open an issue or ask BeaverDev itself! (just tip $0.50 😉)
