# ===== BUILD STAGE =====
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files for dependency caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ===== DEPENDENCIES STAGE (for dev dependencies if needed during build) =====
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ===== FINAL STAGE =====
FROM nginx:alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create non-root user for nginx
RUN addgroup -g 101 -S nginx && adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Copy built application from build stage
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Copy optimized nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create necessary directories with proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html /etc/nginx

# Switch to non-root user
USER nginx

EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/index.html || exit 1

CMD ["nginx", "-g", "daemon off;"]
