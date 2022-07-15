import express from 'express';
import expressWs from 'express-ws';
import * as pg from 'pg';
import { GameMap } from './game-map.js';
import { TrafficController } from './traffic-controller.js';
import { catalogDirectory } from './util/file-util.js';
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

let trafficController = new TrafficController();
let gameMap = new GameMap();
let nameByClientId = {};

for(let x = -4; x < 2; x += 1) {
    for(let z = -4; z < 2; z += 1) {
        let color = {
            r: (x % 2) ? .5 : 1,
            g: (z % 2) ? .5 : 1,
            b: ((x + z) % 2) ? .5 : 1,
        };

        gameMap.setTile(x, z, z + x + 10, color);
    }
}

const messageHandlers = {
    'identify': (clientId, messageData) => {
        nameByClientId[clientId] = messageData.name;
        trafficController.broadcast('connection-notice', {name: messageData.name});
    },
    'chat-message': (clientId, messageData) => {
        let name = nameByClientId[clientId] ?? 'Unknown Client';
        trafficController.broadcast('chat-message', {name: name, text: messageData.text});
    },
    'map': (clientId, messageData, responder) => {
        responder(gameMap);
    },
    'color-tile': (clientId, messageData) => {
        let name = nameByClientId[clientId] ?? 'Unknown Client';
        let tileId = messageData.tileId;
        let color = messageData.color;
        gameMap.tiles[tileId].color = color;

        trafficController.broadcast('color-tile', {name, tileId, color});
    },
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
app.use(express.static('source/client'));

app.get('/', (req, res) => {
    res.sendFile('source/client/index.html');
});

app.get('/shaders', (req, res) => {
    let data = catalogDirectory('source/client/renderer/shaders', 'glsl');
    console.log({data});
    res.send(JSON.stringify(data));
});

//Set up the app to listen on port 8080.
const port = parseInt(process.env.PORT) || 8080;

app.listen(port, () => {
    console.log(`http://localhost:${port}`);
});