FROM node:22-alpine

WORKDIR /app

# Install client deps and build
COPY client/package*.json ./client/
RUN npm install --prefix client
COPY client/ ./client/
RUN npm run build --prefix client

# Install server deps
COPY server/package*.json ./server/
RUN npm install --prefix server

# Copy server source
COPY server/ ./server/

EXPOSE 3001
ENV PORT=3001
CMD ["node", "--experimental-sqlite", "server/src/index.js"]
