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

console.log('🔮 Building RAG index with embeddings (cached when possible)...')
const startTime = Date.now()
const index = await createKnowledgeIndex(openai, knowledgeSources)
const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
console.log(`✅ RAG index ready in ${elapsed}s`)

// Initialize bot
console.log('🤖 Initializing bot...')
const bot = await makeTownsBot(process.env.APP_PRIVATE_DATA!, process.env.JWT_SECRET!, { commands })

console.log('🦫🤖 BeaverDev bot created successfully!')
console.log('🎯 Bot ID:', bot.botId)
console.log('🏦 App Address:', bot.appAddress)

// Pre-fetch ETH price on startup
console.log('💵 Fetching initial ETH price...')
await getEthPrice()

/**
 * Pending Questions Storage
 * Tracks questions awaiting tips before answers are provided
 */
interface PendingQuestion {
  userId: string
  question: string
  threadId: string
  channelId: string
  timestamp: number
}

const pendingQuestions = new Map<string, PendingQuestion>() // userId -> pending question

/**
 * ETH Price Management using CoinGecko API
 */
interface EthPriceCache {
  price: number
  timestamp: number
}

let ethPriceCache: EthPriceCache | null = null
const PRICE_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

/**
 * Fetch current ETH price from CoinGecko API (free tier)
 * Caches result for 5 minutes to avoid rate limiting
 */
