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
        try {
            ws.send(JSON.stringify({type: 'error', message: 'channelId is required for join-voice.'}));
        } catch (e) {
            logger.error('[handleJoinVoice] ws.send error:', e);
        }
        return;
    }
    const { channelId } = payload;

    try {
        const currentVoiceChannel = RoomManager.getUserCurrentVoiceChannel(clientId);
        if (currentVoiceChannel && currentVoiceChannel !== channelId) {
            RoomManager.leaveVoiceChannel(currentVoiceChannel, clientId);
            try {
                publisher().publish(REDIS_CHANNEL_NAME, JSON.stringify({
                    eventType: EVENT.VOICE_USER_LEFT,
                    payload: { channelId: currentVoiceChannel, userId: clientId, userName: clientName },
                    originalSenderWsId: clientId
                }));
                logger.info(`User ${clientId} left old voice channel ${currentVoiceChannel} (via switch).`);
            } catch (e) {
                logger.error('[handleJoinVoice] publish VOICE_USER_LEFT error:', e);
            }
        }

        RoomManager.joinVoiceChannel(channelId, clientId, clientName);
        const usersInChannel = RoomManager.getUsersInVoiceChannel(channelId).map(u => ({ userId: u.id, userName: u.name }));

        try {
            ws.send(JSON.stringify({
                type: EVENT.VOICE_CHANNEL_STATUS,
                channelId: channelId,
                users: usersInChannel
            }));
        } catch (e) {
            logger.error('[handleJoinVoice] ws.send VOICE_CHANNEL_STATUS error:', e);
        }

        try {
            publisher().publish(REDIS_CHANNEL_NAME, JSON.stringify({
                eventType: EVENT.VOICE_USER_JOINED,
                payload: { channelId: channelId, userId: clientId, userName: clientName },
                originalSenderWsId: clientId
            }));
            logger.info(`User ${clientId} (${clientName}) joined voice channel ${channelId}. Published to Redis.`);
        } catch (e) {
            logger.error('[handleJoinVoice] publish VOICE_USER_JOINED error:', e);
        }

        broadcastVoiceChannelMembers();
    } catch (e) {
        logger.error('[handleJoinVoice] error:', e, payload);
    }
}

function handleLeaveVoice(ws, payload) {
    const clientId = ws.id;
    const clientName = clientId;

    if (!payload || !payload.channelId) {
        logger.warn(`Client ${clientId} tried to leave voice without channelId.`);
        try {
            ws.send(JSON.stringify({ type: 'error', message: 'channelId is required for leave-voice.' }));
        } catch (e) {
            logger.error('[handleLeaveVoice] ws.send error:', e);
        }
        return;
    }
    const { channelId } = payload;
    try {
        const { userWasInChannel, userName } = RoomManager.leaveVoiceChannel(channelId, clientId);

        if (userWasInChannel) {
            try {
                publisher().publish(REDIS_CHANNEL_NAME, JSON.stringify({
                    eventType: EVENT.VOICE_USER_LEFT,
                    payload: { channelId: channelId, userId: clientId, userName: userName || clientName },
                    originalSenderWsId: clientId
                }));
                logger.info(`User ${clientId} (${userName || clientName}) left voice channel ${channelId}. Published to Redis.`);
            } catch (e) {
                logger.error('[handleLeaveVoice] publish VOICE_USER_LEFT error:', e);
            }
        } else {
            logger.warn(`User ${clientId} tried to leave voice channel ${channelId} but was not in it or channel did not exist.`);
        }
        broadcastVoiceChannelMembers();
    } catch (e) {
        logger.error('[handleLeaveVoice] error:', e, payload);
    }
}

function broadcastVoiceChannelMembers() {
    try {
        const allVoiceChannelMembers = {};
        const voiceChannelIds = ['voice1', 'voice2'];
        voiceChannelIds.forEach(cid => {
            allVoiceChannelMembers[cid] = RoomManager.getUsersInVoiceChannel(cid);
        });

        publisher().publish(REDIS_CHANNEL_NAME, JSON.stringify({
            eventType: EVENT.VOICE_CHANNEL_MEMBERS_UPDATE,
            payload: { members: allVoiceChannelMembers },
            originalSenderWsId: null
        }));
        logger.info("Published VOICE_CHANNEL_MEMBERS_UPDATE to Redis.");
    } catch (e) {
        logger.error('[broadcastVoiceChannelMembers] error:', e);
    }
}

module.exports = {
    handleJoinVoice,
    handleLeaveVoice,
    broadcastVoiceChannelMembers
};