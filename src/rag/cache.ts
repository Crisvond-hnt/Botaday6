/**
 * Embedding Cache System
 * Saves embeddings to disk to avoid regenerating on every deploy
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import type { EmbeddedChunk } from '../types/knowledge'

const CACHE_DIR = resolve(process.cwd(), '.cache')
const CACHE_FILE = resolve(CACHE_DIR, 'embeddings.json')

export interface EmbeddingCache {
  version: string
  checksum: string
  chunks: EmbeddedChunk[]
  createdAt: string
}

/**
 * Load cached embeddings if they exist and are valid
 */
export function loadCache(expectedChecksum: string): EmbeddedChunk[] | null {
  try {
    if (!existsSync(CACHE_FILE)) {
      console.log('📦 No embedding cache found, will generate fresh embeddings')
      return null
    }

    const cacheData = JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as EmbeddingCache

    // Validate cache is for the same knowledge base
    if (cacheData.checksum !== expectedChecksum) {
      console.log('⚠️  Cache checksum mismatch, regenerating embeddings')
      console.log(`   Old: ${cacheData.checksum}`)
      console.log(`   New: ${expectedChecksum}`)
      return null
    }

    console.log(`✅ Loaded ${cacheData.chunks.length} embeddings from cache`)
    console.log(`   Created: ${cacheData.createdAt}`)
    return cacheData.chunks
  } catch (error) {
    console.warn('⚠️  Failed to load cache, will regenerate:', error)
    return null
  }
}

/**
 * Save embeddings to cache
 */
export function saveCache(chunks: EmbeddedChunk[], checksum: string): void {
  try {
    // Ensure cache directory exists
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true })
    }

    const cache: EmbeddingCache = {
      version: '1.0.0',
      checksum,
      chunks,
      createdAt: new Date().toISOString(),
    }

    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8')
    console.log(`💾 Saved ${chunks.length} embeddings to cache`)
    console.log(`   File: ${CACHE_FILE}`)
  } catch (error) {
    console.warn('⚠️  Failed to save cache:', error)
  }
}

/**
 * Get cache info for health checks
 */
export function getCacheInfo(): { exists: boolean; size?: number; created?: string } {
  try {
    if (!existsSync(CACHE_FILE)) {
      return { exists: false }
    }

    const cacheData = JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as EmbeddingCache
    return {
      exists: true,
      size: cacheData.chunks.length,
      created: cacheData.createdAt,
    }
  } catch {
    return { exists: false }
  }
}

