import { logMessage } from "./logs.js";

export class Client {
    constructor(clientId, ws) {
        this.clientId = clientId;
        this.sequenceId = 0;
        this.ws = ws;
        this.pingInterval = null;
        this.timeoutInterval = null;
        this.pendingRequests = {};
        this.messageHandlers = {
            ping: data => this.resetTimeoutInterval()
        };

        this.ws.on('message', messageStr => {
            try {
                let wrappedMessage = JSON.parse(messageStr);
                this.handleMessage(wrappedMessage);
            } catch(onMessageError) {
                logMessage(`Error processing message for client (${this.clientId})`, {onMessageError}, {messageStr});
            }
        });

        this.ws.on('close', () => this.handleDisconnect());
        this.handleConnect();
    }

    //Handling of the timeout interval.
    resetTimeoutInterval() {
        this.cancelTimeoutInterval();
        this.timeoutInterval = setTimeout(() => this.handleTimeout(), 10000);
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
        this.pingInterval = setInterval(() => this.sendPing(), 2500);
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
        logMessage(`Client with ID (${this.clientId}) has connected`);
        this.isConnected = true;
    }

    handleDisconnect() {
        if(!this.isConnected)   //Already disconnected, do nothing.
            return;

        logMessage(`Client with ID (${this.clientId}) has disconnected.`);
        this.isConnected = false;
    }

    sendMessage(type, messageData, responseId) {
        let packet = {
            type: type,
            timestamp: Date.now(),
            sequenceId: this.sequenceId,
            data: messageData
        };

        if(responseId != null)
            packet.responseId = responseId;

        if(type != 'ping')
            logMessage(`Sending to (${this.clientId})`, {packet});

        this.ws.send(JSON.stringify(packet));
        this.sequenceId = this.sequenceId + 1;
    }

    sendRequest(type, messageData) {
        return new Promise((resolve, reject) => {
            this.sendMessage(type, messageData);
            let seqId = this.sequenceId;

            this.pendingRequests[seqId] = responseData => {
                delete this.pendingRequests[seqId];
                resolve(responseData);
            };

            setTimeout(() => {
                if(this.pendingRequests[seqId] != null) {
                    logMessage(`Warning! Response timed out for request ${seqId}`, messageData);
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
        let seqId = wrappedMessage.sequenceId;

        if(type != 'ping')
        logMessage(`Recieved from (${this.clientId})`, {wrappedMessage});

        if(responseId) {
            let callback = this.pendingRequets[responseId];

            if(callback) {
                callback(messageData);
            } else {
                logMessage(`Warning! Received response for ${responseID} but it's not in the pending requests list.`);
            }
        } else {
            let messageHandler = this.messageHandlers[type];

            if(messageHandler == null) {
                logMessage(`No message handler for message type: ${type}`);
                return;
            }
      
            messageHandler(messageData, responseData => this.sendMessage(`${type}-response`, responseData, seqId));
        }
    }

    sendPing() {
        this.sendMessage('ping', {});
    }

    handleTimeout() {
        logMessage(`Client with ID (${this.clientId}) seems to have timed out.`);
    }

    setMessageHandler(id, func) {
        this.messageHandlers[id] = func;
    }
}