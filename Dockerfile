FROM node:24.12.0-bookworm-slim@sha256:7326fb2dbdce998edd72140946851be64ef4a643e8715e138ca467e8e9d92c99 AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install --global npm@11.6.2
WORKDIR /app

FROM base AS dependencies
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM dependencies AS build
COPY tsconfig.json tsconfig.build.json prisma.generate.config.ts prisma.config.ts app.ts server.ts paths.ts ./
COPY prisma ./prisma
COPY src ./src
RUN npm run build

FROM build AS verification
COPY eslint.config.js vitest.config.ts ./
COPY tests ./tests
COPY scripts ./scripts
RUN npm run lint && npm run typecheck
CMD ["npm", "run", "test:unit"]

FROM build AS migrate
USER node
CMD ["sh", "-ec", "npm run db:migrate:deploy && npm run db:seed"]

FROM base AS production-dependencies
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./package.json
USER node
EXPOSE 3000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=5s --timeout=4s --start-period=10s --retries=15 CMD node -e "fetch('http://127.0.0.1:3000/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
