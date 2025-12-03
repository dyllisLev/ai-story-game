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

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up your API keys in the settings page

3. Run the development server:
```bash
npm run dev
```

4. Open your browser at `http://localhost:5000`

## Database Schema

- **stories**: Story templates with settings and metadata
- **sessions**: Individual playthroughs with session-specific settings
- **messages**: Chat history for each session
- **settings**: Application configuration and API keys

## License

MIT

---

Built with ❤️ on Replit
