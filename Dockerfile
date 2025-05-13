# Etapa 1: Builder com todas as dependências
FROM node:22.12.0 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Etapa 2: Final com apenas produção
FROM node:22.12.0
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev 

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/index.js"]
