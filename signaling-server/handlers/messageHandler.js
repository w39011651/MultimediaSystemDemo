const ClientManager = require('../managers/ClientManager');
const logger = require('../utils/logger');
const db = require('../utils/db');

module.exports = function(ws, data) {
    let obj = null;
    try {
        obj = JSON.parse(data.toString('utf-8'));
    } catch (e) {
        logger.error("非JSON字串", data);
        return;
    }
    if (obj.type === "text-message" && obj.channelId && obj.text)
    {
        const messageToSend = {
            type: 'text-message',
            text: obj.text,
            channelId: obj.channelId,
            fromId: ws.id,
            timestamp: new Date().toISOString()
        };

        // 儲存訊息到資料庫
        db.saveMessage({
            channelId: obj.channelId,
            fromId: ws.id,
            text: obj.text,
            timestamp: messageToSend.timestamp
        });

        // 廣播給所有 client（包含自己）
        ClientManager.broadcast(messageToSend);
    }
    // 處理歷史訊息查詢
    else if (obj.type === "get-history" && obj.channelId) {
        db.getMessages(obj.channelId, (err, rows) => {
            if (err) {
                logger.error("查詢歷史訊息失敗", err);
                ws.send(JSON.stringify({ type: "history", channelId: obj.channelId, messages: [] }));
            } else {
                ws.send(JSON.stringify({ type: "history", channelId: obj.channelId, messages: rows }));
            }
        });
    }
    else if (obj.toId && ClientManager.getClient(obj.toId)) {//WebRTC part
        ClientManager.getClient(obj.toId).send(JSON.stringify({ ...obj, fromId: ws.id }));
        logger.info(`Message sent from ${ws.id} to ${obj.toId}`);
    } else {
        logger.warn(`Client ${obj.toId} not found`);
    }
};