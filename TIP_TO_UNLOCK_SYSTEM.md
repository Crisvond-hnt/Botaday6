# Tip-to-Unlock Q&A System

## Overview

BeaverDev now implements a **tip-to-unlock** payment system where users must tip $0.50 (or more) to unlock answers to their questions. This monetizes the bot's knowledge base while providing a simple micropayment flow.

## How It Works

### User Flow

1. **User asks a question** via:
   - `/ask <question>` slash command
   - Mentioning the bot: `@BeaverDev <question>`
   - Replying in a thread

2. **Bot requests tip**:
   - Stores the question as "pending"
   - Sends a message explaining the tip requirement
   - Shows the user's question

3. **User tips the message**:
   - User tips $0.50 (or more) on the bot's message
   - Tip goes to the bot's address (either `bot.botId` or `bot.appAddress`)

4. **Bot detects tip**:
   - `onTip` handler fires
   - Bot verifies tip amount meets minimum ($0.50)
   - Bot checks for pending question from that user

5. **Bot provides answer**:
   - Sends confirmation message
   - Generates AI-powered answer using RAG system
   - Cleans up pending question

## Implementation Details

### Pending Questions Storage

```typescript
interface PendingQuestion {
  userId: string      // User who asked the question
  question: string    // The question text
  threadId: string    // Thread ID for replies
  channelId: string   // Channel ID for messages
  timestamp: number   // When the question was asked
}

const pendingQuestions = new Map<string, PendingQuestion>()
```

**Key Points:**
- One pending question per user at a time
- New questions overwrite old pending questions
- Questions are cleaned up after being answered

### Real-Time ETH Price via CoinGecko

The bot uses the **CoinGecko API (free tier)** to fetch real-time Ethereum prices:

```typescript
async function getEthPrice(): Promise<number> {
  // Check cache first (5 minute TTL)
  if (ethPriceCache && now - ethPriceCache.timestamp < PRICE_CACHE_DURATION) {
    return ethPriceCache.price
  }

  // Fetch from CoinGecko
  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
  )
  
  const data = await response.json()
  const price = data.ethereum?.usd
  
  // Cache for 5 minutes
  ethPriceCache = { price, timestamp: Date.now() }
  return price
}
```

**Features:**
- ✅ 5-minute price caching (avoids rate limiting)
- ✅ Automatic fallback to cached price on API errors
- ✅ Ultimate fallback to $3000 if no cache exists
- ✅ Pre-fetches price on bot startup

### Tip Amount Validation with 5% Margin

The bot applies a **5% margin** when validating tips to prevent mismatches:

```typescript
const minTipUSD = 0.50
const marginPercent = 0.05  // 5% margin
const minTipWithMargin = minTipUSD * (1 - marginPercent)  // Accept $0.475+
const minTipETH = minTipWithMargin / ethPrice

// Convert wei to ETH
const ethAmount = Number(event.amount) / 1e18

// Check minimum with margin
if (ethAmount < minTipETH) {
  // Reject and ask for more
}
```