async function getEthPrice(): Promise<number> {
  const now = Date.now()

  // Return cached price if still valid
  if (ethPriceCache && now - ethPriceCache.timestamp < PRICE_CACHE_DURATION) {
    console.log(`💵 Using cached ETH price: $${ethPriceCache.price}`)
    return ethPriceCache.price
  }

  try {
    console.log('💵 Fetching current ETH price from CoinGecko...')
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
    )

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data = (await response.json()) as { ethereum?: { usd?: number } }
    const price = data.ethereum?.usd

    if (!price || typeof price !== 'number') {
      throw new Error('Invalid price data from CoinGecko')
    }

    // Cache the price
    ethPriceCache = { price, timestamp: now }
    console.log(`💵 ETH price updated: $${price}`)

    return price
  } catch (error) {
    console.error('❌ Failed to fetch ETH price from CoinGecko:', error)

    // Fallback to cached price if available
    if (ethPriceCache) {
      console.log(`⚠️ Using stale cached price: $${ethPriceCache.price}`)
      return ethPriceCache.price
    }

    // Ultimate fallback: reasonable default
    console.log('⚠️ Using fallback ETH price: $3000')
    return 3000
  }
}

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
      temperature: 0.2, // Lower temperature for more focused, consistent responses
      max_tokens: 2000, // More tokens for detailed answers
      response_format: { type: 'json_object' }, // Enforce JSON response format
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: context.initialPrompt },
      ],
    })

    // Validate response
    const payload = validateResponse(completion.choices[0].message.content ?? '')

    // Clean up the answer - ensure it's well-formatted
    let cleanAnswer = payload.answer.trim()
    
    // Ensure proper spacing after headings and before code blocks
    cleanAnswer = cleanAnswer.replace(/\*\*([^*]+)\*\*\n(?!\n)/g, '**$1**\n\n')
    cleanAnswer = cleanAnswer.replace(/\n```/g, '\n\n```')
    cleanAnswer = cleanAnswer.replace(/```\n([^`])/g, '```\n\n$1')

    // Format message with references (only show unique, limit to 3)
    const uniqueRefs = [...new Set(payload.references)].slice(0, 3)
    const referencesText = uniqueRefs.length > 0 
      ? `\n\n---\n📚 *Sources: ${uniqueRefs.join(', ')}*`
      : ''

    const message = `${cleanAnswer}${referencesText}`

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

  // Handle mentions - Start new conversation with tip request
  if (event.isMentioned) {
    console.log(`🦫 Mentioned by ${event.userId} in channel ${event.channelId}`)

    // Store the question as pending (awaiting tip)
    pendingQuestions.set(event.userId, {
      userId: event.userId,
      question: event.message,
      threadId,
      channelId: event.channelId,
      timestamp: Date.now(),
    })

    // Send tip request message
    const tipMessage = `🦫 **Hey there!** I'd love to help you with that question!

To unlock my expert knowledge about @towns-protocol/bot, please **tip $0.50 (or more!)** on this message. ☕

Once I receive your tip, I'll dig through my comprehensive knowledge base and provide you with a detailed, actionable answer. No tip, no answer—sorry, gotta keep the lights on! 💡

**Your Question:**
> ${event.message}

Tip this message to unlock the answer! 🎯`

    await handler.sendMessage(event.channelId, tipMessage, { threadId })
    return
  }

  // Handle thread replies - Continue existing conversation with tip request
  if (event.threadId) {
    console.log(`🦫 Thread reply from ${event.userId} in thread ${event.threadId}`)

    // Store the follow-up question as pending (awaiting tip)
    pendingQuestions.set(event.userId, {
      userId: event.userId,
      question: event.message,
      threadId,
      channelId: event.channelId,
      timestamp: Date.now(),
    })

    // Send tip request for follow-up question
    const tipMessage = `🦫 **Another question? I like your style!**

To unlock the answer to this follow-up question, please **tip $0.50 (or more!)** on this message. ☕

**Your Question:**
> ${event.message}

Tip this message to get your answer! 🎯`

    await handler.sendMessage(event.channelId, tipMessage, { threadId })
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

bot.onSlashCommand('ask', async (handler, { channelId, userId, eventId, args }) => {
  console.log('🦫 /ask command executed')
  const threadId = eventId

  // If no question provided, show help message
  if (args.length === 0) {
    await handler.sendMessage(channelId, beaverSpeech.slash.ask, { threadId })
    return
  }

  // Join args to create the question
  const question = args.join(' ')
  
  // Record the question as thread starter
  await ensureThreadStarter(threadId, eventId, userId, question)

  // Store the question as pending (awaiting tip)
  pendingQuestions.set(userId, {
    userId,
    question,
    threadId,
    channelId,
    timestamp: Date.now(),
  })

  // Send tip request message
  const tipMessage = `🦫 **Great question!** I've got the answer you need.

To unlock my expert knowledge about @towns-protocol/bot, please **tip $0.50 (or more!)** on this message. ☕

Once I receive your tip, I'll provide you with a comprehensive, well-formatted answer from my knowledge base.

**Your Question:**
> ${question}

Tip this message to unlock the answer! 🎯`

  await handler.sendMessage(channelId, tipMessage, { threadId })
})

/**
 * Tip Handler - Process tips and unlock answers
 */
bot.onTip(async (handler, event) => {
  console.log(`💰 Tip received from ${event.userId}`)
  console.log(`   Amount: ${event.amount} wei`)
  console.log(`   Receiver: ${event.receiverAddress}`)
  console.log(`   Bot ID: ${bot.botId}`)
  console.log(`   App Address: ${bot.appAddress}`)

  // Check if tip is for the bot (could be bot.botId or bot.appAddress)
  const isForBot = 
    event.receiverAddress.toLowerCase() === bot.botId.toLowerCase() ||
    event.receiverAddress.toLowerCase() === bot.appAddress.toLowerCase()

  if (!isForBot) {
    console.log('   ℹ️ Tip not for bot, ignoring')
    return
  }

  // Check if user has a pending question
  const pending = pendingQuestions.get(event.userId)
  if (!pending) {
    // No pending question - just thank them
    await handler.sendMessage(
      event.channelId,
      `🦫 **Thanks for the tip!** ☕\n\nI don't have a pending question from you though. Use \`/ask <question>\` or mention me with a question to get started!`
    )
    return
  }

  // Get current ETH price from CoinGecko
  const ethPrice = await getEthPrice()

  // Convert amount to ETH for display (amount is in wei)
  const ethAmount = Number(event.amount) / 1e18
  const usdAmount = ethAmount * ethPrice

  console.log(`   💵 Tip amount: ${ethAmount} ETH (~$${usdAmount.toFixed(2)})`)
  console.log(`   💵 Current ETH price: $${ethPrice}`)

  // Check if tip meets minimum with 5% margin
  // The 5% margin prevents mismatches due to price fluctuations
  const minTipUSD = 0.50
  const marginPercent = 0.05 // 5% margin
  const minTipWithMargin = minTipUSD * (1 - marginPercent) // Accept 5% less
  const minTipETH = minTipWithMargin / ethPrice

  console.log(`   💵 Minimum required: ${minTipETH.toFixed(6)} ETH (with 5% margin)`)

  if (ethAmount < minTipETH) {
    const requiredETH = (minTipUSD / ethPrice).toFixed(6)
    await handler.sendMessage(
      pending.channelId,
      `🦫 **Thanks for trying to tip!** But that's a bit too small...

You tipped ${ethAmount.toFixed(6)} ETH (~$${usdAmount.toFixed(2)}). I need at least $${minTipUSD} to unlock the answer.

Please tip at least ${requiredETH} ETH (~$${minTipUSD}) on my previous message to get your answer! ☕

*Current ETH price: $${ethPrice.toFixed(2)}*`,
      { threadId: pending.threadId }
    )
    return
  }

  // Tip is valid! Send confirmation and provide the answer
  await handler.sendMessage(
    pending.channelId,
    `🦫 **Tip received!** Thank you for the ${ethAmount.toFixed(6)} ETH tip! ☕

Let me dig through my knowledge base and get you that answer... 🔍`,
    { threadId: pending.threadId }
  )

  // Ensure the question is recorded in the thread
  await ensureThreadStarter(pending.threadId, pending.threadId, pending.userId, pending.question)

  // Generate and send the answer
  await respondWithKnowledge(pending.threadId, pending.channelId, handler)

  // Clean up pending question
  pendingQuestions.delete(event.userId)
  console.log(`   ✅ Question answered and cleaned up for user ${event.userId}`)
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
app.get('/health', async (c) => {
  const { getCacheInfo } = await import('./rag/cache')
  const cacheInfo = getCacheInfo()
  
  return c.json({
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
    cache: cacheInfo,
    timestamp: new Date().toISOString(),
  })
})

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
