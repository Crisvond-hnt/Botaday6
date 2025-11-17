/**
 * Slash Command Definitions
 * Register these with: bunx towns-bot update-commands src/commands.ts YOUR_BEARER_TOKEN
 */

export const commands: { name: string; description: string }[] = [
  {
    name: 'help',
    description: 'Show BeaverDev capabilities and how to use (with sass)',
  },
  {
    name: 'info',
    description: 'About BeaverDev and Towns Bot SDK overview',
  },
  {
    name: 'docs',
    description: 'Links to official bot SDK documentation',
  },
  {
    name: 'ask',
    description: 'Ask BeaverDev anything about @towns-protocol/bot',
  },
]

export default commands
