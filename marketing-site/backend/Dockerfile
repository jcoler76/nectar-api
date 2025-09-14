# Marketing Backend Dockerfile
FROM node:18-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nectar-marketing
RUN adduser --system --uid 1001 nectar-marketing

# Copy application
COPY --from=deps --chown=nectar-marketing:nectar-marketing /app/node_modules ./node_modules
COPY --chown=nectar-marketing:nectar-marketing . .

USER nectar-marketing

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').request('http://localhost:5000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).end()"

EXPOSE 5000

ENV NODE_ENV=production
ENV MARKETING_PORT=5000

CMD ["npm", "start"]