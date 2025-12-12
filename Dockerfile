# Multi-stage build for MongoDB Backup Manager

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install dependencies
RUN npm ci --quiet

# Copy client source
COPY client/ ./

# Build frontend
RUN npm run build

# Stage 2: Final image
FROM node:18-alpine

# Install mongodump (MongoDB tools)
RUN apk add --no-cache mongodb-tools

WORKDIR /app

# Copy server package files
COPY server/package*.json ./server/

# Install production dependencies
WORKDIR /app/server
RUN npm ci --production --quiet

# Copy server source
COPY server/ ./

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/client/dist /app/client/dist

# Create data directories
RUN mkdir -p /app/data/backups /app/logs

# Set environment to production
ENV NODE_ENV=production

# Expose port
EXPOSE 5552

# Start server
CMD ["node", "index.js"]
