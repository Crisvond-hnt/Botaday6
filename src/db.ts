/**
 * SQLite Database Layer for Thread Context Management
 */

import { Database } from 'bun:sqlite'
import type { ThreadContext, ThreadMessage } from './types/thread'

const DB_PATH = process.env.DB_PATH || './beaverdev.db'

let db: Database

/**
 * Initialize SQLite database and create tables
 */
export async function initDatabase(): Promise<void> {
  db = new Database(DB_PATH)

  // Create messages table
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      event_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      message TEXT NOT NULL,
      is_thread_starter INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `)

  // Create indexes for performance
  db.run('CREATE INDEX IF NOT EXISTS idx_thread_id ON messages(thread_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_created_at ON messages(created_at)')

  console.log('🦫🗄️ BeaverDev database initialized at', DB_PATH)
}

/**
 * Record a message (user or bot) in the database
 */
export async function recordMessage(params: {
  eventId: string
  threadId: string
  authorId: string
  content: string
  isStarter?: boolean
}): Promise<void> {
  const { eventId, threadId, authorId, content, isStarter = false } = params

  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO messages (event_id, thread_id, user_id, message, is_thread_starter)
      VALUES (?, ?, ?, ?, ?)
    `)

    stmt.run(eventId, threadId, authorId, content, isStarter ? 1 : 0)
  } catch (error) {
    console.error('❌ Failed to record message:', error)
  }
}

/**
 * Fetch all messages in a thread, ordered chronologically
 */
export async function fetchThreadContext(threadId: string): Promise<ThreadContext | null> {
  try {
    const stmt = db.prepare(`
      SELECT event_id, user_id, message, created_at, is_thread_starter
      FROM messages
      WHERE thread_id = ?
      ORDER BY created_at ASC
    `)

    const rows = stmt.all(threadId) as Array<{
      event_id: string
      user_id: string
      message: string
      created_at: number
      is_thread_starter: number
    }>

    if (rows.length === 0) {
      return null
    }

    const conversation: ThreadMessage[] = rows.map((row) => ({
      eventId: row.event_id,
      authorId: row.user_id,
      content: row.message,
      timestamp: row.created_at,
      isStarter: row.is_thread_starter === 1,
    }))

    const initialPrompt = conversation.find((msg) => msg.isStarter)?.content || conversation[0].content

    return {
      threadId,
      initialPrompt,
      conversation,
    }
  } catch (error) {
    console.error('❌ Failed to fetch thread context:', error)
    return null
  }
}

/**
 * Ensure the first message in a thread is marked as the starter
 */
export async function ensureThreadStarter(
  threadId: string,
  eventId: string,
  authorId: string,
  content: string
): Promise<void> {
  try {
    // Check if thread has a starter
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM messages
      WHERE thread_id = ? AND is_thread_starter = 1
    `)

    const result = stmt.get(threadId) as { count: number }

    if (result.count === 0) {
      // This is the first message, mark it as starter
      await recordMessage({
        eventId,
        threadId,
        authorId,
        content,
        isStarter: true,
      })
    } else {
      // Thread already has a starter, just record normally
      await recordMessage({
        eventId,
        threadId,
        authorId,
        content,
        isStarter: false,
      })
    }
  } catch (error) {
    console.error('❌ Failed to ensure thread starter:', error)
  }
}

/**
 * Get database instance (for advanced queries)
 */
export function getDatabase(): Database {
  return db
}

