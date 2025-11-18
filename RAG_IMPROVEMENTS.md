# RAG System and Response Quality Improvements

## Issues Fixed

### 1. `/ask` Command Behavior
**Problem:** When using `/ask how to set up the bot on a webserver`, the bot would:
- First show a generic "I'm All Ears!" message
- Wait for the user to reply in the thread
- Only then provide the answer

**Solution:** Modified `/ask` command handler to:
- Check if arguments (question) are provided
- If question provided: immediately answer in the thread
- If no question: show the help message

**Code Changes:**
```typescript
// Before: Always showed help message
bot.onSlashCommand('ask', async (handler, { channelId, userId, eventId }) => {
  const promptMessage = beaverSpeech.slash.ask
  await handler.sendMessage(channelId, promptMessage, { threadId })
})

// After: Answer immediately when question provided
bot.onSlashCommand('ask', async (handler, { channelId, userId, eventId, args }) => {
  if (args.length === 0) {
    await handler.sendMessage(channelId, beaverSpeech.slash.ask, { threadId })
    return
  }
  
  const question = args.join(' ')
  await ensureThreadStarter(threadId, eventId, userId, question)
  await respondWithKnowledge(threadId, channelId, handler)
})
```

### 2. Response Formatting Issues
**Problem:** Responses were showing raw JSON structure:
```
{ "answer": "...", "references": ["chunk1", "chunk2"] }
```

**Solutions:**
1. **Improved System Prompt** (`src/prompt/agent.ts`):
   - Added explicit instructions to return raw JSON (no markdown code blocks)
   - Emphasized starting with direct answers
   - Added formatting guidelines for better readability
   - Increased clarity on response structure

2. **Enhanced Validation** (`src/prompt/agent.ts`):
   - Better JSON extraction from various formats
   - Improved error handling and fallbacks
   - Graceful handling of malformed responses
   - Better logging for debugging

3. **Response Post-Processing** (`src/index.ts`):
   - Clean up spacing around headings and code blocks
   - Ensure proper markdown formatting
   - Better reference formatting with separator line
   - Remove duplicate references

### 3. OpenAI API Configuration
**Changes:**
- Reduced temperature from 0.3 to 0.2 for more focused responses
- Increased max_tokens from 1500 to 2000 for detailed answers
- Added `response_format: { type: 'json_object' }` to enforce JSON output

**Result:** More consistent, properly formatted JSON responses every time.

### 4. Response Quality Improvements

#### Before:
```
{ "answer": "To set up your web service to run a Towns bot, you'll need to follow these steps:\n\n1. Prepare Your Credentials: You need to gather your APP_PRIVATE_DATA (base64 encoded bot authentication credentials) and JWT_SECRET (your webhook security token).\n\n2. Create Event Handlers: Implement functions that respond to Towns events. These are essential for your bot to interact with users and handle commands.\n\n3. Set Up Your Deployment Environment: You'll need a server to host your webhook endpoint. This is where your bot will listen for events.\n\n4. Implement the Bot: Here's a simple example using Hono framework:\n typescript\n import { Hono } from 'hono';\n import { makeTownsBot } from '@towns-protocol/bot';\n\n const app = new Hono();\n const bot = await makeTownsBot(privateData, jwtSecret, { commands });\n\n // Towns webhook endpoint (required for bot to work)\n const { jwtMiddleware, handler } = bot.start();\n app.post('/webhook', jwtMiddleware, handler);\n\n This sets up your webhook endpoint to receive events from Towns.\n\n5. Test Your Setup: Make sure your bot is responding to commands and events as expected. You can use slash commands to trigger actions and verify everything is working.\n\nRemember: Your bot is stateless, meaning it won't retain history between events, so plan your event handling accordingly (Chunk 2). \n\nBoom! You just set up your web service to run the bot! 🎉", "references": ["chunk1", "chunk2", "chunk4"] }
```

#### After:
```
To set up your web service to run a Towns bot, follow these steps:

**1. Prepare Your Credentials**

You need two things:
- `APP_PRIVATE_DATA` - Base64 encoded bot authentication credentials
- `JWT_SECRET` - Webhook security token

**2. Create Your Bot Server**

Here's a complete example using Hono framework:

```typescript
import { Hono } from 'hono'
import { makeTownsBot } from '@towns-protocol/bot'

const app = new Hono()
const bot = await makeTownsBot(privateData, jwtSecret, { commands })

// Towns webhook endpoint (required for bot to work)
const { jwtMiddleware, handler } = bot.start()
app.post('/webhook', jwtMiddleware, handler)

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

serve({ fetch: app.fetch, port: 3000 })
```

**3. Set Up Event Handlers**

Implement functions to respond to Towns events:
- `bot.onMessage()` - Handle messages
- `bot.onSlashCommand()` - Handle slash commands
- `bot.onReaction()` - Handle reactions

**4. Deploy to Your Web Server**

Common options:
- **Render/Railway** - Free tier available, automatic deployments
- **VPS** - Full control, requires more setup
- **Docker** - Portable, consistent environments

**Important:** Your bot is stateless - it doesn't retain history between events. Plan your event handling accordingly!

---
📚 *Sources: agents:deployment, agents:bot-architecture, agents:getting-started*
```

## Key Improvements Summary

1. ✅ **Direct Answers**: `/ask` command now answers immediately when given a question
2. ✅ **Clean Formatting**: Responses are properly formatted markdown (no raw JSON visible)
3. ✅ **Better Structure**: Answers start with the core information, then provide details
4. ✅ **Improved Readability**: Proper spacing, headings, code blocks, and bullet points
5. ✅ **Consistent Responses**: Enforced JSON format from OpenAI ensures reliability
6. ✅ **Better Error Handling**: Graceful fallbacks when responses are malformed

## Testing

To test the improvements:

```bash
# In Towns chat
/ask how to set up the bot on a webserver

# Should immediately reply with:
# - Direct answer starting with "To set up your web service..."
# - Properly formatted markdown with headings, code blocks, and bullet points
# - Clean references at the bottom
# - NO raw JSON visible
```

## Files Modified

1. **`src/index.ts`**
   - Modified `/ask` command handler to process arguments immediately
   - Improved OpenAI API configuration
   - Enhanced response post-processing and formatting

2. **`src/prompt/agent.ts`**
   - Updated system prompt with clearer instructions
   - Improved response validation and JSON parsing
   - Better error handling and fallback behavior

## Benefits

- **Better User Experience**: Users get immediate, direct answers
- **Professional Appearance**: Clean, well-formatted responses
- **More Reliable**: Consistent JSON responses from OpenAI
- **Easier to Read**: Proper markdown formatting with clear structure
- **Better Context**: Source references shown in a clean, unobtrusive way

