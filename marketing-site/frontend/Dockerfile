# Marketing Frontend Dockerfile
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

# Production stage (serve with nginx)
FROM nginx:alpine AS production

# Create non-root user
RUN addgroup --system --gid 1001 nectar-marketing
RUN adduser --system --uid 1001 nectar-marketing

# Copy built application
COPY --from=build /app/build /usr/share/nginx/html

# Custom nginx config for React SPA
COPY nginx.conf /etc/nginx/nginx.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]