import { IdeasManager } from './ideas_manager.js';
import { CoopiaSocketOnMessage } from './websocket_handlers.js';
import { ChatLogCommon } from './result_output.js';



const log = document.querySelector('#chat-log-common');
const chatLogCommon = new ChatLogCommon(log);

const roomName = JSON.parse(document.getElementById('room-name').textContent);

const coopiaSocket = new WebSocket(
    'ws://'
    + window.location.host
    + '/ws/coopiabasewebsockets/'
    + roomName
    + '/'
);
const ideasManager = new IdeasManager(document.getElementById('idea-inputs'),chatLogCommon);

coopiaSocket.onmessage = e => CoopiaSocketOnMessage(e, coopiaSocket, ideasManager,chatLogCommon);
coopiaSocket.onclose = e => console.error('Socket closed unexpectedly');


/////////////////////////////////////////

// --- Add button to append selected idea to chat log ---
const appendButton = document.createElement('button');
appendButton.textContent = 'Envoyer vote';
appendButton.className = 'btn btn-primary ml-2'; // Optional styling

// Add vertical space and box styling
appendButton.style.marginTop = '24px'; // Adds vertical space before the button
appendButton.style.backgroundColor = '#f0f4ff'; // Light background color
appendButton.style.border = '2px solid #b3c6ff'; // Box border
appendButton.style.borderRadius = '8px'; // Rounded corners
appendButton.style.padding = '10px 18px'; // Padding inside the button
appendButton.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'; // Subtle shadow

// Insert the button after the idea inputs container
const ideaInputsContainer = document.getElementById('idea-inputs');
ideaInputsContainer.parentNode.insertBefore(appendButton, ideaInputsContainer.nextSibling);

appendButton.addEventListener('click', () => {
    const selectedIdea = ideasManager.getSelectedIdeaValue();
    // if (selectedIdea) {
    chatLogCommon.appendMessage(selectedIdea);
    ideasManager.reset()
    // }
});