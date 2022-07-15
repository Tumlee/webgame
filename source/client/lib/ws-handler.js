import { WsClient } from "./ws-client.js";

//Built on top of the WsClient library, this has special functions specific
//to this game, including appending timestamps and sequence numbers to the requets,
//handling call/response, sending and acknowledging pings, and 
export class WsHandler {
    constructor(address) {
        this.address = address;
        this.sequenceId = 0;
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

    isConnected() {
        return this.wsClient.isConnected;
    }

    openConnection(connectionFunction) {
        if(this.wsClient.isConnected)
            return;

        let functions = {
            onMessage: messageEvent => {
                try {
                    let messageStr = messageEvent.data;
                    this.handleMessage(JSON.parse(messageStr));
                } catch(handleMessageError) {
                    console.log({handleMessageError});
                    console.log(messageEvent.data);
                }
            },
            onError: event => {
                console.log({wsError: event});
            },
            onClose: event => {
                console.log('Connection closed, retrying...');
                this.cancelPingInterval();
                this.cancelTimeoutInterval();
                this.openConnection(this.address, connectionFunction);
            }
        };

        return this.wsClient.openConnection(this.address, functions).then(connectionEvent => {
            this.resetPingInterval();
            this.resetTimeoutInterval();
        }).then(connectionFunction);
    }

    sendMessage(type, messageData) {
        let packet = {
            type: type,
            timestamp: Date.now(),
            sequenceId: this.sequenceId,
            data: messageData
        };

        if(packet.type != 'ping')
            console.log('SENDING', {packet});

        //Increment the sequence number.
        this.sequenceId = this.sequenceId + 1;
        this.wsClient.sendMessage(JSON.stringify(packet));
    }

    sendRequest(type, messageData) {
        return new Promise((resolve, reject) => {
            let seqId = this.sequenceId;
            this.sendMessage(type, messageData);

            this.pendingRequests[seqId] = responseData => {
                delete this.pendingRequests[seqId];
                resolve(responseData);
            };

            setTimeout(() => {
                if(this.pendingRequests[seqId] != null) {
                    console.log(`Warning! Response timed out for request ${seqId}`, messageData);
                    delete this.pendingRequests[seqId];
                    reject();
                }
            }, 2000);
        });
    }

    handleMessage(wrappedMessage) {
        if(wrappedMessage.type != 'ping')
            console.log('RECEIVED', {wrappedMessage});
            
        let type = wrappedMessage.type;
        let timestamp = wrappedMessage.timestamp;
        let responseId = wrappedMessage.responseId;
        let messageData = wrappedMessage.data;
        let seqId = wrappedMessage.sequenceId;

        if(responseId != null) {
            let callback = this.pendingRequests[responseId];

            if(callback) {
                callback(messageData);
            } else {
                console.log(`Warning! Received response for ${responseId} but it's not in the pending requests list.`);
            }
        } else {
            let messageHandler = this.messageHandlers[type];

            if(messageHandler == null) {
                console.log(`No message handler for message type: ${type}`);
                return;
            }
      
            messageHandler(messageData, responseData => this.sendMessage(`${type}-response`, responseData, seqId));
        }
    }

    sendPing() {
        this.sendMessage('ping', {});
    }

    handleTimeout() {
        console.log('Connection to server appears to be timed out...');
    }

    setMessageHandler(handlerId, func) {
        this.messageHandlers[handlerId] = func;
    }
}