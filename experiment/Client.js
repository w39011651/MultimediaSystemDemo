const WebSocket = require('ws');
const wrtc = require('wrtc')
const readline = require('readline')

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
}
let connectUsers = {};
let myId = `user-1`;

/**
 * 
 * @param {WebSocket} ws 
 */
function getSignalingoffer(ws, from_Id, to_Id)
{
    const config = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    }

    localConnection = new wrtc.RTCPeerConnection(config)

    localConnection.onicecandidate = e =>  
    {
        if(e.candidate == null)
        {
            console.log(" NEW ice candidate!! on localconnection reprinting SDP " );
            //console.log(JSON.stringify(localConnection.localDescription));
            if (localConnection.localDescription)
            {
                if(ws && ws.readyState == ws.OPEN)
                {
                    const OfferMessage = {type: "offer", fromId:from_Id, toId:to_Id, payload:null};
                    OfferMessage.payload = localConnection.localDescription;
                    ws.send(JSON.stringify(OfferMessage));
                    console.log("Send the SDP offer.");
                }
            }
        }
    }  //print the local description or SDP on console

    const sendChannel = localConnection.createDataChannel("sendChannel"); 
    //create local data channel for data transmission
    sendChannel.onmessage =e =>  console.log("messsage received: "  + e.data )
    sendChannel.onopen = (e) => 
    {
        console.log("opened");
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.on('line', (input)=>{
            sendChannel.send(input);
        });
    };
    sendChannel.onclose =e => console.log("closed!!!!!!");

    localConnection.createOffer().then(o => localConnection.setLocalDescription(o) ); // create local session description or SDP
}


/**
 * @param {WebSocket} client
 * @param {object} offer\
 */
function getSignalinganswer(client, offer)
{
    const remoteConnection = new wrtc.RTCPeerConnection(config);

    remoteConnection.ondatachannel = e =>
    {
        receiveChannel = e.channel;
        receiveChannel.onmessage= e => console.log("message received: " + e.data);
        receiveChannel.onopen = (e) => 
        {
            console.log("opened");
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            rl.on('line', (input)=>{
                receiveChannel.send(input);
            });
        };
        receiveChannel.onclose = e => console.log("closed");
    }
    remoteConnection.setRemoteDescription(offer).then(a=>console.log("done"));
    remoteConnection.createAnswer().then(a => remoteConnection.setLocalDescription(a)).then(a=>
        {
            console.log(JSON.stringify(remoteConnection.localDescription));
            if(client && client.readyState == WebSocket.OPEN)
            {
                client.send(JSON.stringify(remoteConnection.localDescription));
                console.log("Send answer.");
            }
        }
    );
}

function connectToServer()
{
    const client = new WebSocket('ws://localhost:8080');
    client.on('open', () => {
        console.log('Client: 連上伺服器');
        client.send('嗨, 這是自己發的訊息');
    });

    client.on('message', (data) => {
        const HelloMessage = {}
        console.log('Client 收到:', JSON.stringify(data));
        let offer_str = data.toString('utf-8');
        let isJSON = null;
        let obj = null;

        try
        {
            obj = JSON.parse(offer_str);
            console.log(obj);

            isJSON = true;
        }catch(e)
        {
            isJSON = false;
        }

        if (isJSON && (obj.type === "offer" || obj.type === "answer"))
        {
            console.log("收到JSON", obj);
            getSignalinganswer(client, obj);
        }
        else if(isJSON && obj.type === "welcome")
        {
            myId = obj.payload.yourId;
            
            for(const peerStr of obj.payload.roomPeers)
            {
                console.log(peerStr);
                const roomPeerId = peerStr;
                connectUsers[roomPeerId] = "foo";//查找是否在Map中即可
                //getSignalingoffer(client)
            }
        }
        else if(isJSON && obj.type === "user_joined")
        {
            //{ type: 'welcome', payload: { yourId: 'user3', roomPeers: [] } }
        }
        else
        {
            console.log("非JSON字串", offer_str);
        }
        
    });
    return client;
}

connectToServer()