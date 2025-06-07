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
    if (obj.type === "text-message" && obj.channelId && obj.text)
    {
        const messageToSend = {
            type: 'text-message',
            text: obj.text,
            channelId: obj.channelId,
            fromId: ws.id,
            timestamp: new Date().toISOString()
        };
        
        Object.values(ClientManager.getAllClients()).forEach(client => {
            if (client.id !== ws.id)
            {
                client.send(JSON.stringify(messageToSend));
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