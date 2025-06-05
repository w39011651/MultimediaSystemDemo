const { connect } = require('http2');
const WebSocket = require('ws');
const wrtc = require('wrtc');

let localConnection;
let wsClient;

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
    wsClient = new WebSocket.Server({port:8080});
    console.log("Successfully build server.");

    wsClient.on('connection', (ws) => {
        console.log("Connection in.");
        getSignalingoffer(ws);
        ws.on("message", (msg)=>
        {
            console.log("Server receive message:", msg);
            ws.send("The response from server");
            
        });
    });//(ws)=>{} is lambda expression.
    wsClient.on('message', (data)=>{
        const answer = JSON.parse(data);
        localConnection.setRemoteDescription(new wrtc.RTCSessionDescription(answer).then(()=> console.log("Remote answer set!")));
    });
}

websocketConnection();
