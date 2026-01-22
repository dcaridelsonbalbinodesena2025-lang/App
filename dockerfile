# Usa a imagem oficial do Node.js 18
FROM node:18

# Define o diretório de trabalho dentro do container
WORKDIR /usr/src/app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências (incluindo o novo socket.io)
RUN npm install

# Copia todo o código do servidor para o container
COPY . .

# Expõe a porta 3000 (a mesma que você definiu no server.js)
EXPOSE 3000

# Comando para iniciar o servidor
CMD [ "npm", "start" ]
