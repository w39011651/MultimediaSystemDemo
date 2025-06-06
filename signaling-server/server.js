const WebSocket = require('ws');
const config = require('./config');
const ClientManager = require('./managers/ClientManager');
const handleMessage = require('./handlers/messageHandler');
const logger = require('./utils/logger');

const wsServer = new WebSocket.Server({port: config.PORT});
logger.info(`Server started on ws://localhost:${config.PORT}`);

wsServer.on('connection', (ws) => {
        //建立client id
        console.log("Connection in.");

        const id = ClientManager.addClient(ws);
        const userList = Object.keys(ClientManager.getAllClients()).filter(uid => uid !== id);
        ws.send(JSON.stringify({ type: "welcome", id, userList }));

        //broadcast({ type: "user-joined", id });

        ws.on("message", (data)=>
        {
            handleMessage(ws, data);
        });

        ws.on('close', () => {
                ClientManager.removeClient(ws);
            });

    });