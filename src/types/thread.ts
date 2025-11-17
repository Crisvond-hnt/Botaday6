/**
 * Thread Context Types
 */

export interface ThreadMessage {
  eventId: string
  authorId: string
  content: string
  timestamp: number
  isStarter: boolean
}

export interface ThreadContext {
  threadId: string
  initialPrompt: string // First message in the thread
  conversation: ThreadMessage[]
}

/**
 * Summarize conversation for AI context
 * Limits to last 8 messages to avoid token bloat
 */
export function summarizeConversation(messages: ThreadMessage[], botId: string): string {
  const recent = messages.slice(-8)
  
  return recent
    .map((msg) => {
      const role = msg.authorId === botId ? 'Assistant' : 'User'
      return `${role}: ${msg.content}`
    })
    .join('\n\n')
}

