import express from 'express';
import expressWs from 'express-ws';
import * as pg from 'pg';
import { TrafficController } from './traffic-controller.js';
//import WebSocket, {WebSocketServer} from 'ws';
//import https from 'https';

//Database shit.
/*console.log({pg});
let Client = pg.default.Client;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect();

client.query('SELECT table_schema,table_name FROM information_schema.tables;', (err, res) => {
    console.log({res});
  if (err) throw err;
  for (let row of res.rows) {
    console.log(JSON.stringify(row));
  }
  client.end();
});*/
//--------------

const app = express();
let wsInstance = expressWs(app);

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

let trafficController = new TrafficController();
let nameByClientId = {};

const messageHandlers = {
    'identify': (clientId, messageData) => {
        nameByClientId[clientId] = messageData.name;
        trafficController.broadcast('connection-notice', {name: messageData.name});
    },
    'chat-message': (clientId, messageData) => {
        let name = nameByClientId[clientId] ?? 'Unknown Client';
        trafficController.broadcast('chat-message', {name: name, text: messageData.text});
    }
}

//Set up the websocket connection.
app.ws('/', (ws, req) => {
    try {
        trafficController.registerClient(ws, req, messageHandlers);
    } catch(error) {
        console.log({error});
    }
});

//Set up the server to use static files from the 'client' directory.
app.use(express.static('client'));

//Set up the app to listen on port 8080.
const port = parseInt(process.env.PORT) || 8080;

app.listen(port, () => {
    console.log(`http://localhost:${port}`);
});