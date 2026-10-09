FROM node:24-slim

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

WORKDIR /app/client
EXPOSE 3001
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3001"]