**Why 5% margin?**
- Prevents rejection due to small ETH price fluctuations
- Accounts for timing differences between user's wallet and bot's price fetch
- Provides better UX (users don't need to tip exact amounts)
- Protects against conversion rounding errors

**Example:**
- Required: $0.50
- With 5% margin: $0.475 accepted
- At $3000 ETH: 0.000158 ETH accepted (instead of 0.000167 ETH)

### Tip Receiver Check

Tips can be received by either:
- `bot.botId` - The bot's wallet address (EOA)
- `bot.appAddress` - The bot's smart account address

```typescript
const isForBot = 
  event.receiverAddress.toLowerCase() === bot.botId.toLowerCase() ||
  event.receiverAddress.toLowerCase() === bot.appAddress.toLowerCase()
```

## User Experience

### Example: Asking a Question

```
User: /ask how to set up the bot on a webserver

Bot: 🦫 Great question! I've got the answer you need.

To unlock my expert knowledge about @towns-protocol/bot, please tip $0.50 (or more!) on this message. ☕

Once I receive your tip, I'll provide you with a comprehensive, well-formatted answer from my knowledge base.

Your Question:
> how to set up the bot on a webserver

Tip this message to unlock the answer! 🎯
```

### Example: After Tipping

```
Bot: 🦫 Tip received! Thank you for the 0.000200 ETH tip! ☕

Let me dig through my knowledge base and get you that answer... 🔍

[AI-generated answer follows with detailed instructions, code examples, etc.]
```

### Example: Tip Too Small

```
Bot: 🦫 Thanks for trying to tip! But that's a bit too small...

You tipped 0.000100 ETH (~$0.30). I need at least $0.50 to unlock the answer.

Please tip at least $0.50 on my previous message to get your answer! ☕
```

## Edge Cases Handled

### 1. Tip Without Pending Question
If a user tips but has no pending question:
```
Bot: 🦫 Thanks for the tip! ☕

I don't have a pending question from you though. Use `/ask <question>` or mention me with a question to get started!
```

### 2. Multiple Questions (Overwrites)
If a user asks multiple questions before tipping:
- Only the most recent question is stored
- Previous pending questions are overwritten
- This prevents confusion about which question gets answered

### 3. Tip to Wrong Address
If a tip is sent to someone else:
- Bot ignores the tip (doesn't process it)
- No message is sent

### 4. Follow-up Questions
Each follow-up question in a thread also requires a tip:
```
Bot: 🦫 Another question? I like your style!

To unlock the answer to this follow-up question, please tip $0.50 (or more!) on this message. ☕
```

## Free Commands

These commands are **always free** and don't require tips:
- `/help` - Show help information
- `/info` - Show bot information
- `/docs` - Show documentation links
- `/ask` (without arguments) - Show usage instructions

## Configuration

### Adjusting Tip Amount

To change the minimum tip amount, modify this value in the `onTip` handler in `src/index.ts`:

```typescript
const minTipUSD = 0.50  // Change this to desired amount
```

The ETH price is automatically fetched from CoinGecko, no manual updates needed!

### Adjusting Price Cache Duration

To change how long ETH prices are cached:

```typescript
const PRICE_CACHE_DURATION = 5 * 60 * 1000  // Change from 5 minutes
```

**Recommendations:**
- **1-5 minutes**: Good balance (current setting: 5 minutes)
- **< 1 minute**: May hit CoinGecko rate limits
- **> 10 minutes**: Price may become stale during volatile markets

### Adjusting Tip Margin

To change the acceptance margin:

```typescript
const marginPercent = 0.05  // Change from 5% (0.05)
```

**Recommendations:**
- **5%**: Good balance (current setting)
- **< 3%**: May reject valid tips during price volatility
- **> 10%**: May accept tips that are too low

### Disabling Tip System

To disable the tip system and provide free answers:

1. Remove the pending question storage
2. Restore direct calls to `respondWithKnowledge()` in handlers
3. Remove the `onTip` handler

See commit history for the previous implementation.

## Revenue Tracking

To track revenue from tips:

```typescript
// Add revenue tracking
let totalRevenue = 0n  // in wei

bot.onTip(async (handler, event) => {
  const isForBot = /* ... */
  if (isForBot) {
    totalRevenue += event.amount
    console.log(`Total revenue: ${Number(totalRevenue) / 1e18} ETH`)
  }
  // ... rest of handler
})
```

## Security Considerations

1. **Tip Amount Validation**: Always validate tip amounts to prevent abuse
2. **User Matching**: Tips are matched to users by `userId` to prevent hijacking
3. **Address Verification**: Check both `bot.botId` and `bot.appAddress` for tips
4. **No Refunds**: Tips are non-refundable (handled by Towns Protocol)

## Future Enhancements

Potential improvements:
- [ ] Dynamic ETH/USD pricing using oracles
- [ ] Tiered pricing (different amounts for different question types)
- [ ] Subscription model (unlimited questions for period)
- [ ] Revenue sharing with knowledge base contributors
- [ ] Tip history and analytics dashboard
- [ ] Automatic cleanup of old pending questions (after timeout)

## Testing

To test the tip system:

1. **Ask a question:**
   ```
   /ask how do I create a bot?
   ```

2. **Verify tip request:**
   - Bot should send tip request message
   - Question should be stored as pending

3. **Send tip:**
   - Tip $0.50 or more on bot's message
   - Use Towns app tipping feature

4. **Verify answer:**
   - Bot should confirm tip received
   - Bot should provide answer
   - Pending question should be cleaned up

5. **Test edge cases:**
   - Tip too small
   - Tip without question
   - Multiple questions
   - Follow-up questions

## Troubleshooting

### Bot not detecting tips
- Check bot's wallet addresses are correct
- Verify tip went to `bot.botId` or `bot.appAddress`
- Check console logs for tip events

### Tip rejected as too small
- Check current ETH price in console logs
- Verify 5% margin is being applied correctly
- Check tip amount calculation (wei to ETH)
- Consider if price volatility is causing issues

### CoinGecko API errors
**Symptoms:** Bot logs show "Failed to fetch ETH price from CoinGecko"

**Solutions:**
- Check internet connectivity
- Verify CoinGecko API is accessible: https://api.coingecko.com/api/v3/ping
- Bot will use cached price (if available) or fallback to $3000
- Check if rate limited (should not happen with 5-minute cache)

**Rate Limits (CoinGecko Free Tier):**
- 10-50 calls per minute (varies)
- Our 5-minute cache ensures ~12 calls per hour max
- Well within free tier limits

### Price cache issues
**Clear cache manually:**
```typescript
// In bot code or via console
ethPriceCache = null
await getEthPrice()  // Forces fresh fetch
```

### Answer not provided after tip
- Check pending question exists for user
- Verify `respondWithKnowledge` is working
- Check RAG system and OpenAI API

### Multiple users tipping at once
- System handles concurrent tips correctly
- Each user's pending question is tracked separately
- No race conditions (Map is synchronous)

## Summary

The tip-to-unlock system provides:
✅ Monetization of the bot's knowledge base
✅ Simple micropayment flow
✅ Clear user experience
✅ Robust edge case handling
✅ Easy configuration and adjustment
✅ Revenue tracking capabilities

Users pay for what they use, and the bot generates revenue while providing value!

