/**
 * RAG (Retrieval-Augmented Generation) System
 * Document Chunking and Keyword Extraction
 */

import type { KnowledgeChunk, KnowledgeSource, KnowledgeSourceId } from './types/knowledge'

export class BeaverDevRAG {
  private knowledgeChunks: KnowledgeChunk[] = []

  constructor(private sources: KnowledgeSource[]) {}

  /**
   * Initialize RAG system by chunking all knowledge sources
   */
  async initialize(): Promise<void> {
    for (const source of this.sources) {
      if (source.content) {
        const chunks = this.chunkDocument(source.content, source.id)
        this.knowledgeChunks.push(...chunks)
        console.log(`🔍 Chunked ${source.label}: ${chunks.length} chunks`)
      }
    }

    console.log(`✅ RAG system initialized with ${this.knowledgeChunks.length} total chunks`)
  }

  /**
   * Chunk a document by sections (## headers) and extract keywords
   */
  private chunkDocument(content: string, source: KnowledgeSourceId): KnowledgeChunk[] {
    const chunks: KnowledgeChunk[] = []

    // Split by ## headers (markdown sections)
    const sections = content.split(/^## /m)

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim()
      if (!section) continue

      const lines = section.split('\n')
      const sectionTitle = lines[0] || 'Introduction'
      const sectionContent = lines.slice(1).join('\n').trim()

      // For large sections, split into smaller chunks (~1500 chars)
      if (sectionContent.length > 1500) {
        const subChunks = this.splitLargeSection(sectionContent, 1500)
        subChunks.forEach((subContent, index) => {
          chunks.push({
            id: `${source}:${this.sanitizeId(sectionTitle)}_${index}`,
            content: subContent,
            source,
            section: sectionTitle,
            keywords: this.extractKeywords(subContent),
          })
        })
      } else {
        chunks.push({
          id: `${source}:${this.sanitizeId(sectionTitle)}`,
          content: sectionContent,
          source,
          section: sectionTitle,
          keywords: this.extractKeywords(sectionContent),
        })
      }
    }

    return chunks
  }

  /**
   * Split large sections into smaller chunks
   */
  private splitLargeSection(content: string, maxLength: number): string[] {
    const chunks: string[] = []
    const paragraphs = content.split('\n\n')

    let currentChunk = ''

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length > maxLength && currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = paragraph
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim())
    }

    return chunks
  }

  /**
   * Extract keywords from content (function names, code patterns, Towns-specific terms)
   */
  private extractKeywords(content: string): string[] {
    const keywords: Set<string> = new Set()

    // Extract function calls: functionName(
    const functionPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g
    let match
    while ((match = functionPattern.exec(content)) !== null) {
      keywords.add(match[1])
    }

    // Extract Towns-specific terms
    const townsTerms = [
      'bot',
      'handler',
      'message',
      'channel',
      'thread',
      'space',
      'event',
      'webhook',
      'onMessage',
      'onSlashCommand',
      'sendMessage',
      'makeTownsBot',
      'threadId',
      'channelId',
      'userId',
      'eventId',
      'mentions',
      'reaction',
      'permission',
      'RAG',
      'OpenAI',
      'embedding',
      'SDK',
      'protocol',
    ]

    const lowerContent = content.toLowerCase()
    for (const term of townsTerms) {
      if (lowerContent.includes(term.toLowerCase())) {
        keywords.add(term)
      }
    }

    return Array.from(keywords)
  }

  /**
   * Sanitize section title for use in chunk IDs
   */
  private sanitizeId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50)
  }

  /**
   * Get all chunks
   */
  getChunks(): KnowledgeChunk[] {
    return this.knowledgeChunks
  }
}

