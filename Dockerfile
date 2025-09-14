# Customer Application Dockerfile
# Multi-stage build for production deployment

FROM node:18-alpine AS base
WORKDIR /app

# Install dependencies for both frontend and backend
FROM base AS deps
# Frontend dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Backend dependencies
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --only=production && npm cache clean --force

# Build frontend
FROM base AS build-frontend
COPY package.json package-lock.json ./
RUN npm ci
COPY src/ ./src/
COPY public/ ./public/
COPY tsconfig.json ./
RUN npm run build

# Build backend (if TypeScript compilation needed)
FROM base AS build-backend
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci
COPY server/ ./server/
# Generate Prisma client
RUN cd server && npx prisma generate

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nectar
RUN adduser --system --uid 1001 nectar

# Copy built application
COPY --from=deps --chown=nectar:nectar /app/node_modules ./node_modules
COPY --from=deps --chown=nectar:nectar /app/server/node_modules ./server/node_modules
COPY --from=build-frontend --chown=nectar:nectar /app/build ./build
COPY --from=build-backend --chown=nectar:nectar /app/server ./server

# Copy package files
COPY --chown=nectar:nectar package.json ./
COPY --chown=nectar:nectar server/package.json ./server/

USER nectar

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').request('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).end()"

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "server/server.js"]