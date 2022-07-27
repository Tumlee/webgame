export class User {
    constructor(userId) {
        this.userId = userId;
        this.displayName = userId;
        this.clientIds = {};
    }

    associateClientId(clientId) {
        this.clientIds[clientId] = {};
    }

    disassociateClientId(clientId) {
        delete this.clientIds[clientId];
    }

    hasConnectedClient() {
        return Object.keys(this.clientIds).length != 0;
    }
}