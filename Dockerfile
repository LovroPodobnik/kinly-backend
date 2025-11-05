# Use Bun official image
FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
COPY apps/api/package.json ./apps/api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY turbo.json ./

# Install dependencies, skip optional (this skips better-sqlite3 compilation)
RUN bun install --frozen-lockfile --no-optional || bun install --frozen-lockfile

# Copy source code
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start the application directly from source
CMD ["bun", "run", "apps/api/src/index.ts"]
