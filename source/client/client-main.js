import { Camera } from './camera.js';
import { GameMap } from './game-map.js';
import { newElement } from './lib/dom-util.js';
import { GameConsole } from './lib/game-console.js';
import { WsHandler } from './lib/ws-handler.js';
import { Renderer } from './renderer/renderer.js';

const canvasWidth = 800;
const canvasHeight = 600;

function requestInitialMap(wsHandler) {
    let map = new GameMap();

    return wsHandler.sendRequest('gamestate', {}).then(response => {
        for(const tile of Object.values(response.map.tiles)) {
            map.setTile(tile.c, tile.r, tile.h, tile.color);
        }

        return map;
    });
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255.0,
      g: parseInt(result[2], 16) / 255.0,
      b: parseInt(result[3], 16) / 255.0
    } : null;
  }

let basicStep = null;

function clientMain() {
    //Set up the Websocket handler.
    let wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsAddress = `${wsProtocol}//${window.location.hostname}:${location.port}/`;
    let handler = new WsHandler(wsAddress);
    let gameConsole = new GameConsole();
    let camera = new Camera(canvasWidth, canvasHeight);
    let renderer = new Renderer(gameConsole, canvasWidth, canvasHeight);

    //Attach stuff to the main window.
    let mainElement = id => document.getElementById(id);
    let mainWindow = mainElement('mainWindow');
    let upperSection = newElement('div', {class: 'main-upper-section'});
    let sidePanel = newElement('div', {class: 'main-side-panel'});
    let infoPanel = newElement('div', {class: 'main-info-panel', text: 'INFO'});
    let promptPanel = newElement('div', {class: 'main-prompt-panel', text: 'PROMPT'});

    sidePanel.appendChild(infoPanel);
    sidePanel.appendChild(promptPanel);
    upperSection.appendChild(renderer.getCanvas());
    upperSection.appendChild(sidePanel);
    mainWindow.appendChild(upperSection);
    mainWindow.appendChild(gameConsole.getContainer());

    camera.precomputeRenderingVars();

    handler.setMessageHandler('connection-notice', data => {
        gameConsole.info(`${data.name} has connected to the server.`);
    });

    handler.setMessageHandler('disconnect-notice', data => {
        gameConsole.info(`${data.name} has disconnected.`);
    });

    handler.setMessageHandler('chat-message', data => {
        gameConsole.chat(`[${data.name}] ${data.text}`);
    });

    handler.setMessageHandler('user-joined', data => {
        gameConsole.info(`${data.id} has joined the game.`);
    });

    handler.setMessageHandler('user-left', data => {
        gameConsole.info(`${data.id} has left the game.`);
    });

    handler.setMessageHandler('current-user', data => {
        gameConsole.info(`It is now ${data.id}'s turn.`);
    });

    gameConsole.setInputCallback(text => {
        if(text == '')
            return;
        
        if(text.startsWith('/')) {
            handleConsoleCommand(gameConsole, handler, text.substr(1), camera, renderer);
        } else {
            if(handler.isConnected())
                handler.sendMessage('chat-message', {text: text});
            else
                gameConsole.error(`You can't chat when you're disconnected.`);
        }
    });

    //Check if we have an autoconnect name set.
    let autoconnectName = getLocalVar('autoconnect-name');

    if(autoconnectName != null) {
        handler.openConnection(() => {
            gameConsole.info(`You are now connected! Identifying as ${autoconnectName}...`);
            handler.sendMessage('identify', {name: autoconnectName});
            mapMain(handler, renderer, camera, gameConsole);
        });
    } else {
        gameConsole.info('To connect to the server, type /connect [name]');
        gameConsole.info('To automatically connect every time the page loads, type /autoconnect [name]');
    }
}

function mapMain(handler, renderer, camera, gameConsole) {
    requestInitialMap(handler).then(gameMap => {
        handler.setMessageHandler('color-tile', messageData => {
            let tile = gameMap.tiles[messageData.tileId];
            tile.color = messageData.color;
            gameConsole.info(`${messageData.name} colored tile (${tile.c}, ${tile.r})`);
            gameMap.draw(basicStep, camera);
            renderer.render();
        });

        renderer.getCanvas().addEventListener('click', event => {
            let mousePos = getMousePos(renderer.getCanvas(), event);
            let transformedMousePos = {
                x: (mousePos.x * 2) - 1,
                y: 1 - (mousePos.y * 2),
            };
    
            let result = gameMap.detectClick(transformedMousePos);
    
            if(result && result.subId == 'floor') {
                let color = hexToRgb(gameConsole.getColor());
                handler.sendMessage('color-tile', {tileId: result.id, color: color});
            }
        });
    
        renderer.init().then(() => {
            basicStep = renderer.addRenderingStep('basic');
    
            handler.sendRequest('gamestate', {}).then(response => {
                console.log({response});
            });
        
            gameMap.draw(basicStep, camera);
            basicStep.pendingUniforms.uColor = [1, 1, 1, 1];
            renderer.render();
        }).catch(error => gameConsole.error(error));
    });
}

function randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getLocalVar(varName) {
    try {
        return localStorage.getItem(`webgame-${varName}`);
    } catch(error) {
        return null;
    }
}

function setLocalVar(varName, value) {
    localStorage.setItem(`webgame-${varName}`, value);
}

function splitArgs(input) {
	//Found on: https://stackoverflow.com/questions/2817646/javascript-split-string-on-space-or-on-quotes-to-array
	//The parenthesis in the regex creates a captured group within the quotes
    //Apparently this code doesn't actually work properly with escape sequences, because it's a fucking regex
    //so I'll eventually have to rewrite this bullshit myself.
	const regExp = /[^\s"]+|"([^"]*)"/gi;
	let finalArray = [];
	let match = null;

	do {
		//Each call to exec returns the next regex match as an array
		match = regExp.exec(input);
		if (match != null) {
			//Index 1 in the array is the captured group if it exists
			//Index 0 is the matched text, which we use if no captured group exists
			finalArray.push(match[1] ? match[1] : match[0]);
		}
	} while (match != null);

	return finalArray;
}

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: (evt.clientX - rect.left) / (rect.right - rect.left),
        y: (evt.clientY - rect.top) / (rect.bottom - rect.top)
    };
}

function handleConsoleCommand(gameConsole, wsHandler, text, camera, renderer) {
    let tokens = splitArgs(text);

    if(tokens.length == 0)
        return;

    let commandName = tokens.shift().toLowerCase();

    let commands = {
        connect: {
            description: 'Connect to the server.',
            args: ['name'],
            execute(args) {
                wsHandler.openConnection(() => {
                    gameConsole.info(`You are now connected! Identifying as ${args.name}...`);
                    wsHandler.sendMessage('identify', {name: args.name});
                    mapMain(wsHandler, renderer, camera, gameConsole);
                });
            }
        },
        autoconnect: {
            description: 'Set client to automatically connect to the server when the page loads.',
            args: ['name'],
            execute(args) {
                wsHandler.openConnection(() => {
                    gameConsole.info(`You are now connected! Identifying as ${args.name}...`);
                    wsHandler.sendMessage('identify', {name: args.name});
                    mapMain(wsHandler, renderer, camera, gameConsole);

                    setLocalVar('autoconnect-name', args.name);
                    gameConsole.info('You will now automatically connect with this name every time.');
                });
            }
        },
        join: {
            description: 'Join the game.',
            execute(args) {
                wsHandler.sendMessage('join-game', {});
            }
        },
        leave: {
            description: 'Leave the game and continue as a spectator.',
            execute(args) {
                wsHandler.sendMessage('leave-game', {});
            }
        },
        help: {
            description: 'Show this help menu',
            execute(args) {
                let lines = [];

                for(const commandId of Object.keys(commands)) {
                    let command = commands[commandId];
                    let argList = command.args ?? [];
                    lines.push(`  /${commandId} ${argList.map(a => `[${a}]`).join(' ')}`);
                    lines.push(`      ${command.description}`);
                    lines.push('');
                }

                gameConsole.info(lines.join('\n'));
            }
        }
    };

    let chosenCommand = commands[commandName];

    if(chosenCommand == null) {
        gameConsole.error(`Unknown command '${commandName}', type /help to see a list of commands.`);
        return;
    }

    //Build the argument object.
    let argList = chosenCommand.args ?? [];
    let argNum = 0;
    let argObject = {};

    for(const argName of argList) {
        argObject[argName] = tokens[argNum];

        if(argObject[argName] == null) {
            gameConsole.error(`Usage:  /${commandName} ${argList.map(a => `[${a}]`).join(' ')}`);
            return;
        }

        argNum = argNum + 1;
    }

    try {
        chosenCommand.execute(argObject);
    } catch(error) {
        gameConsole.error('There was an error running this command. Check the Javascript console (F12) for more details.');
        console.log({error});
    }
}

document.addEventListener("DOMContentLoaded", event => clientMain());