const WebSocket = require('ws');
const config = require('./config');
const ClientManager = require('./managers/ClientManager');
const handleMessage = require('./handlers/messageHandler');
const logger = require('./utils/logger');
const EVENT = require('./constants/events');
const db = require('./utils/db');

const wsServer = new WebSocket.Server({port: config.PORT});
logger.info(`Server started on ws://localhost:${config.PORT}`);

wsServer.on('connection', (ws) => {
        //建立client id
        console.log("Connection in.");

        const id = ClientManager.addClient(ws);
        const userList = Object.keys(ClientManager.getAllClients()).filter(uid => uid !== id);
        ws.send(JSON.stringify({ type: EVENT.WELCOME, id, userList }));

        // 發送 general 頻道歷史訊息
        db.all('SELECT channel, nickname, text, timestamp FROM messages WHERE channel = ? ORDER BY id ASC', ['general'], (err, rows) => {
            if (!err && rows) {
                rows.forEach(msg => {
                    ws.send(JSON.stringify({
                        type: 'chat',
                        channel: msg.channel,
                        nickname: msg.nickname,
                        text: msg.text,
                        timestamp: msg.timestamp
                    }));
                });
            }
        });

        ClientManager.broadcast({ type: EVENT.USER_JOINED, id });

        ws.on("message", (data)=>
        {
            handleMessage(ws, data);
        });

        ws.on('close', () => {
                ClientManager.removeClient(ws);
            });

    });