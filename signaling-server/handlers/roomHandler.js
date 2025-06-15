const EVENT = require('../constants/events');
const RoomManager = require('../managers/RoomManager'); // 本地管理語音頻道狀態 
const logger = require('../utils/logger');
const ClientManager = require('../managers/ClientManager'); // 用於獲取特定客戶端 socket (不再用於廣播) 
const { publisher } = require('../utils/redisClient'); // 引入 Redis publisher 

// 定義 Redis Pub/Sub 頻道名稱，與 server.js 和 messageHandler.js 中的頻道名稱一致 
const REDIS_CHANNEL_NAME = 'chat_messages';

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
        // 用戶從一個語音頻道切換到另一個
        RoomManager.leaveVoiceChannel(currentVoiceChannel, clientId);

        // 將用戶離開舊頻道的事件發布到 Redis 
        publisher().publish(REDIS_CHANNEL_NAME, JSON.stringify({
            eventType: EVENT.VOICE_USER_LEFT,
            payload: { channelId: currentVoiceChannel, userId: clientId, userName: clientName },
            originalSenderWsId: clientId
        }));
        logger.info(`User ${clientId} left old voice channel ${currentVoiceChannel} (via switch).`);
    }   

    // 加入新的語音頻道
    RoomManager.joinVoiceChannel(channelId, clientId, clientName);
    const usersInChannel = RoomManager.getUsersInVoiceChannel(channelId).map(u => ({ userId: u.id, userName: u.name }));

    // 回傳給加入者，告知頻道狀態和成員列表 (這是單點回覆，不需要 Redis) 
    ws.send(JSON.stringify({
        type: EVENT.VOICE_CHANNEL_STATUS,
        channelId: channelId,
        users: usersInChannel
    }));

    // 將新用戶加入語音頻道的事件發布到 Redis 
    publisher().publish(REDIS_CHANNEL_NAME, JSON.stringify({
        eventType: EVENT.VOICE_USER_JOINED,
        payload: { channelId: channelId, userId: clientId, userName: clientName },
        originalSenderWsId: clientId
    }));
    logger.info(`User ${clientId} (${clientName}) joined voice channel ${channelId}. Published to Redis.`);

    // 觸發廣播所有語音頻道成員更新
    broadcastVoiceChannelMembers();
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
        // 將用戶離開語音頻道的事件發布到 Redis 
        publisher().publish(REDIS_CHANNEL_NAME, JSON.stringify({
            eventType: EVENT.VOICE_USER_LEFT,
            payload: { channelId: channelId, userId: clientId, userName: userName || clientName },
            originalSenderWsId: clientId
        }));
        logger.info(`User ${clientId} (${userName || clientName}) left voice channel ${channelId}. Published to Redis.`);
        // 可以選擇性地回傳給離開者確認 
        // ws.send(JSON.stringify({ type: 'you_left_voice_confirmation', channelId }));
    } else {
        logger.warn(`User ${clientId} tried to leave voice channel ${channelId} but was not in it or channel did not exist.`);
    }
    // 觸發廣播所有語音頻道成員更新
    broadcastVoiceChannelMembers();
}

function broadcastVoiceChannelMembers() {
    const allVoiceChannelMembers = {};
    const voiceChannelIds = ['voice1', 'voice2']; // 假設這些是您的語音頻道 ID
    voiceChannelIds.forEach(cid => {
        allVoiceChannelMembers[cid] = RoomManager.getUsersInVoiceChannel(cid);
    });

    // 將語音頻道成員更新事件發布到 Redis 
    publisher().publish(REDIS_CHANNEL_NAME, JSON.stringify({
        eventType: EVENT.VOICE_CHANNEL_MEMBERS_UPDATE,
        payload: { members: allVoiceChannelMembers },
        originalSenderWsId: null // 這個事件沒有特定的原始發送者，可以設為 null 或一個特殊標識 
    }));
    logger.info("Published VOICE_CHANNEL_MEMBERS_UPDATE to Redis.");
}

module.exports = {
    handleJoinVoice,
    handleLeaveVoice,
    broadcastVoiceChannelMembers
};