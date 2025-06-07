const ClientManager = require('../managers/ClientManager');
const logger = require('../utils/logger');
const EVENT = require('../constants/events');
const roomHandler = require('./roomHandler');
module.exports = function(ws, data) {
    let obj = null;
    try {
        obj = JSON.parse(data.toString('utf-8'));
    } catch (e) {
        logger.error("非JSON字串", data);
        return;
    }

    const clientId = ws.id;
    const clientName = clientId;//temp

    switch (obj.type)
    {
        case EVENT.TEXT_MESSAGE://文字訊息
            if (obj.channelId && obj.text)
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
            break;

        case EVENT.JOIN_VOICE://加入語音頻道
            roomHandler.handleJoinVoice(ws, obj.payload);
            break;

        case EVENT.LEAVE_VOICE://離開語音頻道
            roomHandler.handleLeaveVoice(ws, obj.payload);
            break;

        default:
            if (obj.toId && ClientManager.getClient(obj.toId)) {//WebRTC part
                ClientManager.getClient(obj.toId).send(JSON.stringify({ ...obj, fromId: ws.id }));
                logger.info(`Message sent from ${ws.id} to ${obj.toId}`);
            } else {
                logger.warn(`Client ${obj.toId} not found`);
            }
            break;
    }
};