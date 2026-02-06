FROM node:24-alpine

# Enable corepack and activate pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy only what's needed for installing dependencies
COPY package.json pnpm-lock.yaml* ./


# Install dependencies
RUN pnpm install

# Copy source files
COPY tsconfig.json ./
COPY .env ./
COPY drizzle.config.ts ./
COPY src ./src

COPY drizzle ./drizzle

# Start the app
CMD ["pnpm", "run", "dev"]
