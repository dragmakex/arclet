FROM oven/bun:1.3.0-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_PRIVY_APP_ID
ENV NEXT_PUBLIC_PRIVY_APP_ID=$NEXT_PUBLIC_PRIVY_APP_ID
COPY package.json bun.lock tsconfig.json tsconfig.base.json ./
COPY apps/web ./apps/web
COPY packages ./packages
COPY config ./config
RUN bun install --frozen-lockfile && bun run build

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
USER bun
EXPOSE 3000
CMD ["bun", "--filter", "@arclet/web", "start"]
