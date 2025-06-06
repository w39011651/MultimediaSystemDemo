const WebSocket = require('ws');

let wsClient;
let clients = {};

function websocketConnection()
{
    wsClient = new WebSocket.Server({port:8080});
    console.log("Successfully build server");
    let nextId = 1;
    wsClient.on('connection', (ws) => {
        console.log("Connection in.");
        
        const id = `user${nextId++}`;//新增 welcome message.
        const welcomeMessage = {type: "welcome", "payload":{"yourId":id, "roomPeers":[]}};
        for (const clientID of Object.keys(clients))
        {
            welcomeMessage.payload.roomPeers.push({type:clientID});
        }
        ws.send(JSON.stringify(welcomeMessage));
        
        ws.id = id;
        clients[id] = ws;
        
        
        ws.on("message", (data)=>
        {
            console.log("Server receive: ", JSON.stringify(data));
            
            let recv_str = data.toString('utf-8');
            let obj = null;
            let isJSON = false;
            try
            {
                obj = JSON.parse(recv_str);
            }catch(e)
            {
                isJSON = false;
            }
            //判斷是誰對誰的SDP，可能在SDP中加上: direction: UserA ID -> UserB ID
            if (isJSON && (obj['type'] == 'offer' || obj['type'] == 'answer') )
            {
                console.log("收到JSON", obj);
                localConnection.setRemoteDescription(new wrtc.RTCSessionDescription(obj));
                console.log("Remote answer set!");
            }
            else
            {
                console.log("非JSON字串", recv_str);
            }
                
        });

        ws.on('close', ()=>{
            console.log("Delete Client:", ws.id);
            delete clients[ws.id];
        });
    });
}

websocketConnection();