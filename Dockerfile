FROM node:22-alpine

WORKDIR /app

# Copy workspace manifests and root lockfile
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install all workspace deps from root lockfile
RUN npm ci

# Copy source
COPY client/ ./client/
COPY server/ ./server/

# Build client
RUN npm run build --prefix client

EXPOSE 3001
CMD ["node", "--experimental-sqlite", "server/src/index.js"]
