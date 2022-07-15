let logMessages = [];

export function logMessage(data) {
    console.log(data);
    logMessages.push(transformMessageData(data));
}

export function getLogMessages() {
    return logMessages;
}

function transformMessageData(messageData) {
    if(typeof messageData === 'string')
        return messageData;

    if(messageData instanceof Error) {
        let indentedStack = messageData.stack.split('\n')
            .filter(line => line.length != 0)
            .map(line => `    ${line}`)
            .join('\n');

        return `${messageData.message}\n${indentedStack}`;
    }

    if(messageData instanceof Object) {
        return JSON.stringify(messageData, null, 2);
    }

    return '(Unknown data)';
}