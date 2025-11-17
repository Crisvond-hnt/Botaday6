# 📚 BeaverDev Knowledge Source Documentation

## Overview

BeaverDev uses **AGENTS.md** as its **ONLY** knowledge source. This file contains the comprehensive Towns Bot SDK documentation.

## AGENTS.md Verification

### ✅ Correct AGENTS.md File

The correct AGENTS.md file should have:
- **~2445 lines** of content
- **~240KB** file size
- Contains section: "Quick Start for AI Agents"
- Contains references to: "@towns-protocol/bot"
- Comprehensive bot development guide with:
  - Event handlers (onMessage, onSlashCommand, etc.)
  - Slash command implementation
  - Interactive requests (buttons, forms, transactions)
  - Bot wallet architecture
  - Deployment guides
  - Troubleshooting tips

### 🔍 Validation on Startup

When you run `bun dev`, you'll see:

```
🔍 Validating AGENTS.md...
   Project root: /Users/crisvond/stream6
   Expected path: /Users/crisvond/stream6/AGENTS.md
✅ AGENTS.md validated (2445 lines, 234.56 KB)
🗄️ Initializing database...
📚 Loading knowledge base (AGENTS.md + guides)...
🔍 Loading: /Users/crisvond/stream6/AGENTS.md
   ├─ Lines: 2445
   ├─ Has Quick Start: true
   └─ Has Bot SDK Guide: true
✅ Loaded knowledge source: Towns Bot SDK Complete Guide (AGENTS.md)
   └─ Size: 234.56 KB (240127 bytes)
🔍 Chunked Towns Bot SDK Complete Guide (AGENTS.md): 180+ chunks
🔮 Generating embeddings for 180+ chunks...
✅ Index built with 180+ embedded chunks
```

### ⚠️ Warning Signs

If you see these warnings, you might have the wrong AGENTS.md:

```
⚠️  WARNING: This might not be the correct AGENTS.md file!
⚠️  Expected: 2400+ lines with Towns Bot SDK documentation
```

Or:

```
⚠️  WARNING: Found AGENTS.md but it might not be the correct file!
⚠️  Has "Quick Start for AI Agents": false
⚠️  Has "@towns-protocol/bot": false
```

## File Structure

### Current Setup
```
/Users/crisvond/stream6/
├── AGENTS.md                 ← ONLY knowledge source (2445 lines)
├── package.json
├── src/
│   ├── config/
│   │   ├── knowledge.ts      ← Loads AGENTS.md
│   │   └── validation.ts     ← Validates AGENTS.md exists
│   ├── rag.ts                ← Chunks AGENTS.md into ~180 pieces
│   └── rag/
│       └── index.ts          ← Creates embeddings for chunks
└── ...
```

### Knowledge Source Configuration

File: `src/config/knowledge.ts`

```typescript
const KNOWN_SOURCES: KnowledgeSource[] = [
  {
    id: 'agents_md',
    label: 'Towns Bot SDK Complete Guide (AGENTS.md)',
    fileName: 'AGENTS.md', // Loads from project root
  },
]
```

## RAG System Flow

### 1. Loading Phase (Startup)
```
1. Validate AGENTS.md exists
2. Load AGENTS.md content (240KB)
3. Chunk by ## headers → ~180 chunks
4. Extract keywords from each chunk
5. Generate embeddings for all chunks (OpenAI)
6. Store in memory for fast retrieval
```

### 2. Query Phase (When User Asks)
```
User: "@BeaverDev how do I handle slash commands?"

1. Embed the user's question
2. Calculate cosine similarity with all 180 chunks
3. Retrieve top 5 most relevant chunks
   Example chunks returned:
   - agents_md:onslashcommand_command_handler
   - agents_md:setup_required
   - agents_md:complete_event_handler_reference
   
4. Build system prompt with:
   - BeaverDev persona
   - User's question
   - Full conversation history
   - Retrieved chunks with content
   
5. Send to OpenAI GPT-4o-mini
6. Parse response and cite sources
7. Send playful, helpful answer in thread
```

### 3. Example Chunk Structure

After chunking AGENTS.md, you get chunks like:

```typescript
{
  id: 'agents_md:onslashcommand_command_handler',
  content: '### `onSlashCommand` - Command Handler\n\n**When it fires:**...',
  source: 'agents_md',
  section: 'onSlashCommand - Command Handler',
  keywords: ['onSlashCommand', 'command', 'handler', 'bot', 'slash', ...]
}
```

## Monitoring

### Check Knowledge Base Status

Visit `GET http://localhost:5124/health`:

```json
{
  "status": "ok",
  "bot": {
    "id": "0x...",
    "appAddress": "0x...",
    "commands": 4
  },
  "knowledge": {
    "sources": [
      {
        "id": "agents_md",
        "label": "Towns Bot SDK Complete Guide (AGENTS.md)",
        "bytes": 240127,
        "checksum": "240127-85"
      }
    ]
  }
}
```

### Console Logs to Watch

✅ **Good:**
```
✅ AGENTS.md validated (2445 lines, 234.56 KB)
✅ Loaded knowledge source: Towns Bot SDK Complete Guide (AGENTS.md)
🔍 Chunked Towns Bot SDK Complete Guide (AGENTS.md): 180 chunks
✅ Index built with 180 embedded chunks
```

❌ **Bad:**
```
❌ CRITICAL ERROR: AGENTS.md not found!
❌ Failed to load AGENTS.md: ENOENT
⚠️  WARNING: This might not be the correct AGENTS.md file!
```

## Troubleshooting

### Issue: "AGENTS.md not found"

**Solution:**
1. Ensure AGENTS.md is in project root (same directory as package.json)
2. Check the file path: `/Users/crisvond/stream6/AGENTS.md`
3. File must be named exactly `AGENTS.md` (case-sensitive)

### Issue: "Wrong AGENTS.md file detected"

**Solution:**
1. Verify AGENTS.md has 2400+ lines
2. Open file and check it contains "Quick Start for AI Agents"
3. Check it has comprehensive @towns-protocol/bot documentation
4. If you have multiple AGENTS.md files, use the comprehensive one

### Issue: "No chunks generated"

**Solution:**
1. Check AGENTS.md is not empty
2. Ensure file has ## headers (markdown sections)
3. Check RAG system logs for chunking errors

## Adding More Knowledge Sources

Currently using only AGENTS.md. To add more:

1. **Add source file:**
   ```bash
   # Add to project root
   cp ADDITIONAL_DOCS.md /Users/crisvond/stream6/
   ```

2. **Update configuration:**
   ```typescript
   // src/config/knowledge.ts
   const KNOWN_SOURCES: KnowledgeSource[] = [
     {
       id: 'agents_md',
       label: 'Towns Bot SDK Complete Guide (AGENTS.md)',
       fileName: 'AGENTS.md',
     },
     {
       id: 'additional_docs',
       label: 'Additional Documentation',
       fileName: 'ADDITIONAL_DOCS.md',
     },
   ]
   ```

3. **Update type definitions:**
   ```typescript
   // src/types/knowledge.ts
   export type KnowledgeSourceId = 'agents_md' | 'additional_docs'
   ```

4. **Restart bot:**
   ```bash
   bun dev
   ```

## Summary

✅ **Single Source of Truth**: AGENTS.md (2445 lines)  
✅ **Automatic Validation**: Checks file on startup  
✅ **Comprehensive Coverage**: All @towns-protocol/bot documentation  
✅ **Smart Chunking**: ~180 searchable chunks  
✅ **Semantic Search**: OpenAI embeddings for accurate retrieval  

🦫 **BeaverDev is powered entirely by AGENTS.md!** ☕

