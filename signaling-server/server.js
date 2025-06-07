const WebSocket = require('ws');
const config = require('./config');
const ClientManager = require('./managers/ClientManager');
const handleMessage = require('./handlers/messageHandler');
const logger = require('./utils/logger');
const EVENT = require('./constants/events');

const wsServer = new WebSocket.Server({port: config.PORT});
logger.info(`Server started on ws://localhost:${config.PORT}`);

wsServer.on('connection', (ws) => {
        //建立client id
        console.log("Connection in.");

        const id = ClientManager.addClient(ws);
        const userList = Object.keys(ClientManager.getAllClients()).filter(uid => uid !== id);
        ws.send(JSON.stringify({ type: EVENT.WELCOME, id, userList }));

        ClientManager.broadcast({
            type: EVENT.USER_JOINED,
            id,
            message: `(${id} 已加入聊天室)`
        });

        ws.on("message", (data)=>
        {
            handleMessage(ws, data);
        });

        ws.on('close', () => {
                ClientManager.removeClient(ws);
                ClientManager.broadcast({
                    type: EVENT.USER_LEFT,
                    id,
                    message: `(${id} 已離開聊天室)`
                });
            });

    });