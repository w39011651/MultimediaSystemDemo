const WebSocket = require('ws');
const wrtc = require('wrtc')
const readline = require('readline')

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

let ws, myId, peerMap = {}, dataChannelMap = {};

function setupWebSocket() {
    ws = new WebSocket('ws://localhost:8080');
    ws.on('open', () => { console.log('已連上 signaling server'); });
    ws.on('message', (data) => {
        let msg = JSON.parse(data.toString('utf-8'));
        if (msg.type === "welcome") {
            myId = msg.id;
            console.log('我的 ID:', myId, '現有用戶:', msg.userList);
            // 主動對所有現有 user 發 offer
            msg.userList.forEach(targetId => startOffer(targetId));
        } else if (msg.type === "offer") {
            handleOffer(msg.fromId, msg.sdp);
        } else if (msg.type === "answer") {
            handleAnswer(msg.fromId, msg.sdp);
        } else if (msg.type === "candidate") {
            handleCandidate(msg.fromId, msg.candidate);
        }
    });
}

function startOffer(targetId) {
    const peer = new wrtc.RTCPeerConnection(config);
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
}

function handleOffer(fromId, sdp) {
    const peer = new wrtc.RTCPeerConnection(config);
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
}

function handleAnswer(fromId, sdp) {
    peerMap[fromId].setRemoteDescription({ type: "answer", sdp });
}

function handleCandidate(fromId, candidate) {
    peerMap[fromId].addIceCandidate(new wrtc.RTCIceCandidate(candidate));
}

function setupDataChannel(channel, peerId) {
    channel.onopen = () => {
        console.log(`與 ${peerId} 的 DataChannel 已開啟！`);
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.on('line', (input) => channel.send(input));
    };
    channel.onmessage = e => console.log(`來自 ${peerId} 的訊息:`, e.data);
}

setupWebSocket();