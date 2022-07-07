//import * as WebSocket from 'ws';

//The purpose of this wsclient object is to contain an asynchronous way of processing
//messages from, and sending messages to, the web socket server, regardless of any
//timing issue that may occur.

//The way we have to accomplish this is by defining a queue. Whenever we want to send
//something to the web server, or receive something, we add it to the queue.

//Upon adding something to the queue, we perform a check to see if it's currenty processing any items,
//if it's not, we call a function that will make it process the queue, immediately setting the 'isProcessing' flag
//beforehand. When the queue runs out, we set the 'isProcessing' flag to false.

//All 'received' messages should be handled as soon as possible, but there may be rate limiting on the server's end
//that makes them request that we do not send more than X messages in any given second. In order to prevent the server's
//rate limiting from clogging up the main queue, we will ALWAYS process incoming messages FIRST.

//Therefore, incoming messages can usually be handled as-is, but outgoing messages will have optional functions
//called isValid() and onInvalid() that determine if the message is still valid. The onInvalid() function will
//determine what to do if the message is invalid. If isValid() is not defined, it will be assumed true, and if
//onInvalid() is not defined, the message will simply be discarded.
export class WsClient {
    constructor() {
        this.websocket = null;
        this.isConnected = false;
        this.isProcessing = false;
        this.inQueue = [];
        this.outQueue = [];
        this.lastOutTime = Date.now();
        this.outRateMS = 200;
        this.incomingMessageHandler = null;
        //this.logger = new Logger('wsClient');
    }

    ensureProcessing() {
        if(!this.isProcessing) {
            this.isProcessing = true;
            this.process();
        } else {
            //this.logger.info('wsClient is already processing');
        }
    }

    //1) Loop through EVERYTHING in the inQueue first.
    //2) Check the outQueue for a single item.
    //  a) if it wouldn't be a rate limiting violation, send out a message
    //  b) otherwise, set a timeout that calls ensureProcessing again, waiting for the
    //      the message to be eligble to send again.
    //3) Mark 'isProcessing' as false.
    process() {
        while(this.inQueue.length != 0) {
            let item = this.inQueue.shift();
            this.handleIncoming(item);
        }

        if(this.outQueue.length != 0) {
            let elapsed = Date.now() - this.lastOutTime;

            if(elapsed < this.outRateMS) {
                //Have to wait...
                let waitTime = (this.outRateMS - elapsed);
                //this.logger.info('Waiting ' + waitTime + 'ms before processing next outQueue item');
                this.isProcessing = false;
                setTimeout(() => this.ensureProcessing(), waitTime);
                return;
            } else {
                let item = this.outQueue.shift();
                this.handleOutgoing(item);
                this.lastOutTime = Date.now();
            }
        }

        this.isProcessing = false;
    }

    handleIncoming(event) {
        if(this.incomingMessageHandler != null)
            this.incomingMessageHandler(event);
    }

    handleOutgoing(message) {
        if(message.isValid && !message.isValid()) {
            //Message no longer valid, call onInvalid.
            //this.logger.warning('Message invalid', {message});
            message.onInvalid && message.onInvalid();
            return;
        }

        //this.logger.info('Sending message', {message});
        this.websocket.send(message);
    }

    closeConnection() {
        if(this.websocket != null)
            this.websocket.close();
    }

    sendMessage(message) {
        //this.logger.info('Queueing outgoing', {message});
        this.outQueue.push(message);
        this.ensureProcessing();
    }

    openConnection(uri, functions) {
        functions = functions ?? {};

        return new Promise((resolve, reject) => {
            this.websocket = new WebSocket(uri);
            this.websocket.onopen = event => {
                //this.logger.info('Connection established', {event});
                this.isConnected = true;

                if(functions.onMessage)
                    this.incomingMessageHandler = functions.onMessage;

                resolve(event);
            }
    
            this.websocket.onclose = event => {
                //this.logger.info('Connection closed', {event});

                if(functions.onClose)
                    functions.onClose(event);

                this.isConnected = false;
            }

            this.websocket.onmessage = event => {
                //this.logger.info('Queueing event', {event});
                this.inQueue.push(event);
                this.ensureProcessing();
            }

            this.websocket.onerror = event => {
                //this.logger.info('Error received', {event});
                if(functions.onError)
                    functions.onError(event);
            }
        });
    }

    /*setIncomingMessageHandler(handler) {
        this.incomingMessageHandler = handler;
    }*/
};