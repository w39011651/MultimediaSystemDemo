const WebSocket = require('ws');
const wrtc = require('wrtc')

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
}

function getSignalinganswer(offer)
{
    // const localConnection = new wrtc.RTCPeerConnection(config);
    
    // localConnection.onicecandidate = e =>
    // {
    //     console.log("New Ice candidate! on localconnection reprinting SDP");
    //     console.log(JSON.stringify(localConnection.localDescription));
    // }

    // const sendChannel = localConnection.createDataChannel("sendChannel");

    // sendChannel.onmessage = e => console.log("message received"+ e.data);
    // sendChannel.onopen = e => console.log("opened");
    // sendChannel.onclose = e => console.log("closed");

    // localConnection.createOffer().then(o=>localConnection.setLocalDescription(o));

    const remoteConnection = new wrtc.RTCPeerConnection(config);

    remoteConnection.ondatachannel = e =>
    {
        receiveChannel = e.channel;
        receiveChannel.onmessage= e => console.log("message received" + e.data);
        receiveChannel.onopen = e => console.log("opened");
        receiveChannel.onclose = e => console.log("closed");
    }
    remoteConnection.setRemoteDescription(offer).then(a=>console.log("done"));
    remoteConnection.createAnswer().then(a => remoteConnection.setLocalDescription(a)).then(a=>
    console.log(JSON.stringify(remoteConnection.localDescription)));
}

function connectToServer()
{
    const client = new WebSocket('ws://localhost:8080');
    client.on('open', () => {
        console.log('Client: 連上伺服器');
        client.send('嗨, 這是自己發的訊息');
    });

    client.on('message', (data) => {
        console.log('Client 收到:', JSON.stringify(data));
        let offer_str = data.toString('utf-8');
        let isJSON = null;
        let obj = null;

        try
        {
            obj = JSON.parse(offer_str);
            isJSON = true;
        }catch(e)
        {
            isJSON = false;
        }

        if (isJSON)
        {
            console.log("收到JSON", obj);
            getSignalinganswer(obj);
        }
        else
        {
            console.log("非JSON字串", offer_str);
        }
        
    });
    return client;
}

connectToServer()