/**
 * Knowledge Base Configuration and Loading
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { KnowledgeSource } from '../types/knowledge'

/**
 * Knowledge sources for BeaverDev RAG system
 * AGENTS.md is the ONLY source - comprehensive Towns Bot SDK documentation (2400+ lines)
 */
const KNOWN_SOURCES: KnowledgeSource[] = [
  {
    id: 'agents_md',
    label: 'Towns Bot SDK Complete Guide (AGENTS.md)',
    fileName: 'AGENTS.md', // From project root - the 2445 line comprehensive guide
  },
]

/**
 * Load knowledge base files from disk
 */
export function loadKnowledgeBase(): KnowledgeSource[] {
  const sources: KnowledgeSource[] = []

  for (const source of KNOWN_SOURCES) {
    try {
      // Load from project root (where package.json is)
      const filePath = resolve(process.cwd(), source.fileName)
      console.log(`🔍 Loading: ${filePath}`)
      
      const content = readFileSync(filePath, 'utf-8')
      
      // Validate AGENTS.md has the expected content
      if (source.fileName === 'AGENTS.md') {
        const hasQuickStart = content.includes('Quick Start for AI Agents')
        const hasBotGuide = content.includes('@towns-protocol/bot')
        const lineCount = content.split('\n').length
        
        console.log(`   ├─ Lines: ${lineCount}`)
        console.log(`   ├─ Has Quick Start: ${hasQuickStart}`)
        console.log(`   └─ Has Bot SDK Guide: ${hasBotGuide}`)
        
        if (!hasQuickStart || !hasBotGuide || lineCount < 2000) {
          console.warn('⚠️  WARNING: This might not be the correct AGENTS.md file!')
          console.warn('⚠️  Expected: 2400+ lines with Towns Bot SDK documentation')
        }
      }
      
      // Simple checksum (hash content length + first 100 chars)
      const checksum = `${content.length}-${content.substring(0, 100).replace(/\s/g, '').length}`

      sources.push({
        ...source,
        content,
        byteLength: content.length,
        checksum,
      })

      const sizeKB = (content.length / 1024).toFixed(2)
      console.log(`✅ Loaded knowledge source: ${source.label}`)
      console.log(`   └─ Size: ${sizeKB} KB (${content.length} bytes)`)
    } catch (error) {
      console.error(`❌ Failed to load ${source.fileName}:`, error)
      console.error(`   Expected location: ${resolve(process.cwd(), source.fileName)}`)
    }
  }

  return sources
}

