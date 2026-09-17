# ===== BUILD STAGE =====
FROM node:22-alpine AS build
WORKDIR /app

# Copy package files for dependency caching
COPY package*.json ./

# Build tooling such as TypeScript and Vite is installed from devDependencies.
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ===== FINAL STAGE =====
FROM nginxinc/nginx-unprivileged:alpine

# Copy built application from build stage
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Copy optimized nginx config
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

# Switch to non-root user
USER nginx

EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/index.html || exit 1

CMD ["nginx", "-g", "daemon off;"]
