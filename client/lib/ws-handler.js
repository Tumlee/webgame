import { WsClient } from "./ws-client";

//Built on top of the WsClient library, this has special functions specific
//to this game, including appending timestamps and sequence numbers to the requets,
//handling call/response, sending and acknowledging pings, and 
export class WsHandler {
    constructor() {
        this.sequenceNumber = 0;
        this.wsClient = new WsClient();
        this.pendingRequests = {};
        this.pingInterval = null;
        this.timeoutInterval = null;
        this.messageHandlers = {
            ping: data => this.resetTimeoutInterval()
        };
    }

    //Connection timeout handling
    cancelTimeoutInterval() {
        if(this.timeoutInterval != null) {
            clearInterval(this.timeoutInterval);
            this.timeoutInterval = null;
        }
    }

    resetTimeoutInterval() {
        this.cancelTimeoutInterval();
        this.timeoutInterval = setTimeout(() => this.handleTimeout(), 10000);
    }

    //Ping interval handling
    cancelPingInterval() {
        if(this.pingInterval != null) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    resetPingInterval() {
        this.cancelPingInterval();
        this.pingInterval = setInterval(() => this.sendPing(), 2500);
    }

    openConnection(uri, connectionFunction) {
        if(this.wsClient.isConnected)
            return;

        let functions = {
            onMessage: event => {
                console.log({receivedMessage: event});
            },
            onError: event => {
                console.log({wsError: event});
            },
            onClose: event => {
                this.cancelPingInterval();
                this.cancelTimeoutInterval();
                this.openConnection(uri, connectionFunction);
            }
        };

        return this.wsClient.openConnection(uri, functions).then(connectionEvent => {
            this.resetPingInterval();
            this.resetTimeoutInterval();
        }).then(connectionFunction);
    }

    sendMessage(type, messageData) {
        let packet = {
            type: type,
            timestamp: Date.now(),
            sequenceNumber: this.sequenceNumber,
            data: messageData
        };

        //Increment the sequence number.
        this.sequenceNumber = this.sequenceNumber + 1;
        this.wsClient.sendMessage(JSON.stringify(packet));
    }

    sendRequest(type, messageData) {
        return new Promise((resolve, reject) => {
            let seqNum = this.sequenceNumber;

            this.pendingRequests[seqNum] = responseData => {
                delete this.pendingRequests[seqNum];
                resolve(responseData);
            };

            setTimeout(() => {
                if(this.pendingRequests[seqNum] != null) {
                    console.log(`Warning! Response timed out for request ${seqNum}`, messageData);
                    delete this.pendingRequests[seqNum];
                    reject();
                }
            }, 2000);
        });
    }

    handleMessage(wrappedMessage) {
        let type = wrappedMessage.type;
        let timestamp = wrappedMessage.timestamp;
        let responseId = wrappedMessage.responseId;
        let messageData = wrappedMessage.data;

        if(responseId && this.pendingRequests[responseId]) {
            this.pendingRequests[responseId](messageData);
            return;
        }

        let messageHandler = this.messageHandlers[type];

        if(messageHandler == null) {
            console.log(`No message handler for message type: ${type}`);
            return;
        }

        messageHandler(messageData);
    }

    sendPing() {
        this.sendMessage('ping', {});
    }

    handleTimeout() {
        console.log('Connection to server appears to be timed out...');
    }
}