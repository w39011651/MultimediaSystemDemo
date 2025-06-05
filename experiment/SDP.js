const wrtc = require('wrtc')

function setRemoteAnswer(answerStr)
{
    if (typeof answerStr != 'string')
        return;
    answerStr.replace('\\\\', '\\');
    console.log(answerStr);
    //const answer = JSON.parse(answerSTr);
}

function getSignalingoffer()
{
    const config = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    }

    const localConnection = new wrtc.RTCPeerConnection(config)

    localConnection.onicecandidate = e =>  {
    console.log(" NEW ice candidate!! on localconnection reprinting SDP " )
    console.log(JSON.stringify(localConnection.localDescription))
    }  //print the local description or SDP on console

    const sendChannel = localConnection.createDataChannel("sendChannel"); 
    //create local data channel for data transmission
    sendChannel.onmessage =e =>  console.log("messsage received!!!"  + e.data )
    sendChannel.onopen = e => console.log("opened!!!!");
    sendChannel.onclose =e => console.log("closed!!!!!!");

    localConnection.createOffer().then(o => localConnection.setLocalDescription(o) ); // create local session description or SDP
}

