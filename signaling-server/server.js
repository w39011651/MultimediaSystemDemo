const WebSocket = require('ws');
const config = require('./config');
const ClientManager = require('./managers/ClientManager');
const handleMessage = require('./handlers/messageHandler');
const logger = require('./utils/logger');
const EVENT = require('./constants/events');
const RoomManager = require('./managers/RoomManager');
const roomHandler = require('./handlers/roomHandler');
const { Http2ServerRequest } = require('http2');
const http = require('http');

// 1. 建立一個標準的 HTTP 伺服器
const server = http.createServer((req, res) => {
    // 這裡可以處理非 WebSocket 的請求
    // 例如，一個簡單的健康檢查端點
    if (req.url === '/healthz') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

const wsServer = new WebSocket.Server({ server });
logger.info(`Server started on ws://localhost:${config.PORT}`);

server.listen(config.PORT, () => {
    logger.info(`Server started on ws://localhost:${config.PORT}`);
    logger.info(`HTTP server listening on port ${config.PORT}`);
});

wsServer.on('connection', (ws) => {
    console.log("Connection in.");
    const id = ClientManager.addClient(ws);
    const userList = Object.keys(ClientManager.getAllClients()).filter(uid => uid !== id);

    // 新增：取得所有語音頻道成員
    const allVoiceChannelMembers = {};
    const voiceChannelIds = ['voice1', 'voice2'];
    voiceChannelIds.forEach(cid => {
        // 這裡回傳的是 [{id, name}, ...]
        allVoiceChannelMembers[cid] = RoomManager.getUsersInVoiceChannel(cid);
    });

    //console.log('WELCOME allVoiceChannelMembers:', allVoiceChannelMembers);
    ws.send(JSON.stringify({
        type: EVENT.WELCOME,
        id,
        userList,
        voiceChannelMembers: allVoiceChannelMembers
    }));

    ClientManager.broadcast({
        type: EVENT.USER_JOINED,
        id,
        message: `(${id} 已加入聊天室)`
    });

    ws.on("message", (data)=>
    {
        handleMessage(ws, data);
    });

    ws.on('close', () => 
    {
        ClientManager.removeClient(ws);
        //使用者斷線後，廣播通知其斷線
        const leftVoiceChannels = RoomManager.removeUserFromAllVoiceChannels(id);
        leftVoiceChannels.forEach(info => {
            const remainingUsers = RoomManager.getUsersInVoiceChannel(info.channelId);
            remainingUsers.forEach(user => {
                const clientSocket = ClientManager.getClient(user.id);
                if (clientSocket) {
                    clientSocket.send(JSON.stringify({
                        type: EVENT.VOICE_USER_LEFT,
                        channelId: info.channelId,
                        userId: id,
                        userName: info.userName || id
                    }));
                }
            });
        });

        ClientManager.broadcast({ type: EVENT.USER_LEFT, id, message: `(${id} 已離開聊天室)`});
        roomHandler.broadcastVoiceChannelMembers();
    });
});