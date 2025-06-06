const wrtc = require('wrtc');
const config = require('../config');
const setupDataChannel = require('../handlers/dataChannelHandler');

let myId, peerMap = {}, dataChannelMap = {};

module.exports = {
    setMyId(id) {myId = id;},
    getMyId() {return myId;},
    startOffer(targetId, ws) {
        const peer = new wrtc.RTCPeerConnection({ iceServers: config.ICE_SERVERS });
        peerMap[targetId] = peer;
        const dc = peer.createDataChannel("chat");
        dataChannelMap[targetId] = dc;
        setupDataChannel(dc, targetId);
    
        peer.onicecandidate = e => {
            if (e.candidate) {
                ws.send(JSON.stringify({ type: "candidate", candidate: e.candidate, toId: targetId }));
            }
        };
        peer.createOffer().then(offer => peer.setLocalDescription(offer)).then(() => {
            ws.send(JSON.stringify({ type: "offer", sdp: peer.localDescription.sdp, toId: targetId }));
        });
    },
    handleOffer(fromId, sdp, ws) {
        const peer = new wrtc.RTCPeerConnection({ iceServers: config.ICE_SERVERS });
        peerMap[fromId] = peer;
        peer.ondatachannel = e => setupDataChannel(e.channel, fromId);
        peer.onicecandidate = e => {
            if (e.candidate) {
                ws.send(JSON.stringify({ type: "candidate", candidate: e.candidate, toId: fromId }));
            }
        };
        peer.setRemoteDescription({ type: "offer", sdp }).then(() => peer.createAnswer()).then(answer =>
            peer.setLocalDescription(answer)).then(() => {
            ws.send(JSON.stringify({ type: "answer", sdp: peer.localDescription.sdp, toId: fromId }));
        });
    },
    handleAnswer(fromId, sdp) {
        peerMap[fromId].setRemoteDescription({ type: "answer", sdp });
    },
    handleCandidate(fromId, candidate) {
        peerMap[fromId].addIceCandidate(new wrtc.RTCIceCandidate(candidate));
    }
};