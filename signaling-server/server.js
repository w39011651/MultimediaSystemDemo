const WebSocket = require('ws');
const config = require('./config');
const ClientManager = require('./managers/ClientManager');
const handleMessage = require('./handlers/messageHandler');
const logger = require('./utils/logger');
const EVENT = require('./constants/events');
const RoomManager = require('./managers/RoomManager');

const wsServer = new WebSocket.Server({port: config.PORT});
logger.info(`Server started on ws://localhost:${config.PORT}`);

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
    });
});