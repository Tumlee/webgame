let adjectives = [
    'cloudy',
    'strong',
    'weak',
    'hungry',
    'rich',
    'poor',
    'evil',
    'virtuous',
    'bratty',
    'draconian',
    'scaly',
];

let nouns = [
    'toaster',
    'dragon',
    'rabbit',
    'cat',
    'weasel',
    'printer',
    'motorbike',
    'caddleprod'
];

function randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

document.addEventListener("DOMContentLoaded", event => {
    let connectButton = document.getElementById('connectButton');
    let messageContentElement = document.getElementById('messageContent');
    let messageSendButton = document.getElementById('messageSend');
    let loginNameBox = document.getElementById('loginNameBox');
    let loginWssBox = document.getElementById('loginWssBox');
    let logTable = document.getElementById('logTable');

    let fullName = `${randomElement(adjectives)}-${randomElement(nouns)}`;
    loginNameBox.value = fullName;

    let wsAddress = `wss://${window.location.hostname}:8080/`;
    loginWssBox.value = wsAddress;

    connectButton.addEventListener('click', event => {
        try {
            var ws = new WebSocket(loginWssBox.value);
        } catch(error) {
            console.log({error});
        }

        let sendJson = message => ws.send(JSON.stringify(message));
        ws.onopen = event => {
            console.log('open', {event});
            let connectionName = loginNameBox.value;

            let identifyData = {type: 'identify', name: connectionName};
            console.log({identifyData});
            sendJson(identifyData);

            messageSendButton.addEventListener('click', event => {
                let messageContent = messageContentElement.value;
                console.log('sending', {messageContent});
                sendJson({type: 'chatMessage', content: messageContent});
            });
        };

        ws.onmessage = event => {
            //console.log('message', {event});
            let message = JSON.parse(event.data);
            console.log({receivedMessage: message});

            if(message.type == 'logs') {
                for(const logMessage of message.logMessages) {
                    let tr = document.createElement('tr');
                    let timestampCell = document.createElement('td');
                    let contentCell = document.createElement('td');
                    contentCell.innerHTML = logMessage.message;

                    let date = new Date(logMessage.timestamp);
                    let format = `${date.getHours()}:${date.getMinutes()}`;

                    timestampCell.innerHTML = format;

                    tr.appendChild(timestampCell);
                    tr.appendChild(contentCell);
                    logTable.appendChild(tr);
                }
            }
        };

        ws.onclose = event => {
            console.log('close', {event});
        };

        ws.onerror = event => {
            console.log('error', {event});
        };
    });
});