import express from 'express';
import expressWs from 'express-ws';
import * as pg from 'pg';
//import WebSocket, {WebSocketServer} from 'ws';
//import https from 'https';

//Database shit.

console.log({pg});
let Client = pg.default.Client;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  /*ssl: {
    rejectUnauthorized: false
  }*/
});

client.connect();

client.query('SELECT table_schema,table_name FROM information_schema.tables;', (err, res) => {
    console.log({res});
  if (err) throw err;
  for (let row of res.rows) {
    console.log(JSON.stringify(row));
  }
  client.end();
});
//--------------

const app = express();
let wsInstance = expressWs(app);

var clientsById = {};

var logMessages = [];

function log(message) {
    console.log(message);
    let messageObject = {
        timestamp: Date.now(),
        message: message,
    };

    while(logMessages.length > 100)
        logMessages.shift();

    logMessages.push(messageObject);
}

//Set up the websocket connection.
app.ws('/', (ws, req) => {
    try {
        let clientId = req.headers['sec-websocket-key'];
        clientsById[clientId] = {clientId, ws};

        //console.log('NEW CONNECTION', {clientId});
        log(`New websocket connection from ${clientId}`);

        //Send over the contents of the logs.
        let logString = JSON.stringify({type: 'logs', logMessages});
        ws.send(logString);
    
        ws.on('message', messageStr => {
            try {
                let message = JSON.parse(messageStr);
                console.log({message});
                if(message.type == 'identify') {
                    clientsById[clientId].name = message.name;
                    log(`ClientId ${clientId} has identified as ${message.name}`);
                }

                if(message.type == 'chatMessage') {
                    let name = clientsById[clientId].name ?? `Unidentified client ${clientId}`;
                    log(`[${name}] ${message.content}`);

                    for(const clientData of Object.values(clientsById)) {
                        console.log({clientData});
                        let clientWs = clientData.ws;
                        let outgoingMessage = {
                            type: 'logs',
                            logMessages: [{
                                timestamp: Date.now(),
                                message: `[${name}] ${message.content}`,
                            }]
                        };

                        clientWs.send(JSON.stringify(outgoingMessage));
                    }
                }
            } catch(error) {
                console.log({messageStr, error});
            }
        });
    
        ws.on('close', () => {
            //console.log('ws close');
            //console.log('Connection closed');
            let name = clientsById[clientId].name ?? `Unidentified client ${clientId}`;
            log(`${name} has disconnected.`);
            
        });
    } catch(error) {
        console.log({error});
    }
});

//Set up the server to use static files from the 'client' directory.
app.use(express.static('client'));

//Set up the app to listen on port 8080.
const port = parseInt(process.env.PORT) || 8080;

app.listen(port, () => {
    console.log(`helloworld: listening on port ${port}`);
});