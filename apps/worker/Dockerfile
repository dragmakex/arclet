FROM oven/bun:1.3.0-alpine
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
USER bun
CMD ["bun", "apps/worker/src/index.ts"]
