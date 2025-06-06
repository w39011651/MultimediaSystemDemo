const WebSocket = require('ws');

let wsClient;

function websocketConnection()
{
    wsClient = new WebSocket.Server({port:8080});
    console.log("Successfully build server");

    wsClient.on('connection', (ws) => {
        console.log("Connection in.");
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
            if(isJSON && (obj.type == 'offer' || obj.type == 'answer'))//如果是SDP內容
            {

            }
                
        });
    });
}