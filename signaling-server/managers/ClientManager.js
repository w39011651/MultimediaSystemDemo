let clients = {};
let nextId = 1;

module.exports = {
    addClient(ws) {
        const id = `user${nextId++}`;
        ws.id = id;
        clients[id] = ws;
        return id;
    },
    removeClient(ws) {
        delete clients[ws.id];
    },
    getClient(id) {
        return clients[id];
    },
    getAllClients() {
        return clients;
    }
};