const db = require('../utils/db');
const ClientManager = require('../managers/ClientManager');
const logger = require('../utils/logger');

module.exports = function(ws, data) {
    let obj = null;
    try {
        obj = JSON.parse(data.toString('utf-8'));
    } catch (e) {
        logger.error("非JSON字串", data);
        return;
    }
    // 新增頻道廣播
    if (obj.type === 'chat' && obj.channel) {
        // 儲存訊息到資料庫
        db.run(
        'INSERT INTO messages (channel, nickname, text) VALUES (?, ?, ?)',
        [obj.channel, obj.nickname, obj.text]
        );
        // 廣播給所有 client
        Object.values(ClientManager.getAllClients()).forEach(client => {
            client.send(JSON.stringify(obj));
        });
        logger.info(`[${obj.channel}] ${obj.nickname}: ${obj.text}`);
        return;
    }
    // 處理歷史訊息請求
    if (obj.type === 'history' && obj.channel) {
        db.all(
            'SELECT nickname, text, timestamp FROM messages WHERE channel = ? ORDER BY id ASC',
            [obj.channel],
            (err, rows) => {
                if (!err && rows) {
                    ws.send(JSON.stringify({
                        type: 'history',
                        channel: obj.channel,
                        messages: rows
                    }));
                }
            }
        );
        return;
    }
    console.log('收到 video-invite:', obj.nickname);
    if (obj.type === 'video-invite') {
        Object.values(ClientManager.getAllClients()).forEach(client => {
            client.send(JSON.stringify({ type: 'video-invite', nickname: obj.nickname }));
        });
        return;
    }
    if (obj.type === 'video-join') {
        Object.values(ClientManager.getAllClients()).forEach(client => {
            client.send(JSON.stringify({ type: 'video-join', nickname: obj.nickname }));
        });
        return;
    }
    if (['offer', 'answer', 'candidate'].includes(obj.type)) {
        Object.values(ClientManager.getAllClients()).forEach(client => {
            if (client !== ws) client.send(JSON.stringify(obj));
        });
        return;
    }
    if (obj.toId && ClientManager.getClient(obj.toId)) {
        ClientManager.getClient(obj.toId).send(JSON.stringify({ ...obj, fromId: ws.id }));
        logger.info(`Message sent from ${ws.id} to ${obj.toId}`);
    } else {
        logger.warn(`Client ${obj.toId} not found`);
    }
};