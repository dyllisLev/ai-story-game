# AI Story Game (Crack AI)

Interactive Korean AI story/roleplay platform with multiple AI models.

## Features

- 🎭 **Interactive Story Creation**: Create custom story templates with comprehensive settings
- 🤖 **Multiple AI Models**: Support for ChatGPT, Claude, Gemini, and Grok
- 💬 **Real-time Chat**: Stream AI responses with markdown rendering
- 📝 **Session Management**: Multiple independent playthroughs per story
- 🎨 **Beautiful UI**: Modern, responsive design with dark mode support
- 🔧 **Flexible Configuration**: Customizable prompts, conversation profiles, and model settings

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js
- **Database**: SQLite with Drizzle ORM
- **Build Tool**: Vite
- **AI APIs**: OpenAI, Anthropic, Google Gemini, xAI (Grok)

## Quick Start

### 1. Clone and Install

**⚠️ Important: Use Node.js v20.x (recommended: v20.19.3)**

```bash
# Using nvm (recommended)
nvm install 20.19.3
nvm use 20.19.3

# Or check your Node version
node --version  # Should be v20.x

# Clone and install
git clone https://github.com/dyllisLev/ai-story-game.git
cd ai-story-game
npm install
```

> **Note:** Node.js v22+ may cause "EMFILE: too many open files" errors with Vite. Use v20.x for stability.

### 2. Fix EMFILE Error (Important!)

Replace `vite.config.ts` with the fixed version:

```bash
cp vite.config.fixed.ts vite.config.ts
```

This fixes the "EMFILE: too many open files" error on non-Replit servers.

### 3. Initialize Database

```bash
chmod +x setup.sh
./setup.sh
```

Or directly:
```bash
npx tsx scripts/setup-db.ts
```

This will create `app.db` with default settings and a sample story.

### 4. Configure API Keys

Start the application:
```bash
npm run dev
```

Open http://localhost:5000 and go to **Settings** to enter your API keys:
- **OpenAI API Key** - For ChatGPT (gpt-4o)
- **Anthropic API Key** - For Claude (claude-3-5-sonnet)
- **Google AI API Key** - For Gemini (gemini-3-pro, gemini-2.5-flash)
- **xAI API Key** - For Grok (grok-beta)

### 5. Start Creating!

You're all set! Create your own stories or try the sample story included.

## Database Schema

- **stories**: Story templates with settings and metadata
- **sessions**: Individual playthroughs with session-specific settings
- **messages**: Chat history for each session
- **settings**: Application configuration and API keys

## Development

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Reset database (WARNING: Deletes all data)
rm app.db && npm run setup-db
```

## Environment Variables

No environment variables needed! All configuration is done through the web interface.

## API Keys

Get your API keys from:
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/
- Google AI: https://aistudio.google.com/apikey
- xAI: https://console.x.ai/

## License

MIT

---

Built with ❤️ on Replit
