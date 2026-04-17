# Use Node 22 on Debian Bookworm (has glibc 2.36)
# Build and run in the SAME base image so native modules always match
FROM node:22-bookworm-slim

# Install build tools needed to compile sqlite3 and bcrypt from source
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package.json package-lock.json .npmrc ./

# Install dependencies - native modules will compile from source
# thanks to .npmrc (build-from-source=sqlite3)
# We also rebuild bcrypt to be safe
RUN npm ci --include=dev && npm rebuild bcrypt --build-from-source

# Copy the rest of the application
COPY . .

# Expose the port (Railway sets PORT env var automatically)
EXPOSE ${PORT:-3456}

# Start the application
CMD ["node", "main.js"]
