const logger = require('../utils/logger');
const EVENT = require('../constants/events');
const PeerManager = require('../managers/peerManager');


module.exports = function(ws, data) {
    let obj = null;
    try {
        obj = JSON.parse(data.toString('utf-8'));
    } catch (e) {
        logger.error("非JSON字串", data);
        return;
    }
    if (obj.type === EVENT.WELCOME) {
            PeerManager.setMyId(obj.id);
            logger.info('我的 ID:', PeerManager.getMyId(), '現有用戶:', obj.userList);
            // 主動對所有現有 user 發 offer
            obj.userList.forEach(targetId => PeerManager.startOffer(targetId, ws));
        } else if (obj.type === EVENT.OFFER) {
            PeerManager.handleOffer(obj.fromId, obj.sdp, ws);
        } else if (obj.type === EVENT.ANSWER) {
            PeerManager.handleAnswer(obj.fromId, obj.sdp);
        } else if (obj.type === EVENT.CANDIDATE) {
            PeerManager.handleCandidate(obj.fromId, obj.candidate);
        }

};