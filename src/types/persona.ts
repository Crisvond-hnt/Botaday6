/**
 * AI Persona Configuration
 */

export interface PersonaConfig {
  displayName: string
  emoji: string
  tone: string
  rules: string[]
  acknowledgements: {
    mention: string[]
    thread: string[]
  }
}

export interface AIResponse {
  answer: string
  references: string[]
}

