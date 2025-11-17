/**
 * Knowledge Index with Embeddings
 * Semantic search using OpenAI embeddings with caching
 */

import type OpenAI from 'openai'
import type { KnowledgeChunk, EmbeddedChunk, KnowledgeSource } from '../types/knowledge'
import { BeaverDevRAG } from '../rag'
import { loadCache, saveCache } from './cache'

export class KnowledgeIndex {
  private embeddedChunks: EmbeddedChunk[] = []

  constructor(
    private openai: OpenAI,
    private chunks: KnowledgeChunk[],
    private checksum: string
  ) {}

  /**
   * Build index by generating embeddings for all chunks (with caching)
   */
  async buildIndex(): Promise<void> {
    // Try to load from cache first
    const cachedChunks = loadCache(this.checksum)
    
    if (cachedChunks) {
      this.embeddedChunks = cachedChunks
      console.log(`⚡ Using cached embeddings (skipped API calls!)`)
      return
    }

    // No cache, generate fresh embeddings
    console.log(`🔮 Generating embeddings for ${this.chunks.length} chunks...`)
    console.log(`   This will take ~4-5 minutes on first deploy`)

    // Process in batches to avoid rate limits
    const batchSize = 100
    for (let i = 0; i < this.chunks.length; i += batchSize) {
      const batch = this.chunks.slice(i, i + batchSize)
      const embeddings = await this.generateEmbeddings(batch.map((c) => c.content))

      for (let j = 0; j < batch.length; j++) {
        this.embeddedChunks.push({
          ...batch[j],
          embedding: embeddings[j],
        })
      }

      const progress = Math.floor(i / batchSize) + 1
      const total = Math.ceil(this.chunks.length / batchSize)
      console.log(`✅ Embedded batch ${progress}/${total}`)
    }

    console.log(`🎉 Index built with ${this.embeddedChunks.length} embedded chunks`)
    
    // Save to cache for future deploys
    saveCache(this.embeddedChunks, this.checksum)
  }

  /**
   * Generate embeddings for multiple texts
   */
  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      })

      return response.data.map((item) => item.embedding)
    } catch (error) {
      console.error('❌ Failed to generate embeddings:', error)
      throw error
    }
  }

  /**
   * Retrieve most relevant chunks for a query using cosine similarity
   */
  async retrieveRelevantChunks(query: string, limit: number = 5): Promise<EmbeddedChunk[]> {
    // Generate embedding for query
    const [queryEmbedding] = await this.generateEmbeddings([query])

    // Calculate cosine similarity for all chunks
    const scoredChunks = this.embeddedChunks.map((chunk) => ({
      ...chunk,
      similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding),
    }))

    // Sort by similarity (highest first) and return top K
    return scoredChunks.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0)).slice(0, limit)
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, value, index) => sum + value * b[index], 0)
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    return dotProduct / (magnitudeA * magnitudeB)
  }
}

/**
 * Create knowledge index from knowledge sources (with caching)
 */
export async function createKnowledgeIndex(
  openai: OpenAI,
  sources: KnowledgeSource[]
): Promise<KnowledgeIndex> {
  // Initialize RAG system
  const rag = new BeaverDevRAG(sources)
  await rag.initialize()

  // Generate checksum from all source checksums
  const checksum = sources.map((s) => s.checksum).join('-')

  // Create index with embeddings (will use cache if available)
  const index = new KnowledgeIndex(openai, rag.getChunks(), checksum)
  await index.buildIndex()

  return index
}

