# Overview

This is a React-based interactive AI story roleplay application called "Crack AI". The application allows users to create, manage, and play through AI-powered interactive stories with multiple AI models. It features a full-stack architecture with an Express backend, React frontend, and SQLite database for local data persistence.

The app provides a story creation interface with customizable settings, a chat-based gameplay interface with markdown rendering, and support for multiple AI language models (Gemini, GPT-4, Claude, Grok). The primary language appears to be Korean, as evidenced by the UI content and sample stories.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript
- Vite as the build tool and development server
- Wouter for client-side routing
- TanStack Query for server state management
- Tailwind CSS v4 with custom theme variables
- shadcn/ui component library (New York style)
- React Markdown for rendering story content

**Design Decisions:**
- **Component-based UI:** Uses a comprehensive shadcn/ui component library for consistent design patterns
- **Mobile-first responsive design:** Custom hook `useIsMobile` for adaptive layouts
- **Type-safe routing:** Wouter provides lightweight routing with TypeScript support
- **Optimistic UI updates:** TanStack Query handles caching and background synchronization

**Frontend Structure:**
- `/client/src/pages/` - Route-level page components (home, create, play, settings)
- `/client/src/components/` - Reusable UI components
- `/client/src/lib/` - Utilities and API client logic
- `/client/src/hooks/` - Custom React hooks

## Backend Architecture

**Technology Stack:**
- Express.js with TypeScript
- SQLite via better-sqlite3 for local database
- Drizzle ORM for type-safe database queries
- Custom static file serving in production

**API Design:**
- RESTful endpoints under `/api/` prefix
- Settings API for storing API keys and configuration
- Stories API for CRUD operations on stories
- Messages API for managing story chat history
- Batch operations support for efficient updates

**Database Schema:**
The application uses four main tables:
- `settings` - Key-value store for API keys and configuration
- `stories` - Story templates with metadata (title, description, genre, author, prologue, story settings, timestamps)
- `sessions` - Individual playthroughs of stories (storyId FK, title, conversation profile, user notes, summary memory, model/provider settings, timestamps)
- `messages` - Chat history with session ID foreign key, role (user/assistant), content, and optional character attribution

**Session System Architecture:**
- **Stories as Templates:** Stories serve as reusable templates that define the world, characters, and starting situation
- **Sessions as Playthroughs:** Each session represents an independent playthrough of a story with its own chat history and settings
- **Isolated Chat History:** Messages are tied to sessions, allowing multiple concurrent playthroughs of the same story
- **Session-Specific Settings:** Each session can have custom conversation profiles, user notes, summary memory, and AI model preferences
- **Safe Data Migration:** Existing story-based messages are automatically migrated to session-based storage with backup preservation

**Architectural Choices:**
- **SQLite over PostgreSQL initially:** Uses better-sqlite3 for local development simplicity, though the drizzle config references PostgreSQL (prepared for future migration)
- **WAL mode enabled:** Write-Ahead Logging for better concurrent read performance
- **Shared schema:** `/shared/schema.ts` provides type definitions used by both client and server
- **Build-time bundling:** Selected dependencies are bundled with esbuild to reduce cold start syscalls

## Development vs Production

**Development Mode:**
- Vite dev server with HMR at port 5000
- Middleware mode integration with Express
- Replit-specific plugins (cartographer, dev-banner, runtime error overlay)
- Dynamic HTML template reloading with cache-busting

**Production Mode:**
- Pre-built static assets served from `/dist/public`
- Server bundled as single CJS file with selective dependency bundling
- Optimized for cold start performance on Replit deployments

## External Dependencies

**AI Service Integrations:**
The application supports multiple AI language model providers through API keys stored in the settings table:
- Google Gemini (gemini-3.0-pro, 1.5-pro, 1.5-flash)
- OpenAI GPT-4o
- Anthropic Claude 3.5 Sonnet
- Grok (xAI)

**Note:** API integration code for calling these services is not present in the repository snapshot but would need to be implemented in the backend routes.

**Database:**
- SQLite (better-sqlite3) for local storage
- Drizzle ORM with PostgreSQL dialect configured (suggesting future migration path)
- Neon serverless driver available as dependency

**UI Component Libraries:**
- Radix UI primitives for accessible components
- Lucide React for iconography
- Tailwind CSS with PostCSS for styling
- React Markdown for content rendering

**Development Tools:**
- Replit-specific Vite plugins for enhanced development experience
- Custom meta-images plugin for OpenGraph tag injection
- TypeScript with strict mode enabled
- ESM module system throughout

**Third-party Services:**
- Google Fonts (Noto Sans KR, JetBrains Mono)
- Font loading optimized with preconnect

## Data Flow

**Story Creation:**
1. User creates a story template through the React frontend
2. Story metadata (including prologue, settings) stored in SQLite via Drizzle ORM

**Session Creation (New Playthrough):**
1. User clicks "새로 시작" (New Start) on a story card
2. Frontend sends POST request to `/api/stories/:id/sessions`
3. Backend creates a new session and automatically adds prologue as first message (server-side)
4. Frontend redirects to `/play/:sessionId`

**Gameplay:**
1. User sends messages through the chat interface
2. Messages are sent to the selected AI model's API with session context
3. AI responses are saved to the messages table with session association
4. TanStack Query manages caching and synchronization between UI and API

**Session Continuation:**
1. User clicks "이어서 플레이" (Continue) on a story card
2. Frontend fetches sessions for that story
3. Redirects to most recent session or creates new one if none exist

## Security Considerations

**API Key Storage:** API keys for AI services are stored in the SQLite database settings table. This approach works for single-user local deployments but should be reconsidered for multi-user or hosted scenarios.

**Input Validation:** Drizzle-zod schemas provide runtime validation for database inserts, ensuring type safety between client and server.