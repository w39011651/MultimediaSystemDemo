const { connect } = require('http2');
const WebSocket = require('ws');
const wrtc = require('wrtc');

let localConnection;
let wss;
let clients = {}; // Store connected clients

function getSignalingoffer(ws)
{
    const config = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    }

    localConnection = new wrtc.RTCPeerConnection(config)

    localConnection.onicecandidate = e =>  {
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

    }  //print the local description or SDP on console

    const sendChannel = localConnection.createDataChannel("sendChannel"); 
    //create local data channel for data transmission
    sendChannel.onmessage =e =>  console.log("messsage received!!!"  + e.data )
    sendChannel.onopen = e => console.log("opened!!!!");
    sendChannel.onclose =e => console.log("closed!!!!!!");

    localConnection.createOffer().then(o => localConnection.setLocalDescription(o) ); // create local session description or SDP
}

function websocketConnection()
{
    wss = new WebSocket.Server({port:8080});
    console.log("Successfully build server.");

    let nextId = 1; // Initialize client id counter
    wss.on('connection', (ws) => {
        //建立client id
        console.log("Connection in.");
        const id = `user${nextId++}`;
        ws.id = id;
        clients[id] = ws; // Store the client in the clients object
        ws.send(JSON.stringify({ type: "welcome", id: id })); // Send welcome message with client id

        broadcast({ type: "user-joined", id });

        getSignalingoffer(ws);
        ws.on("message", (msg)=>
        {
            console.log("Server receive message:", msg);
            ws.send("The response from server");
            
        });
    });//(ws)=>{} is lambda expression.
    wss.on('message', (data)=>{
        const answer = JSON.parse(data);
        localConnection.setRemoteDescription(new wrtc.RTCSessionDescription(answer).then(()=> console.log("Remote answer set!")));
    });


    ws.on('close', () => {
    delete clients[id];
    broadcast({ type: "user-left", id });
  });
}

function broadcast(message) {
  Object.values(clients).forEach(ws => {
    ws.send(JSON.stringify(message));
  });
}


websocketConnection();
