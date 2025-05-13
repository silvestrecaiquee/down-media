# Etapa 1: Build com TypeScript
FROM node:22.12.0-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Etapa 2: Imagem final apenas com JS compilado
FROM node:22.12.0-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist/public ./dist/public
COPY --from=builder /app/dist/views ./dist/views

ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/index.js"]
