FROM oven/bun:1.3.0-alpine
WORKDIR /app
COPY package.json bun.lock tsconfig.json tsconfig.base.json ./
COPY apps/worker ./apps/worker
COPY packages ./packages
COPY config ./config
RUN bun install --frozen-lockfile
USER bun
CMD ["bun", "apps/worker/src/index.ts"]
