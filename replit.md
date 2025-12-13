# Overview

"Crack AI" is an interactive AI story roleplay application built with React, Express, and Supabase. It enables users to create, manage, and play AI-powered stories using various AI models (Gemini, GPT-4, Claude, Grok). The application features a story creation interface, a chat-based gameplay system with markdown rendering, and robust user and session management. Its primary purpose is to provide an engaging and customizable platform for interactive AI narrative experiences.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend

The frontend is a React 18 application using TypeScript, Vite, Wouter for routing, TanStack Query for state management, and Tailwind CSS with shadcn/ui for components. It follows a component-based, mobile-first design, supporting type-safe routing and optimistic UI updates. Story content is rendered using React Markdown.

## Backend

The backend is an Express.js application with TypeScript, interacting with a self-hosted Supabase PostgreSQL database. It provides RESTful APIs for settings, stories, messages, and user management. Key features include:

-   **Database Schema:** Main tables include `users`, `settings`, `stories`, `sessions`, and `messages`, alongside `groups`, `user_groups`, and `story_groups` for access control.
-   **Conversation Profiles:** Users can create reusable conversation profiles stored in the `users` table.
-   **Session Management:** Stories act as templates, and sessions are individual playthroughs with isolated chat histories and session-specific settings.
-   **Build Configuration:** Optimized for both development (Vite HMR) and production (pre-built static assets, bundled server) using esbuild for tree-shaking and dependency optimization.

## Security

-   **API Key Storage:** AI service API keys are stored per-user in the `users` table, with global fallbacks in the `settings` table.
-   **Group-Based Story Access Control:** Stories are protected by group permissions (`read`, `write`) managed in `story_groups`. Creators and admins have elevated access.
-   **Session Access Control:** Sessions are user-specific, requiring authentication and ownership for access and modification.
-   **Input Validation:** Drizzle-zod schemas ensure type safety and validate database inserts.
-   **Supabase Configuration:** Utilizes a self-hosted Supabase instance with Row Level Security (RLS) enabled for server-side access.

# External Dependencies

## AI Service Integrations

The application integrates with multiple AI language models, supporting per-user API key management:
-   **Google Gemini:** (gemini-3.0-pro, gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash)
-   **OpenAI:** GPT-4o
-   **Anthropic:** Claude 3.5 Sonnet
-   **xAI:** Grok

All integrated AI providers support streaming responses via Server-Sent Events (SSE).

## Database

-   **Self-hosted Supabase PostgreSQL:** `supa.nuc.hmini.me`
-   **Supabase JS Client:** Used for database interactions.

## UI Component Libraries

-   **shadcn/ui:** Component library built on Radix UI primitives.
-   **Lucide React:** Iconography.
-   **Tailwind CSS:** For styling.
-   **React Markdown:** For rendering markdown content.

## Development Tools

-   **Vite:** Build tool.
-   **TypeScript:** Language.
-   **ESM:** Module system.

## Third-party Services

-   **Google Fonts:** Noto Sans KR, JetBrains Mono.