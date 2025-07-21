import { IdeasManager } from './ideas_manager.js';
import { CoopiaSocketOnMessage } from './websocket_handlers.js';
import { ChatLogCommon } from './result_output.js';
import { VoteButton } from './vote_button.js';
import { OverlayMessage } from './overlay_message.js';



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


// Vote button functionality
const button_container = document.querySelector('#vote-button');
const voteButton = new VoteButton(button_container, coopiaSocket, ideasManager);

// Example usage:
// voteButton.updateVoteStatus('waiting');
// voteButton.updateVoteStatus('countdown', 15);
// voteButton.updateVoteStatus('');


const overlay = new OverlayMessage(); // Default message

// To show the overlay
// overlay.showWithPhases('decision'); // or overlay.show("Un autre message...")
// overlay.showWithPhases('propagation');

// To hide the overlay
// overlay.hide();
