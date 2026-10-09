FROM node:24-slim AS build

WORKDIR /app

COPY package.json package-lock.json .npmrc tsconfig.base.json ./
COPY shared/package.json shared/
COPY api/package.json api/
COPY client/package.json client/
COPY web/package.json web/
RUN npm ci --workspace=client

COPY shared/ shared/
COPY client/ client/
RUN npm run build --workspace=client

FROM nginxinc/nginx-unprivileged:stable-alpine-slim

ENV API_PROXY_TARGET=http://api:4000

COPY client/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY client/nginx/headers.conf /etc/nginx/headers.conf
COPY --from=build /app/client/dist /usr/share/nginx/html

EXPOSE 3001
