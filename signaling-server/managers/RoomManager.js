const logger = require('../utils/logger');

// { voiceChannelId1: { userId1: { id: 'userId1', name: 'User Name 1' }, userId2: { id: 'userId2', name: 'User Name 2'} }, ... }
const voiceChannelMembers = {};

module.exports = {
    joinVoiceChannel(channelId, userId, userName) {
        if (!voiceChannelMembers[channelId]) {
            voiceChannelMembers[channelId] = {};
        }
        if (!voiceChannelMembers[channelId][userId]) {
            voiceChannelMembers[channelId][userId] = { id: userId, name: userName || userId };
            logger.info(`User ${userId} (${userName}) joined voice channel ${channelId}`);
            //console.log('[RoomManager] voiceChannelMembers:', JSON.stringify(voiceChannelMembers));
            return true; // 表示成功加入或已在頻道中
        }
        logger.info(`User ${userId} (${userName}) was already in voice channel ${channelId}`);
        return false; // 表示使用者已在頻道中
    },

    leaveVoiceChannel(channelId, userId) {
        if (voiceChannelMembers[channelId] && voiceChannelMembers[channelId][userId]) {
            const userName = voiceChannelMembers[channelId][userId].name;
            delete voiceChannelMembers[channelId][userId];
            if (Object.keys(voiceChannelMembers[channelId]).length === 0) {
                delete voiceChannelMembers[channelId]; // 如果頻道空了，可以刪除頻道記錄
            }
            logger.info(`User ${userId} (${userName}) left voice channel ${channelId}`);
            return { userId, userName, channelId, userWasInChannel: true };
        }
        logger.warn(`User ${userId} tried to leave voice channel ${channelId} but was not found.`);
        return { userId, channelId, userWasInChannel: false };
    },

    // 當使用者完全斷線時，將其從所有語音頻道移除
    removeUserFromAllVoiceChannels(userId) {
        const leftChannels = [];
        for (const channelId in voiceChannelMembers) {
            if (voiceChannelMembers[channelId][userId]) {
                const { userName } = voiceChannelMembers[channelId][userId];
                delete voiceChannelMembers[channelId][userId];
                logger.info(`User ${userId} (${userName}) removed from voice channel ${channelId} due to disconnect.`);
                leftChannels.push({ channelId, userId, userName });
                if (Object.keys(voiceChannelMembers[channelId]).length === 0) {
                    delete voiceChannelMembers[channelId];
                }
            }
        }
        return leftChannels; // 返回使用者離開的頻道列表，以便廣播
    },

    getUsersInVoiceChannel(channelId) {
        return voiceChannelMembers[channelId] ? Object.values(voiceChannelMembers[channelId]) : [];
    },

    // 獲取使用者所在的語音頻道 ID (假設一個使用者一次只能在一個語音頻道)
    getUserCurrentVoiceChannel(userId) {
        for (const channelId in voiceChannelMembers) {
            if (voiceChannelMembers[channelId][userId]) {
                return channelId;
            }
        }
        return null;
    }
};