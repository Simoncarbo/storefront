import { IdeasManager } from './ideas_manager.js';
import { CoopiaSocketOnMessage } from './websocket_handlers.js';



// new line added to avoid weird indent at first line
const log = document.querySelector('#chat-log-common');
log.textContent = '\n';

const roomName = JSON.parse(document.getElementById('room-name').textContent);

const CoopiaSocket = new WebSocket(
    'ws://'
    + window.location.host
    + '/ws/coopiabasewebsockets/'
    + roomName
    + '/'
);
const manager = new IdeasManager(CoopiaSocket, document.getElementById('idea-inputs'), 5); // 5 max submissions

CoopiaSocket.onmessage = e => CoopiaSocketOnMessage(e, CoopiaSocket, manager);
CoopiaSocket.onclose = e => console.error('Socket closed unexpectedly');