FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig*.json ./
COPY src ./src
COPY scripts/generate-third-party-notices.mjs ./scripts/generate-third-party-notices.mjs
RUN npm run build && npm run docs:notices -- --production

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node init.sql ./init.sql
COPY --chown=node:node src/assets ./src/assets
COPY --chown=node:node LICENSE ./LICENSE
COPY --from=build --chown=node:node /app/THIRD_PARTY_NOTICES.md ./THIRD_PARTY_NOTICES.md
USER node
CMD ["node", "--dns-result-order=ipv4first", "dist/main.js"]
