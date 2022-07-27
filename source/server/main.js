import express from 'express';
import expressWs from 'express-ws';
import { initGlobals, trafficController, userIdByClientId, users, gameState } from './globals.js';
import { getLogMessages, logMessage } from './logs.js';
import { User } from './user.js';
import { initDatabase } from './util/database.js';
import { catalogDirectory } from './util/file-util.js';

const app = express();
let wsInstance = expressWs(app);

function serverMain() {
    initGlobals();
    initDatabase();
    initMap();
    initWebsocket();
    initHTTP();
    bindApplication();
}

function initMap() {
    for(let x = -4; x < 2; x += 1) {
        for(let z = -4; z < 2; z += 1) {
            let color = {
                r: (x % 2) ? .5 : 1,
                g: (z % 2) ? .5 : 1,
                b: ((x + z) % 2) ? .5 : 1,
            };
    
            gameState.map.setTile(x, z, z + x + 10, color);
        }
    }
}

function initWebsocket() {
    const messageHandlers = {
        'identify': (clientId, messageData) => {
            //userIdByClientId[clientId] = messageData.name;
            registerUser(clientId, messageData.name);
            trafficController.broadcast('connection-notice', {name: messageData.name});
        },
        'chat-message': (clientId, messageData) => {
            let name = userIdByClientId[clientId] ?? 'Unknown Client';
            trafficController.broadcast('chat-message', {name: name, text: messageData.text});
        },
        'gamestate': (clientId, messageData, responder) => {
            responder(gameState.serialize());
        },
        'color-tile': (clientId, messageData) => {
            let name = userIdByClientId[clientId] ?? 'Unknown Client';
            let tileId = messageData.tileId;
            let color = messageData.color;
            gameState.map.tiles[tileId].color = color;
    
            trafficController.broadcast('color-tile', {name, tileId, color});
        },
        'join-game': (clientId, messageData) => {
            let userId = userIdByClientId[clientId];
            
            if(userId == null || users[userId] == null)
                return; //FIXME: Throw an error here too.

            let user = users[userId];
            gameState.joinUser(user);
        },
        'leave-game': (clientId, messageData) => {
            let userId = userIdByClientId[clientId];
            
            if(userId == null || users[userId] == null)
                return; //FIXME: Throw an error here too.

            let user = users[userId];
            gameState.removeUser(user);
        },
    }

    //Set up the websocket connection.
    app.ws('/', (ws, req) => {
        try {
            let client = trafficController.registerClient(ws, req, messageHandlers);
            client.setDisconnectHandler(() => {
                console.log({users, userIdByClientId, cid: client.clientId});
                let user = getUserForClient(client);
                console.log({user});

                if(user == null)    //Not identified as a user.
                    return;         //So do nothing. We don't care.

                user.disassociateClientId(client.clientId);

                if(!user.hasConnectedClient()) {
                    //User has completely disconnected.
                    trafficController.broadcast('disconnect-notice', {name: user.displayName});
                }
            });
        } catch(error) {
            log({error});
        }
    });
}

function initHTTP() {
    //Set up the server to use static files from the 'client' directory.
    app.use(express.static('source/client'));

    app.get('/', (req, res) => {
        res.sendFile('source/client/index.html');
    });

    app.get('/shaders', (req, res) => {
        let data = catalogDirectory('source/client/renderer/shaders', 'glsl');
        logMessage({data});
        res.set('Content-Type', 'text/json');
        res.send(data);
    });

    app.get('/logs', (req, res) => {
        let logText = getLogMessages().join('\n');
        res.set('Content-Type', 'text/plain; charset=us-ascii');
        res.send(logText);
    });
}

function bindApplication() {
    //Set up the app to listen on port 8080.
    const port = parseInt(process.env.PORT) || 8080;

    app.listen(port, () => {
        logMessage(`http://localhost:${port}`);
    });
}

function registerUser(clientId, displayName) {
    let userId = displayName.toLowerCase();
    let user = users[userId];

    if(user == null) {
        user = new User(userId);
        users[userId] = user;
    }

    user.associateClientId(clientId);
    user.displayName = displayName;
    userIdByClientId[clientId] = userId;
}

//FIXME: Why not just make the table contain a reference rather than id?
function getUserIdForClient(client) {
    return userIdByClientId[client.clientId];
}

function getUserForClient(client) {
    return users[getUserIdForClient(client)];
}

serverMain();