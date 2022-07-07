export class Client {
    constructor(clientId, ws) {
        this.clientId = clientId;
        this.sequenceNumber = 0;
        this.ws = ws;
        this.pingInterval = null;
        this.timeoutInterval = null;
        this.handleConnect();
    }

    //Handling of the timeout interval.
    resetTimeoutInterval() {
        this.cancelTimeoutInterval();
        this.timeoutInterval = setTimeout(() => handleTimeout(), 10000);
    }

    cancelTimeoutInterval() {
        if(this.timeoutInterval != null) {
            clearInterval(this.timeoutInterval);
            this.timeoutInterval = null;
        }
    }

    //Handling of the the ping interval.
    resetPingInterval() {
        this.cancelPingInterval();
        this.pingInterval = setInterval(() => this.sendPing(), 2000);
    }

    cancelPingInterval() {
        if(this.pingInterval != null) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    handleConnect() {
        if(this.isConnected)    //Already connected, do nothing.
            return;

        this.resetPingInterval();
        this.resetTimeoutInterval();
        this.isConnected = true;
    }

    handleDisconnect() {
        if(!this.isConnected)   //Already disconnected, do nothing.
            return;

        console.log(`Client with ID (${this.clientId}) has disconnected.`);
        this.isConnected = false;
    }

    sendMessage(type, messageData, responseId) {
        let packet = {
            type: type,
            timestamp: Date.now(),
            sequenceNumber: this.sequenceNumber,
            data: messageData
        };

        if(responseId != null)
            packet.responseId = responseId;

        this.ws.send(packet);
        this.sequenceNumber = this.sequenceNumber + 1;
    }
}