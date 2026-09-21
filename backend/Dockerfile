FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY src ./src
COPY tsconfig.json .
COPY drizzle.config.ts .

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["npm", "start"]
