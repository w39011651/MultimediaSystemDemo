const readline = require('readline');

module.exports = function setupDataChannel(channel, peerId) {
    channel.onopen = () => {
        console.log(`與 ${peerId} 的 DataChannel 已開啟！`);
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.on('line', (input) => channel.send(input));
    };
    channel.onmessage = e => console.log(`來自 ${peerId} 的訊息:`, e.data);
};