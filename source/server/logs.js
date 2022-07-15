let logMessages = [];

export function logMessage(data0, data1, data2) {
    if(data1 == null && data2 == null)
        console.log(data0);
    else if(data2 == null)
        console.log(data0, data1);
    else 
        console.log(data0, data1, data2);

    for(const data of [data0, data1, data2]) {
        if(data != null)
            logMessages.push(transformMessageData(data));
    }
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