FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY shared/package.json shared/
COPY api/package.json api/
COPY client/package.json client/
RUN npm ci --workspace=api --omit=dev

RUN rm -rf /usr/local/lib/node_modules/npm

COPY shared/ shared/
COPY api/ api/

RUN mkdir -p /data/uploads && chown node:node /data/uploads

ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA

WORKDIR /app/api
USER node
EXPOSE 4000
CMD ["node", "src/boot.js"]
