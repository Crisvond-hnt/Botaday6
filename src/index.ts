/**
 * BeaverDev - AI Assistant Bot for Towns Bot SDK
 * Playful, sassy expert for @towns-protocol/bot development
 */

import OpenAI from 'openai'
import { makeTownsBot } from '@towns-protocol/bot'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import commands from './commands'
import { initDatabase, recordMessage, fetchThreadContext, ensureThreadStarter } from './db'
import { createKnowledgeIndex } from './rag/index'
import { loadKnowledgeBase } from './config/knowledge'
import {
  beaverPersona,
  buildSystemPrompt,
  validateResponse,
  nextMentionAcknowledgement,
  nextThreadAcknowledgement,
  beaverSpeech,
} from './prompt/agent'
import { summarizeConversation } from './types/thread'

// Validate environment variables
if (!process.env.APP_PRIVATE_DATA || !process.env.JWT_SECRET || !process.env.OPENAI_API_KEY) {
  console.error('❌ Missing required environment variables!')
  console.error('Required: APP_PRIVATE_DATA, JWT_SECRET, OPENAI_API_KEY')
  process.exit(1)
}

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Validate critical knowledge sources exist
import { validateKnowledgeSources } from './config/validation'
validateKnowledgeSources()

// Initialize database
console.log('🗄️ Initializing database...')
await initDatabase()

// Load knowledge sources and build RAG index
console.log('📚 Loading knowledge base (AGENTS.md + guides)...')
const knowledgeSources = loadKnowledgeBase()

if (knowledgeSources.length === 0) {
  console.error('❌ CRITICAL: No knowledge sources loaded!')
  console.error('❌ Make sure AGENTS.md exists in the project root!')
  process.exit(1)
}

console.log('🔮 Building RAG index with embeddings...')
const index = await createKnowledgeIndex(openai, knowledgeSources)

// Initialize bot
console.log('🤖 Initializing bot...')
const bot = await makeTownsBot(process.env.APP_PRIVATE_DATA!, process.env.JWT_SECRET!, { commands })

console.log('🦫🤖 BeaverDev bot created successfully!')
console.log('🎯 Bot ID:', bot.botId)
console.log('🏦 App Address:', bot.appAddress)

/**
 * Main AI response function using RAG + OpenAI
 */
const respondWithKnowledge = async (threadId: string, channelId: string, handler: any) => {
  try {
    // Fetch thread context from database
    const context = await fetchThreadContext(threadId)
    if (!context) {
      await handler.sendMessage(
        channelId,
        '🦫 Hmm, I seem to have lost the thread context. Could you start fresh?',
        { threadId }
      )
      return
    }

    // Retrieve relevant chunks via RAG
    const chunks = await index.retrieveRelevantChunks(context.initialPrompt, 5)

    if (chunks.length === 0) {
      await handler.sendMessage(
        channelId,
        '🦫 Hmm, I couldn\'t find relevant info for that. Try rephrasing your question, or ask about specific Towns Protocol features!',
        { threadId }
      )
      return
    }

    // Build system prompt
    const prompt = buildSystemPrompt(beaverPersona, {
      conversationSummary: summarizeConversation(context.conversation, bot.botId),
      retrievedChunks: chunks,
      userMessage: context.initialPrompt,
    })

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: context.initialPrompt },
      ],
    })

    // Validate response
    const payload = validateResponse(completion.choices[0].message.content ?? '')

    // Format message with references
    const referencesText =
      payload.references.length > 0
        ? `\n\n📚 **Sources:** ${payload.references.slice(0, 3).join(', ')}`
        : ''

    const message = `${payload.answer}${referencesText}`

    // Send in thread
    const result = await handler.sendMessage(channelId, message, { threadId })
    await recordMessage({
      eventId: result.eventId,
      threadId,
      authorId: bot.botId,
      content: message,
    })
  } catch (error) {
    console.error('❌ Error generating response:', error)
    await handler.sendMessage(
      channelId,
      '🦫 Oops! My circuits got crossed. ☕ Try asking again in a moment?',
      { threadId }
    )
  }
}

