const WebSocket = require('ws');
const config = require('./config');
const ClientManager = require('./managers/ClientManager'); // 管理連接到 '這個' Pod 的客戶端
const handleMessage = require('./handlers/messageHandler'); // 處理客戶端傳入訊息，將發布到 Redis
const logger = require('./utils/logger');
const EVENT = require('./constants/events');
const RoomManager = require('./managers/RoomManager'); // 負責語音頻道本地狀態管理
// const { Http2ServerRequest } = require('http2'); // 這行似乎是多餘的，已註解掉
const http = require('http');
const { publisher, subscriber } = require('./utils/redisClient'); // 引入 Redis 客戶端

// 定義 Redis Pub/Sub 頻道名稱，所有廣播事件都將通過這個頻道
const REDIS_CHANNEL_NAME = 'chat_messages';

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
logger.info(`WebSocket server initialized.`);

server.listen(config.PORT, () => {
    logger.info(`Server listening on port ${config.PORT}`);
    logger.info(`HTTP server listening on port ${config.PORT}`);
});

// --- Redis Pub/Sub 訂閱處理 ---
// 當從 Redis 收到訊息時，將其轉發給連接到當前這個 Pod 的所有相關客戶端
subscriber().subscribe(REDIS_CHANNEL_NAME, (redisMessage) => {
    logger.info(`[Redis Pub/Sub] Received message from channel '${REDIS_CHANNEL_NAME}':`, redisMessage);
    try {
        const msgObj = JSON.parse(redisMessage);
        const { eventType, payload, originalSenderWsId } = msgObj; // 包含原始發送者的 ID

        // 遍歷所有連接到當前 Pod 的客戶端
        Object.values(ClientManager.getAllClients()).forEach(client => {
            let messageToSend;
            // 根據從 Redis 接收到的 eventType 和 payload 構造 WebSocket 訊息
            switch (eventType) {
                case EVENT.TEXT_MESSAGE:
                    messageToSend = { type: EVENT.TEXT_MESSAGE, ...payload }; // <<--- 展開 payload
                    break;
                case EVENT.USER_JOINED:
                    messageToSend = { type: EVENT.USER_JOINED, ...payload };
                    break;
                case EVENT.USER_LEFT:
                    messageToSend = { type: EVENT.USER_LEFT, ...payload };
                    break;
                case EVENT.VOICE_USER_JOINED:
                    messageToSend = { type: EVENT.VOICE_USER_JOINED, ...payload };
                    break;
                case EVENT.VOICE_USER_LEFT:
                    messageToSend = { type: EVENT.VOICE_USER_LEFT, ...payload };
                    break;
                case EVENT.VOICE_CHANNEL_MEMBERS_UPDATE: // 用於廣播語音頻道成員更新
                    messageToSend = { type: EVENT.VOICE_CHANNEL_MEMBERS_UPDATE, ...payload };
                    break;
                case EVENT.OFFER:
                case EVENT.ANSWER:
                case EVENT.CANDIDATE:
                    // WebRTC 信令需要發送給特定的 targetUserId
                    // 這裡需要判斷 current client.id 是否為 payload.targetUserId
                    if (client.id === payload.targetUserId) {
                        messageToSend = { type: eventType, ...payload };
                    } else {
                        // 如果不是目標用戶，則不發送此信令
                        return;
                    }
                    break;
                // ... 處理其他需要廣播的事件類型
                default:
                    logger.warn(`[Redis Pub/Sub] Unknown event type received: ${eventType}`);
                    return;
            }

            if (messageToSend && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(messageToSend));
                // logger.debug(`[Redis Pub/Sub] Sent ${eventType} to client ${client.id}`);
            }
        });

    } catch (e) {
        logger.error('[Redis Pub/Sub] Error parsing or handling message from Redis:', e);
    }
});

function safeSend(ws, data) {
    try {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(data));
        }
    } catch (e) {
        logger.error('[safeSend] ws.send error:', e, 'data:', data);
    }
}

// --- WebSocket 連線處理 ---
wsServer.on('connection', (ws) => {
    console.log("Connection in."); // 應該使用 logger.info
    const id = ClientManager.addClient(ws); // 給新連接的客戶端一個唯一的 ID
    logger.info(`Client ${id} connected.`);

    // 初始化訊息只發送給新連接的客戶端，不需要透過 Redis
    try {
        // 初始化訊息
        const userList = Object.keys(ClientManager.getAllClients()).filter(uid => uid !== id);
        const allVoiceChannelMembers = {};
        const voiceChannelIds = ['voice1', 'voice2'];
        voiceChannelIds.forEach(cid => {
            allVoiceChannelMembers[cid] = RoomManager.getUsersInVoiceChannel(cid);
        });

        safeSend(ws, {
            type: EVENT.WELCOME,
            id,
            userList,
            voiceChannelMembers: allVoiceChannelMembers
        });
    } catch (e) {
        logger.error('[connection] send WELCOME error:', e);
    }

    // 新用戶加入時，將 USER_JOINED 事件發布到 Redis，以便所有 Pods 廣播給各自的客戶端
    publisher().publish(REDIS_CHANNEL_NAME, JSON.stringify({
        eventType: EVENT.USER_JOINED,
        payload: { id: id, message: `(${id} 已加入聊天室)` },
        originalSenderWsId: id // 原始發送者 ID
    }));

    ws.on("message", (data) => {
        // 客戶端傳來的訊息交給 handleMessage 處理
        // handleMessage 將負責將需要廣播的訊息發布到 Redis
        try {
            handleMessage(ws, data, id); // 將客戶端 ID 傳入
        } catch (error) {
            logger.error(`[ws.on('message')] error:`, error, 'data:', data);
        }
    });

    ws.on('close', () => {
        logger.info(`Client ${id} disconnected.`);
        ClientManager.removeClient(id); // 傳入 ID 移除客戶端

        // 處理用戶離開語音頻道，並將 VOICE_USER_LEFT 事件發布到 Redis
        const leftVoiceChannels = RoomManager.removeUserFromAllVoiceChannels(id);
        leftVoiceChannels.forEach(info => {
            publisher().publish(REDIS_CHANNEL_NAME, JSON.stringify({
                eventType: EVENT.VOICE_USER_LEFT,
                payload: { channelId: info.channelId, userId: id, userName: info.userName || id },
                originalSenderWsId: id
            }));
        });

        // 用戶斷線後，將 USER_LEFT 事件發布到 Redis
        publisher().publish(REDIS_CHANNEL_NAME, JSON.stringify({
            eventType: EVENT.USER_LEFT,
            payload: { id: id, message: `(${id} 已離開聊天室)` },
            originalSenderWsId: id
        }));

        // 原來的 roomHandler.broadcastVoiceChannelMembers() 
        // 現在應該被整合到 Pub/Sub 機制中，或由特定的事件觸發
        // 例如，在 handleMessage 中處理 VOICE_CHANNEL_JOINED/LEFT 時發布更新事件
        // 如果這個方法是廣播給所有客戶端語音頻道成員的完整列表，
        // 那麼也需要通過 Redis 來做。
        // 為此，您可能需要在 RoomManager 或 messageHandler 中定義一個方法，
        // 該方法調用 publisher().publish() 一個帶有所有頻道成員的更新事件。
        // 為了不影響現有結構，我暫時註釋掉此行，您需確認其廣播行為。
        // roomHandler.broadcastVoiceChannelMembers(); 
    });

    ws.on('error', (error) => {
        logger.error(`WebSocket error for client ${id}:`, error);
    });
});