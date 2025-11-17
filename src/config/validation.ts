/**
 * Validate that critical knowledge sources exist
 */

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

export function validateKnowledgeSources(): void {
  const projectRoot = process.cwd()
  const agentsMd = resolve(projectRoot, 'AGENTS.md')
  
  console.log('🔍 Validating AGENTS.md...')
  console.log(`   Project root: ${projectRoot}`)
  console.log(`   Expected path: ${agentsMd}`)
  
  if (!existsSync(agentsMd)) {
    console.error('\n❌ CRITICAL ERROR: AGENTS.md not found!')
    console.error('❌ AGENTS.md is the ONLY knowledge source for BeaverDev')
    console.error('❌ Path checked:', agentsMd)
    console.error('\n💡 Make sure AGENTS.md (2400+ lines) exists in the project root directory')
    console.error('💡 This should be the comprehensive Towns Bot SDK guide')
    process.exit(1)
  }

  // Validate it's the correct AGENTS.md
  try {
    const content = readFileSync(agentsMd, 'utf-8')
    const lineCount = content.split('\n').length
    const hasQuickStart = content.includes('Quick Start for AI Agents')
    const hasBotGuide = content.includes('@towns-protocol/bot')
    
    if (!hasQuickStart || !hasBotGuide) {
      console.error('\n⚠️  WARNING: Found AGENTS.md but it might not be the correct file!')
      console.error('⚠️  Expected: Comprehensive Towns Bot SDK documentation')
      console.error(`⚠️  Found: ${lineCount} lines`)
      console.error(`⚠️  Has "Quick Start for AI Agents": ${hasQuickStart}`)
      console.error(`⚠️  Has "@towns-protocol/bot": ${hasBotGuide}`)
      console.error('\n💡 Make sure you\'re using the comprehensive AGENTS.md guide')
    }
    
    console.log(`✅ AGENTS.md validated (${lineCount} lines, ${(content.length / 1024).toFixed(2)} KB)`)
  } catch (error) {
    console.error('❌ Failed to validate AGENTS.md content:', error)
    process.exit(1)
  }
}