/**
 * Event Handlers
 */

// Main message handler
bot.onMessage(async (handler, event) => {
  // Ignore bot's own messages
  if (event.userId === bot.botId) return

  // ALWAYS use thread context (create new thread if not in one)
  const threadId = event.threadId ?? event.eventId

  // Record message in database for context
  await ensureThreadStarter(threadId, event.eventId, event.userId, event.message)

  // Handle mentions - Start new conversation
  if (event.isMentioned) {
    console.log(`🦫 Mentioned by ${event.userId} in channel ${event.channelId}`)

    // Send quick acknowledgement in thread
    const ack = nextMentionAcknowledgement()
    await handler.sendMessage(event.channelId, ack, { threadId })

    // Generate AI response in same thread
    await respondWithKnowledge(threadId, event.channelId, handler)
    return
  }

  // Handle thread replies - Continue existing conversation
  if (event.threadId) {
    console.log(`🦫 Thread reply from ${event.userId} in thread ${event.threadId}`)

    // Send quick acknowledgement in thread
    const ack = nextThreadAcknowledgement()
    await handler.sendMessage(event.channelId, ack, { threadId })

    // Generate AI response with full thread context
    await respondWithKnowledge(threadId, event.channelId, handler)
  }
})

/**
 * Slash Command Handlers
 */

bot.onSlashCommand('help', async (handler, { channelId }) => {
  console.log('🦫 /help command executed')
  await handler.sendMessage(channelId, beaverSpeech.slash.help)
})

bot.onSlashCommand('info', async (handler, { channelId }) => {
  console.log('🦫 /info command executed')
  await handler.sendMessage(channelId, beaverSpeech.slash.info)
})

bot.onSlashCommand('docs', async (handler, { channelId }) => {
  console.log('🦫 /docs command executed')
  await handler.sendMessage(channelId, beaverSpeech.slash.docs)
})

bot.onSlashCommand('ask', async (handler, { channelId, userId, eventId }) => {
  console.log('🦫 /ask command executed')
  const threadId = eventId

  const promptMessage = beaverSpeech.slash.ask

  await handler.sendMessage(channelId, promptMessage, { threadId })
})

/**
 * Start Server
 */

const { jwtMiddleware, handler } = await bot.start()
const app = new Hono()

// Middleware
app.use(logger())

// Webhook endpoint (required for bot to work)
app.post('/webhook', jwtMiddleware, handler)

// Health check endpoint
app.get('/health', (c) =>
  c.json({
    status: 'ok',
    bot: {
      id: bot.botId,
      appAddress: bot.appAddress,
      commands: commands.length,
    },
    knowledge: {
      sources: knowledgeSources.map((s) => ({
        id: s.id,
        label: s.label,
        bytes: s.byteLength,
        checksum: s.checksum,
      })),
    },
    timestamp: new Date().toISOString(),
  })
)

// Root endpoint
app.get('/', (c) =>
  c.text(`🦫 BeaverDev - AI Assistant Bot for Towns Bot SDK

Status: Running
Bot ID: ${bot.botId}
Webhook: POST /webhook
Health: GET /health

Built with @towns-protocol/bot v0.0.411+
Powered by OpenAI GPT-4o-mini + RAG`)
)

const port = Number(process.env.PORT || 5124)

console.log('\n🦫⚡ BeaverDev - Ultimate Towns Bot SDK Assistant')
console.log('🏗️ Crisvond\'s sassy sidekick is online!')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🔗 Webhook URL: http://localhost:' + port + '/webhook')
console.log('💊 Health Check: http://localhost:' + port + '/health')
console.log('🚀 @towns-protocol/bot v0.0.411+ | RAG System | OpenAI Integration')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

serve({ fetch: app.fetch, port })

console.log(`🦫🚀 Server started on port ${port}`)
console.log('Ready to answer questions with sass and style! ☕💻\n')
