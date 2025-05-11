# Imagem base com Node.js
FROM node:20-slim

# Instalar dependências necessárias para o OpenVPN
RUN apt-get update && apt-get install -y \
    openvpn \
    && rm -rf /var/lib/apt/lists/*

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de configuração
COPY package*.json ./
COPY tsconfig*.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY src/ ./src/

# Copiar script de inicialização
COPY start.sh ./
RUN chmod +x start.sh

# Compilar TypeScript
RUN npm run build

# Expor porta da aplicação
EXPOSE 3018

# Comando para iniciar a aplicação
CMD ["./start.sh"] 