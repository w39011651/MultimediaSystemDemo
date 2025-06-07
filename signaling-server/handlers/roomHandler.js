const EVENT = require('../constants/events');
const RoomManager = require('../managers/RoomManager');
const logger = require('../utils/logger');
const ClientManager = require('../managers/ClientManager');

function handleJoinVoice(ws, payload){
    const clientId = ws.id;
    const clientName = clientId;

    if (!payload || !payload.channelId){
        logger.warn(`Client ${clientId} tried to join voice without channelId.`);
        ws.send(JSON.stringify({type: 'error', message: 'channelId is required for join-voice.'}));
        return;
    }
    const { channelId } = payload;

    const currentVoiceChannel = RoomManager.getUserCurrentVoiceChannel(clientId);
    if (currentVoiceChannel && currentVoiceChannel !== channelId) {
        RoomManager.leaveVoiceChannel(currentVoiceChannel, clientId);

        const oldChannelUsers = RoomManager.getUserCurrentVoiceChannel(currentVoiceChannel);
        if (oldChannelUsers)//房間還有人才廣播
        {
            oldChannelUsers.forEach(userInOldChannel => {
            const clientSocket = ClientManager.getClient(userInOldChannel.id);
            if (clientSocket && clientSocket.id !== clientId) {
                clientSocket.send(JSON.stringify({
                    type: EVENT.VOICE_USER_LEFT,
                    channelId: currentVoiceChannel,
                    userId: clientId,
                    userName: clientName
                }));
            }
            })
        }
    }   

    RoomManager.joinVoiceChannel(channelId, clientId, clientName);
    const usersInChannel = RoomManager.getUsersInVoiceChannel(channelId).map(u => ({ userId: u.id, userName: u.name }));

    // 回傳給加入者，告知頻道狀態和成員列表
    ws.send(JSON.stringify({
        type: EVENT.VOICE_CHANNEL_STATUS,
        channelId: channelId,
        users: usersInChannel
    }));

    // 廣播給該語音頻道的其他成員，告知新使用者加入
    usersInChannel.forEach(user => {
        if (user.userId !== clientId) {
            const clientSocket = ClientManager.getClient(user.userId);
            if (clientSocket) {
                clientSocket.send(JSON.stringify({
                    type: EVENT.VOICE_USER_JOINED,
                    channelId: channelId,
                    userId: clientId,
                    userName: clientName
                }));
            }
        }
    });
    logger.info(`User ${clientId} (${clientName}) joined voice channel ${channelId}`);
}

function handleLeaveVoice(ws, payload) {
    const clientId = ws.id;
    const clientName = clientId; // 暫時使用 ID 作為名稱

    if (!payload || !payload.channelId) {
        logger.warn(`Client ${clientId} tried to leave voice without channelId.`);
        ws.send(JSON.stringify({ type: 'error', message: 'channelId is required for leave-voice.' }));
        return;
    }
    const { channelId } = payload;
    const { userWasInChannel, userName } = RoomManager.leaveVoiceChannel(channelId, clientId);

    if (userWasInChannel) {
        // 廣播給該語音頻道的其他成員，告知使用者離開
        const remainingUsers = RoomManager.getUsersInVoiceChannel(channelId);
        remainingUsers.forEach(user => {
            const clientSocket = ClientManager.getClient(user.id);
            if (clientSocket) {
                clientSocket.send(JSON.stringify({
                    type: EVENT.VOICE_USER_LEFT,
                    channelId: channelId,
                    userId: clientId,
                    userName: userName || clientName
                }));
            }
        });
        logger.info(`User ${clientId} (${userName || clientName}) left voice channel ${channelId}`);
        // 可以選擇性地回傳給離開者確認
        // ws.send(JSON.stringify({ type: 'you_left_voice_confirmation', channelId }));
    } else {
        logger.warn(`User ${clientId} tried to leave voice channel ${channelId} but was not in it or channel did not exist.`);
    }
}

module.exports = {
    handleJoinVoice,
    handleLeaveVoice,
};