const ClientManager = require('../managers/ClientManager'); // 仍用於獲取特定客戶端 (例如 WebRTC 信令)
const logger = require('../utils/logger');
const db = require('../utils/db');
const EVENT = require('../constants/events');
const roomHandler = require('./roomHandler');
const { publisher } = require('../utils/redisClient'); // 引入 Redis publisher 

// 定義 Redis Pub/Sub 頻道名稱，與 server.js 中的頻道名稱一致 
const REDIS_CHANNEL_NAME = 'chat_messages';

module.exports = function(ws, data, clientId) { // 接收 clientId 參數
    let obj = null;
    try {
        obj = JSON.parse(data.toString('utf-8'));
    } catch (e) {
        logger.error("非JSON字串", data);
        return;
    }

    // const clientId = ws.id; // 已從 server.js 傳入，無需再次定義
    const clientName = clientId; // temp

    let eventTypeToPublish = null; // 用於標記是否需要發布到 Redis
    let payloadToPublish = null; // 發布到 Redis 的內容

    try {
        switch (obj.type)
        {
            case EVENT.TEXT_MESSAGE: // 文字訊息
                if (obj.channelId && obj.text) {
                    const messageToSend = {
                        type: 'text-message',
                        text: obj.text,
                        channelId: obj.channelId,
                        fromId: ws.id,
                        timestamp: new Date().toISOString()
                    };

                    db.saveMessage({
                        channelId: obj.channelId,
                        fromId: ws.id,
                        text: obj.text,
                        timestamp: messageToSend.timestamp
                    });

                    // 將 TEXT_MESSAGE 事件發布到 Redis，而不是直接本地廣播 
                    eventTypeToPublish = EVENT.TEXT_MESSAGE;
                    payloadToPublish = messageToSend; // 使用完整訊息作為 payload 

                    // 原來的 Object.values(ClientManager.getAllClients()).forEach(...) 邏輯將被 Redis Pub/Sub 取代 
                }
                break;

            case EVENT.JOIN_VOICE: // 加入語音頻道
                // roomHandler 內部將處理本地 RoomManager 狀態更新，並發布相關事件到 Redis 
                roomHandler.handleJoinVoice(ws, obj.payload);
                break;

            case EVENT.LEAVE_VOICE: // 離開語音頻道
                // roomHandler 內部將處理本地 RoomManager 狀態更新，並發布相關事件到 Redis 
                roomHandler.handleLeaveVoice(ws, obj.payload);
                break;

            case EVENT.GET_HISTORY: // 獲取歷史訊息，這是單點回覆，不需要 Redis 
                if (obj.channelId) {
                    db.getMessages(obj.channelId, (err, rows) => {
                        if (err) {
                            logger.error("查詢歷史訊息失敗", err);
                            ws.send(JSON.stringify({ type: "history", channelId: obj.channelId, messages: [] }));
                        } else {
                            ws.send(JSON.stringify({ type: "history", channelId: obj.channelId, messages: rows }));
                        }
                    });
                }
                break; // 確保有 break，防止 fall-through 

            default: // SDP offer/answer/candidate (WebRTC 信令)
                // WebRTC 信令通常是點對點 (peer-to-peer) 的，需要轉發給特定的 toId 
                // 如果 targetId 在當前 Pod 上，則直接轉發 
                if (obj.toId && typeof obj.toId === 'string') {
                    const targetClient = ClientManager.getClient(obj.toId);
                    if (targetClient && targetClient.readyState === WebSocket.OPEN) {
                        targetClient.send(JSON.stringify({ ...obj, fromId: ws.id }));
                        logger.info(`WebRTC Signal sent from ${ws.id} to ${obj.toId} directly.`);
                    } else {
                        // 如果目標客戶端不在當前 Pod，則通過 Redis 轉發 
                        // 需要確保 Redis 訂閱端能根據 toId 進行過濾並轉發給正確的 Pod 
                        eventTypeToPublish = obj.type;
                        payloadToPublish = { ...obj, fromId: ws.id }; // payload 包含 toId 和其他信令資料 
                        logger.info(`WebRTC Signal for ${obj.toId} published to Redis.`);
                    }
                } else {
                    logger.warn(`Invalid or missing toId in WebRTC signal from ${ws.id}.`);
                }
                break;
        }
    } catch (error) {
        logger.error('[messageHandler] error:', error, 'obj:', obj);
    }

    // 如果事件需要廣播，則發布到 Redis
    if (eventTypeToPublish && payloadToPublish) {
        try {
            publisher().publish(REDIS_CHANNEL_NAME, JSON.stringify({
                eventType: eventTypeToPublish,
                payload: payloadToPublish,
                originalSenderWsId: clientId
            }));
        } catch (error) {
            logger.error('[messageHandler] publish to Redis error:', error, eventTypeToPublish, payloadToPublish);
        }
        // logger.debug(`Published ${eventTypeToPublish} from ${clientId} to Redis.`);
    }
};