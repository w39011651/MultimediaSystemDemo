const { connect } = require('http2');
const WebSocket = require('ws');
const wrtc = require('wrtc');
const readline = require('readline')

let localConnection;
let wsClient;
let clients = {}; // Store connected clients

function getSignalingoffer(ws)
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
                    ws.send(JSON.stringify(localConnection.localDescription));
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

function websocketConnection()
{
    wsClient = new WebSocket.Server({port:8080});
    console.log("Successfully build server.");

    let nextId = 1; // Initialize client id counter
    wsClient.on('connection', (ws) => {
        //建立client id
        console.log("Connection in.");
        const id = `user${nextId++}`;
        ws.id = id;
        clients[id] = ws; // Store the client in the clients object
        
        const welcomeMessage = {type: "welcome", "payload":{"yourId":id, "roomPeers":[]}};
        for (let i = 1; i < nextId - 1; i++)
        {
            welcomeMessage.payload.roomPeers.push({type:`user${i}`});
        }

        ws.send(JSON.stringify(welcomeMessage)); // Send welcome message with client id

        //broadcast({ type: "user-joined", id });

        getSignalingoffer(ws);
        ws.on("message", (data)=>
        {
            console.log('Server 收到:', JSON.stringify(data));
            let answer_str = data.toString('utf-8');
            let isJSON = null;
            let obj = null;

            try
            {
                obj = JSON.parse(answer_str);
                isJSON = true;
            }catch(e)
            {
                isJSON = false;
            }

            if (isJSON && (obj['type'] == 'offer' || obj['type'] == 'answer') )
            {
                console.log("收到JSON", obj);
                localConnection.setRemoteDescription(new wrtc.RTCSessionDescription(obj));
                console.log("Remote answer set!");
            }
            else
            {
                console.log("非JSON字串", answer_str);
            }
        });
    });//(ws)=>{} is lambda expression.
    wsClient.on('message', (data)=>{
        console.log('Server 收到:', JSON.stringify(data));
        
    });
}

function broadcast(message) {
  Object.values(clients).forEach(ws => {
    ws.send(JSON.stringify(message));
  });
}


websocketConnection();
/*
    UserA --> Room 13:00
    ---
    UserB --> Room 13:05

    Server --> UserA send offer
    Server --> UserB get offerA and send answer
    Server --> User get answer
    ---
    UserC --> Room 15:00

    Server --> UserA send offer
    Server --> UserB send offer
    Server --> UserC send offer

    Server --> UserA get offerB and send answer
    Server --> UserA get offerC and send answer
    Server --> UserB get offerA and send answer
    Server --> UserB get offerC and send answer
    Server --> UserC get offerA and send answer
    Server --> UserC get offerB and send answer
 */