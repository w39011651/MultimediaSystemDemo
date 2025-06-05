const WebSocket = require('ws');
const wrtc = require('wrtc')
const readline = require('readline')

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
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
        console.log('Client 收到:', JSON.stringify(data));
        let offer_str = data.toString('utf-8');
        let isJSON = null;
        let obj = null;

        try
        {
            obj = JSON.parse(offer_str);
            //印出當前client id
            if (obj.type === "welcome" && obj.id) {
                console.log("我的 client id:", obj.id);
            }

            isJSON = true;
        }catch(e)
        {
            isJSON = false;
        }

        if (isJSON)
        {
            console.log("收到JSON", obj);
            getSignalinganswer(client, obj);
        }
        else
        {
            console.log("非JSON字串", offer_str);
        }
        
    });
    return client;
}

connectToServer()