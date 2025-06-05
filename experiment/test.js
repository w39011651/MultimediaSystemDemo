// 安裝: npm install ws
const WebSocket = require('ws');

// 啟動 WebSocket 伺服器
const server = new WebSocket.Server({ port: 8080 });

server.on('connection', (ws) => {
  console.log('Server: 有人連進來');
  ws.on('message', (msg) => {
    console.log('Server 收到:', msg);
    // 可以回傳給 client
    ws.send('伺服器回應: ' + msg);
  });
});

// 客戶端連線
const client = new WebSocket('ws://localhost:8080');

client.on('open', () => {
  console.log('Client: 連上伺服器');
  client.send('嗨, 這是自己發的訊息');
});

client.on('message', (data) => {
  console.log('Client 收到:', data);
});