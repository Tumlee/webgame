import { GameConsole } from './lib/game-console.js';
import { WsHandler } from './lib/ws-handler.js';
import { Renderer } from './renderer/renderer.js';

function clientMain() {
    //Set up the Websocket handler.
    let wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsAddress = `${wsProtocol}//${window.location.hostname}:${location.port}/`;
    let handler = new WsHandler(wsAddress);

    let gameConsole = new GameConsole();

    handler.setMessageHandler('connection-notice', data => {
        gameConsole.info(`${data.name} has connected to the server.`);
    });

    handler.setMessageHandler('chat-message', data => {
        gameConsole.chat(`[${data.name}] ${data.text}`);
    });

    gameConsole.setInputCallback(text => {
        if(text == '')
            return;
        
        if(text.startsWith('/')) {
            handleConsoleCommand(gameConsole, handler, text.substr(1));
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
        });
    } else {
        gameConsole.info('To connect to the server, type /connect [name]');
        gameConsole.info('To automatically connect every time the page loads, type /autoconnect [name]');
    }

    //let connectionName = localStorage.getItem('last-connected-name') ?? '';
    let mainElement = id => document.getElementById(id);

    let mainWindow = mainElement('mainWindow');
    let canvasElement = mainElement('glCanvas');
    mainWindow.appendChild(gameConsole.getContainer());

    //Set up the renderer.
    let renderer = new Renderer(canvasElement);
}

function randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getLocalVar(varName) {
    return localStorage.getItem(`webgame-${varName}`);
}

function setLocalVar(varName, value) {
    localStorage.setItem(`webgame-${varName}`);
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

function handleConsoleCommand(gameConsole, wsHandler, text) {
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

                    setLocalVar('autoconnect-name', args.name);
                    gameConsole.info('You will now automatically connect with this name every time.');
                });
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