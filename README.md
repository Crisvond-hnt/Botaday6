# 🦫 BeaverDev - AI Assistant Bot for Towns Bot SDK

> A playful, sassy AI assistant bot that helps developers build bots with @towns-protocol/bot using RAG, OpenAI, and comprehensive SDK knowledge.

## Features

- **🤖 AI-Powered Bot Assistance**: Answers questions specifically about @towns-protocol/bot (v0.0.411+)
- **📚 RAG System**: Semantic search over comprehensive bot SDK documentation
- **⚡ Embedding Cache**: Fast deploys - embeddings cached after first generation
- **🧵 Thread Management**: Maintains full conversation context across multiple messages
- **😏 Smart & Sassy**: Playful personality that makes learning bot development fun
- **🎯 Slash Commands**: Quick access to help, docs, and interactive Q&A
- **💾 SQLite Database**: Persistent thread context storage
- **🔮 OpenAI Integration**: GPT-4o-mini + text-embedding-3-small

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime installed
- Towns Protocol bot credentials (create at https://app.alpha.towns.com/developer)
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd beaverdev-towns-assistant

# Install dependencies
bun install

# Create .env file
cp .env.sample .env
# Edit .env with your credentials
```

### Environment Variables

Create a `.env` file with:

```bash
# Bot Configuration (Required)
APP_PRIVATE_DATA=your_base64_encoded_bot_credentials
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_api_key

# Optional
DB_PATH=./beaverdev.db
PORT=5124
NODE_ENV=development
```

### Development

```bash
# Start development server with hot reload
bun dev
```

### Production Build

```bash
# Build
bun run build

# Start production server
bun start
```

## Architecture

### Tech Stack

- **Bot Framework**: @towns-protocol/bot v0.0.411+
- **Database**: bun:sqlite (SQLite)
- **AI Model**: OpenAI GPT-4o-mini
- **Embeddings**: OpenAI text-embedding-3-small
- **Web Server**: Hono
- **Runtime**: Bun

### Project Structure

```
beaverdev-towns-assistant/
├── src/
│   ├── index.ts              # Main bot entry point
│   ├── db.ts                 # SQLite database layer
│   ├── rag.ts                # RAG chunking system
│   ├── commands.ts           # Slash command definitions
│   ├── config/
│   │   └── knowledge.ts      # Knowledge source loading
│   ├── prompt/
│   │   └── agent.ts          # Persona & prompt construction
│   ├── rag/
│   │   └── index.ts          # Embedding & indexing
│   └── types/
│       ├── thread.ts         # Thread context types
│       ├── knowledge.ts      # Knowledge types
│       └── persona.ts        # Persona types
├── AGENTS.md                 # ONLY knowledge source (2400+ line Towns Bot SDK guide)
├── package.json
├── tsconfig.json
└── README.md
```

## Usage

### Mentioning BeaverDev

Start a new conversation by mentioning the bot:

```
@BeaverDev how do I create a bot using @towns-protocol/bot?
```

BeaverDev will:
1. Create a thread for the conversation
2. Send a playful acknowledgement
3. Retrieve relevant documentation using RAG
4. Generate a comprehensive answer with sources

### Continuing Conversations

Reply in the thread to continue the conversation:

```
How do I handle slash commands?
```

BeaverDev remembers the full thread context and provides relevant follow-up answers.

### Slash Commands

- `/help` - Show BeaverDev capabilities and how to use
- `/info` - About BeaverDev and Towns Bot SDK overview
- `/docs` - Links to official bot SDK documentation
- `/ask` - Start an interactive bot development Q&A thread

### Registering Commands

After deploying your bot, register the slash commands:

```bash
bunx towns-bot update-commands src/commands.ts YOUR_BEARER_TOKEN
```

## Deployment

### Render.com (Recommended)

1. **Create New Web Service**
   - Connect your GitHub repository
   - Runtime: Node (Bun not officially supported yet, use custom build)

2. **Environment Variables**
   Add in Render dashboard:
   ```
   APP_PRIVATE_DATA=...
   JWT_SECRET=...
   OPENAI_API_KEY=...
   PORT=5124
   NODE_ENV=production
   ```

3. **Build & Start Commands**
   ```bash
   # Build command
   curl -fsSL https://bun.sh/install | bash && export PATH=$HOME/.bun/bin:$PATH && bun install && bun run build
   
   # Start command
   bun run dist/index.js
   ```

4. **Configure Webhook**
   Update your bot's webhook URL to:
   ```
   https://your-app-name.onrender.com/webhook
   ```

5. **Register Commands**
   ```bash
   bunx towns-bot update-commands src/commands.ts YOUR_BEARER_TOKEN
   ```

### Health Check

Visit `GET /health` to verify the bot is running:

```bash
curl https://your-app-name.onrender.com/health
```

Response:
```json
{
  "status": "ok",
  "bot": {
    "id": "0x...",
    "appAddress": "0x...",
    "commands": 4
  },
  "knowledge": {
    "sources": [...]
  },
  "timestamp": "2025-11-17T..."
}
```

## How It Works

### RAG (Retrieval-Augmented Generation)

1. **Document Chunking**
   - Loads AGENTS.md (2400+ line comprehensive Towns Bot SDK guide)
   - Splits document by ## headers (creates ~180 chunks)
   - Extracts keywords (function names, Towns-specific terms)
   - Creates ~1500 char chunks

2. **Embedding**
   - Generates embeddings for all chunks using OpenAI
   - Stores embeddings in memory

3. **Retrieval**
   - User asks a question
   - Embeds the question
   - Calculates cosine similarity with all chunks
   - Returns top 5 most relevant chunks

4. **Generation**
   - Builds system prompt with persona + retrieved chunks + conversation context
   - Calls OpenAI GPT-4o-mini
   - Returns answer with source citations

### Thread Context Management

1. **User sends message** → Record in SQLite
2. **Bot generates response** → Record in SQLite
3. **Next user message** → Fetch full thread history
4. **AI uses conversation history** → Generate contextual response

All responses stay in threads for organized, contextual conversations.

## Customization

### Adding Knowledge Sources

BeaverDev uses **only AGENTS.md** as its knowledge source. To add more sources:

1. Add new markdown file to project root
2. Update `src/config/knowledge.ts`:
   ```typescript
   const KNOWN_SOURCES: KnowledgeSource[] = [
     { id: 'agents_md', label: 'Towns Bot SDK Complete Guide (AGENTS.md)', fileName: 'AGENTS.md' },
     { id: 'new_source', label: 'New Source', fileName: 'NEW_SOURCE.md' }, // Add here
   ]
   ```
3. Update `src/types/knowledge.ts` to add the new source ID

### Customizing Persona

Edit `src/prompt/agent.ts`:

```typescript
export const beaverPersona: PersonaConfig = {
  displayName: 'YourBotName',
  emoji: '🤖',
  tone: 'Your custom tone',
  rules: [...],
  acknowledgements: {...}
}
```

### Adding Slash Commands

1. Add to `src/commands.ts`
2. Add handler in `src/index.ts`
3. Register: `bunx towns-bot update-commands src/commands.ts YOUR_BEARER_TOKEN`

## Troubleshooting

### Bot not responding to mentions
- Check webhook URL is configured correctly
- Verify JWT_SECRET matches bot dashboard
- Ensure bot has proper permissions in space
- Check forwarding setting is `ALL_MESSAGES` or `MENTIONS_REPLIES_REACTIONS`

### Bot not responding in threads
- Verify all responses include `{ threadId }` option
- Check database is recording thread messages
- Review logs for errors

### RAG returning irrelevant results
- Increase `limit` in `retrieveRelevantChunks(query, limit)`
- Check knowledge sources loaded correctly (`GET /health`)
- Improve keyword extraction in `src/rag.ts`

### OpenAI rate limits
- Implement request caching
- Reduce `max_tokens` in completion request
- Use cheaper model (already using gpt-4o-mini)

## License

MIT License - Build amazing things! 🦫

## Credits

Built with:
- @towns-protocol/bot v0.0.411+
- OpenAI GPT-4o-mini
- Bun + Hono + SQLite

**Created with sass and coffee for the Towns bot developer community** ☕💻
