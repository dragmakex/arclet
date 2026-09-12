FROM oven/bun:1.3.0-alpine AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile && bun run build
ENV NODE_ENV=production
USER bun
EXPOSE 3000
CMD ["bun", "--filter", "@arclet/web", "start"]
