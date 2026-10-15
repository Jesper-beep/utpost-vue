FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY shared/package.json shared/
COPY api/package.json api/
COPY client/package.json client/
COPY web/package.json web/
RUN npm ci --workspace=api --omit=dev

COPY shared/ shared/
COPY api/ api/

RUN mkdir -p /data/uploads && chown node:node /data/uploads

WORKDIR /app/api
USER node
EXPOSE 4000
CMD ["node", "src/index.js"]
