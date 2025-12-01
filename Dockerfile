FROM oven/bun:1-alpine
RUN apk add --no-cache curl
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
# Copies the whole app excluding whats in the .dockerignore
COPY . .
# Run the application when container starts
CMD ["bun", "run", "index.js"]
