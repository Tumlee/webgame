import { disableElement, enableElement, hideElement, newElement, setChildren, showElement, onEnterKey, appendAutoscroll } from './dom-util.js';

export class GameConsole {
    constructor() {
        this.container = newElement('div', {class: 'console-container'});
        this.messageWindow = newElement('div', {class: 'console-message-window'});
        this.messageTable = newElement('table', {class: 'console-message-table'});
        this.inputDiv = newElement('div', {class: 'console-input-div'});
        this.inputBox = newElement('input', {class: 'console-input-box'});
        this.inputColor = newElement('input', {type: 'color'});

        setChildren(this.messageWindow, [this.messageTable]);
        setChildren(this.inputDiv, [this.inputBox, this.inputColor]);
        setChildren(this.container, [this.messageWindow, this.inputDiv]);

        this.inputCallback = null;
        onEnterKey(this.inputBox, event => {
            this.inputCallback(this.inputBox.value);
            this.inputBox.value = '';
        });
    }

    getContainer() {
        return this.container;
    }

    enableInput() {
        enableElement(this.inputDiv);
    }

    disableInput() {
        disableElement(this.inputDiv);
    }

    show() {
        showElement(this.container);
    }

    hide() {
        hideElement(this.container);
    }

    log(messageType, messageData) {
        let messageText = this.transformMessageData(messageData);

        let now = new Date();
        let seconds = now.getSeconds();
        let minutes = now.getMinutes();
        let hour = now.getHours();
        seconds = seconds < 10 ? '0' + seconds : seconds;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        hour = hour < 10 ? '0' + hour : hour;
        let timestampText = `${hour}:${minutes}:${seconds}`;

        let newRow = newElement('tr', {class: `console-message-${messageType}`});
        let timestampContainer = newElement('div', {class: 'console-timestamp-container', text: timestampText});
        let timestampCell = newElement('td', {class: `console-timestamp`});
        let messageCell = newElement('td', {class: `console-message-text`, text: messageText});

        setChildren(timestampCell, [timestampContainer]);
        setChildren(newRow, [timestampCell, messageCell]);
        appendAutoscroll(this.messageWindow, this.messageTable, newRow);
    }

    chat(messageData) {
        this.log('chat', messageData);
    }

    info(messageData) {
        this.log('info', messageData);
    }

    warning(messageData) {
        this.log('warning', messageData);
    }

    error(messageData) {
        console.log({errorData: messageData});
        this.log('error', messageData);
    }

    setInputCallback(callback) {
        this.inputCallback = callback;
    }

    transformMessageData(messageData) {
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

    getColor() {
        return this.inputColor.value;
    }
}