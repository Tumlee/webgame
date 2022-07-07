import {Client} from './client.js';

export class TrafficController {
    constructor() {
        this.clients = {};
    }

    registerClient(ws, req) {
        let clientId = req.headers['sec-websocket-key'];

        if(this.clients[clientId] == null)
            this.clients[clientId] = new Client(clientId, ws);
        else
            this.clients[clientId].handleConnect();
    }

    getAllClients() {
        return Object.values(this.clients);
    }

    getConnectedClients() {
        return this.getAllClients().filter(client => client.isConnected);
    }

    broadcast(messageData) {
        this.getConnectedClients().forEach(client => client.sendMessage(messageData));
    }
}