FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY shared/package.json shared/
COPY api/package.json api/
COPY client/package.json client/
COPY web/package.json web/
RUN npm ci --workspace=web

COPY web/ web/
RUN npm run build --workspace=web

WORKDIR /app/web
EXPOSE 3000
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]
