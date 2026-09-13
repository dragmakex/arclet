FROM node:22.14.0-alpine AS circle-cli
WORKDIR /opt/circle
COPY ops/circle-cli/package.json ops/circle-cli/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts \
    && node -e "const [major, minor] = process.versions.node.split('.').map(Number); if (major < 20 || (major === 20 && minor < 18) || major >= 23) process.exit(1)" \
    && node node_modules/@circle-fin/cli/dist/index.js --version

FROM oven/bun:1.3.0-alpine
WORKDIR /app

# The external Circle CLI requires Node. Its package tree is locked in
# ops/circle-cli/package-lock.json and copied from the pinned Node 22 stage.
RUN apk add --no-cache libstdc++
COPY --from=circle-cli /usr/local/bin/node /usr/local/bin/node
COPY --from=circle-cli /opt/circle/node_modules /opt/circle/node_modules
RUN ln -s /opt/circle/node_modules/.bin/circle /usr/local/bin/circle \
    && test -x /usr/local/bin/circle

COPY package.json bun.lock tsconfig.json tsconfig.base.json ./
COPY apps/worker ./apps/worker
COPY packages ./packages
COPY config ./config
COPY scripts ./scripts
RUN bun install --frozen-lockfile

USER bun
CMD ["bun", "apps/worker/src/index.ts"]
