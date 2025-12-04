# Build stage for client
FROM node:20-alpine AS client-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy client source
COPY client ./client
COPY shared ./shared
COPY vite.config.ts tsconfig.json postcss.config.js components.json vite-plugin-meta-images.ts ./

# Build client
RUN npm run build -- --client-only || (cd client && npx vite build --outDir ../dist/public)

# Build stage for server
FROM node:20-alpine AS server-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm ci

# Copy server source
COPY server ./server
COPY shared ./shared
COPY script ./script
COPY tsconfig.json ./

# Build server
RUN npx esbuild server/index.ts --bundle --platform=node --target=node20 --format=cjs --outfile=dist/index.cjs --external:express --external:better-sqlite3 --external:@neondatabase/serverless --external:express-session --external:memorystore --external:multer

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built files from builders
COPY --from=client-builder /app/dist/public ./dist/public
COPY --from=server-builder /app/dist/index.cjs ./dist/index.cjs

# Copy drizzle config and shared schema for runtime
COPY drizzle.config.ts ./
COPY shared ./shared

# Create necessary directories
RUN mkdir -p uploads && \
    touch uploads/.gitkeep

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start the application
CMD ["node", "dist/index.cjs"]
