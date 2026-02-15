# Production Dockerfile for floorplan-app
# Multi-stage build for optimal image size

FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY floorplan-app/package.json ./floorplan-app/
COPY floorplan-viewer-core/package.json ./floorplan-viewer-core/
COPY floorplan-3d-core/package.json ./floorplan-3d-core/
COPY floorplan-common/package.json ./floorplan-common/
COPY floorplan-language/package.json ./floorplan-language/

# Install dependencies
RUN npm ci --omit=dev

# Copy source
COPY . .

# Build all required packages
RUN npm run build --workspace floorplan-common
RUN npm run build --workspace floorplan-3d-core
RUN npm run build --workspace floorplan-viewer-core
RUN npm run build --workspace floorplan-app

# Production stage
FROM node:24-alpine

WORKDIR /app

# Copy built artifacts and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/floorplan-app/.output ./floorplan-app/.output
COPY --from=builder /app/floorplan-app/package.json ./floorplan-app/

# Expose production port
EXPOSE 3000

# Start production server
CMD ["npm", "run", "--workspace", "floorplan-app", "start"]
