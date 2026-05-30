FROM node:18-alpin

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install


COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]