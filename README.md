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

## Quick Start (Fresh Linux Server)

For a **brand new server** with nothing installed, use the automated bootstrap script:

```bash
# Clone the repository
git clone https://github.com/dyllisLev/ai-story-game.git
cd ai-story-game

# Run automated setup (checks Node.js, installs deps, initializes DB, configures system)
chmod +x bootstrap.sh
./bootstrap.sh
```

The bootstrap script will:
1. ✅ Check Node.js v20.x installation
2. ✅ Install all dependencies (`npm install`)
3. ✅ Initialize database with sample data
4. ✅ Configure Linux inotify limits (if needed)
5. ✅ Start the development server

## Manual Installation

If you prefer step-by-step installation:

### 1. Prerequisites

**Node.js v20.x** (recommended: v20.19.3)

```bash
# Using nvm (recommended)
nvm install 20.19.3
nvm use 20.19.3

# Or download from https://nodejs.org/
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Initialize Database

```bash
chmod +x setup.sh
./setup.sh
```

Or directly:
```bash
npx tsx scripts/setup-db.ts
```

This creates `app.db` with default settings and a sample story.

### 4. Start Development Server

```bash
npm run dev
```

Open http://localhost:5000

### 5. Configure API Keys

Go to **Settings** and enter your API keys:
- **OpenAI API Key** - For ChatGPT (gpt-4o)
- **Anthropic API Key** - For Claude (claude-3-5-sonnet)
- **Google AI API Key** - For Gemini (gemini-3-pro, gemini-2.5-flash)
- **xAI API Key** - For Grok (grok-beta)

## Get API Keys

- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/
- Google AI: https://aistudio.google.com/apikey
- xAI: https://console.x.ai/

## Troubleshooting

### EMFILE: too many open files (Linux)

If you see this error on Linux servers:

```bash
# Increase inotify watch limit
sudo sysctl fs.inotify.max_user_watches=524288

# Make it permanent
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

> **Note:** The bootstrap script handles this automatically!

### Development vs Production

This project is optimized for **Replit** as the primary development environment. 

For deployment on external servers:
- Use the `bootstrap.sh` script for initial setup
- Ensure Node.js v20.x is installed
- Configure system limits as shown above

## Database Schema

- **stories**: Story templates with settings and metadata
- **sessions**: Individual playthroughs with session-specific settings
- **messages**: Chat history for each session
- **settings**: Application configuration and API keys

## Development Commands

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run check

# Database schema push
npm run db:push

# Reset database (WARNING: Deletes all data)
rm app.db && npx tsx scripts/setup-db.ts
```

## Project Structure

```
ai-story-game/
├── client/           # React frontend
│   ├── src/
│   │   ├── pages/   # Route pages
│   │   ├── components/  # UI components
│   │   └── lib/     # Utils & API client
│   └── index.html
├── server/          # Express backend
│   ├── index.ts     # Main server
│   ├── routes.ts    # API routes
│   └── storage.ts   # Database layer
├── shared/          # Shared types & schema
│   └── schema.ts    # Drizzle schema
├── scripts/         # Utility scripts
│   ├── setup-db.ts  # DB initialization
│   └── export-init-db.ts  # DB export
├── init-db.sql      # DB initialization SQL
├── setup.sh         # DB setup script
├── bootstrap.sh     # Complete server setup
└── package.json
```

## Environment

No environment variables needed! All configuration is done through the web interface Settings page.

## License

MIT

---

Built with ❤️ on Replit
