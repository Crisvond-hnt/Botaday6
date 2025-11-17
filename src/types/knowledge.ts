/**
 * Knowledge Base Types for RAG System
 */

export type KnowledgeSourceId = 'agents_md'

export interface KnowledgeSource {
  id: KnowledgeSourceId
  label: string
  fileName: string
  content?: string
  byteLength?: number
  checksum?: string
}

export interface KnowledgeChunk {
  id: string
  content: string
  source: KnowledgeSourceId
  section: string
  keywords: string[]
}

export interface EmbeddedChunk extends KnowledgeChunk {
  embedding: number[]
  similarity?: number
}

