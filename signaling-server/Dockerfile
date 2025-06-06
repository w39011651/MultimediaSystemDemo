FROM node:20.19.2

RUN npm install -g node-pre-gyp

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 8080
CMD [ "node", "server.js" ]
