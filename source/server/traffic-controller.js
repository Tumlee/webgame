import {Client} from './client.js';

export class TrafficController {
    constructor() {
        this.clients = {};
    }

    registerClient(ws, req, messageHandlers) {
        let clientId = req.headers['sec-websocket-key'];

        if(this.clients[clientId] == null)
            this.clients[clientId] = new Client(clientId, ws);
        else
            this.clients[clientId].handleConnect();

        for(const handlerId of Object.keys(messageHandlers ?? {})) {
            let handlerFunc = messageHandlers[handlerId];
            this.clients[clientId].setMessageHandler(handlerId, (messageData, responder) => handlerFunc(clientId, messageData, responder));
        }

        return this.clients[clientId];
    }

    getAllClients() {
        return Object.values(this.clients);
    }

    getConnectedClients() {
        return this.getAllClients().filter(client => client.isConnected);
    }

    broadcast(type, messageData) {
        this.getConnectedClients().forEach(client => client.sendMessage(type, messageData));
    }
}