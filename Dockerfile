# Multi-stage build for Crack AI (Supabase PostgreSQL)

# Stage 1: Build client
FROM node:20-alpine AS client-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy necessary files for client build
COPY client ./client
COPY shared ./shared
COPY vite.config.ts tsconfig.json postcss.config.js components.json vite-plugin-meta-images.ts ./

# Build client (Vite)
RUN npx vite build --outDir dist/public

# Stage 2: Build server
FROM node:20-alpine AS server-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy server source
COPY server ./server
COPY shared ./shared
COPY tsconfig.json ./

# Build server bundle
RUN npx esbuild server/index.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --format=cjs \
  --outfile=dist/index.cjs \
  --define:process.env.NODE_ENV='"production"' \
  --external:express \
  --external:@supabase/supabase-js \
  --external:@neondatabase/serverless \
  --external:express-session \
  --external:memorystore \
  --external:multer \
  --external:bcryptjs \
  --external:dotenv \
  --external:@octokit/rest

# Stage 3: Production
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built files from builders
COPY --from=client-builder /app/dist/public ./dist/public
COPY --from=server-builder /app/dist/index.cjs ./dist/index.cjs

# Copy runtime files
COPY shared ./shared

# Create necessary directories
RUN mkdir -p uploads && touch uploads/.gitkeep

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.cjs"]
