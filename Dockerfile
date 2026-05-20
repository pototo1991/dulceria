FROM node:20-alpine

WORKDIR /app

# Instalar dependencias para compilar sqlite3 en Alpine si fuera necesario
RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm install

COPY . .

# Construir el CSS de Tailwind antes de iniciar
RUN npm run build:css

EXPOSE 3000

CMD ["npm", "start"]
