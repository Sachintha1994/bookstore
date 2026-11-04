# syntax=docker/dockerfile:1

# ---- deps: install production dependencies only, cached separately from source ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- runtime ----
FROM node:22-alpine AS runtime
RUN apk add --no-cache dumb-init \
  && addgroup -S appgroup \
  && adduser -S appuser -G appgroup

WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY scripts ./scripts

# SQLite data directory: mounted as a volume for persistence, owned by the
# non-root runtime user so better-sqlite's WAL files can be written.
RUN mkdir -p /app/data && chown -R appuser:appgroup /app

USER appuser

EXPOSE 4000
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 4000) + '/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "--no-warnings=ExperimentalWarning", "src/server.js"]
