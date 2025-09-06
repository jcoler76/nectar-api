# Multi-stage build for optimized production image
# Stage 1: Build frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /app

# Copy frontend package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies with legacy peer deps flag
RUN npm ci --legacy-peer-deps

# Copy frontend source
COPY public/ ./public/
COPY src/ ./src/
COPY config-overrides.js ./
COPY tailwind.config.js ./
COPY tsconfig.json ./
# Copy production env if it exists (optional - contains secrets, should be mounted at runtime)
# COPY .env.production ./

# Build frontend (disable ESLint for Docker build due to plugin conflicts in containerized environment)
ENV DISABLE_ESLINT_PLUGIN=true
RUN npm run build

# Stage 2: Setup backend
FROM node:22-alpine AS backend-builder

WORKDIR /app/server

# Copy backend package files
COPY server/package*.json ./

# Install all dependencies (including dev dependencies for workflow features)
RUN npm ci --legacy-peer-deps

# Stage 3: Production image
FROM node:22-alpine

# Install required tools for MongoDB backup/restore
RUN apk add --no-cache mongodb-tools

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built frontend from stage 1 to the path expected by server
COPY --from=frontend-builder --chown=nodejs:nodejs /app/build ./client/build

# Copy backend from stage 2
COPY --from=backend-builder --chown=nodejs:nodejs /app/server/node_modules ./server/node_modules

# Copy backend source
COPY --chown=nodejs:nodejs server/ ./server/

# Create necessary directories
RUN mkdir -p /app/server/logs /app/server/backups /app/server/uploads && \
    chown -R nodejs:nodejs /app/server/logs /app/server/backups /app/server/uploads

# Switch to non-root user
USER nodejs

# Expose ports
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Start server
WORKDIR /app/server
CMD ["node", "server.js"]