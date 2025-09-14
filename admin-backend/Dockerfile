# Admin Backend Dockerfile
FROM node:18-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nectar-admin
RUN adduser --system --uid 1001 nectar-admin

# Copy built application
COPY --from=deps --chown=nectar-admin:nectar-admin /app/node_modules ./node_modules
COPY --from=build --chown=nectar-admin:nectar-admin /app/dist ./dist
COPY --chown=nectar-admin:nectar-admin package.json ./

USER nectar-admin

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').request('http://localhost:4001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).end()"

EXPOSE 4001

ENV NODE_ENV=production
ENV PORT=4001

CMD ["node", "dist/app.js"]