const WebSocket = require('ws');
const config = require('./config');
const logger = require('./utils/logger');
const handleSignaling = require('./handlers/signalingHandler');

const ws = new WebSocket(config.SIGNALING_SERVER);
ws.on('open', () =>  logger.info('已連上伺服器'));
ws.on('message', (data) => handleSignaling(ws, data));