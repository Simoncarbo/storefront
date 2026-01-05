import { IdeasManager } from './ideas_manager.js';
import { CoopiaSocketOnMessage } from './websocket_handlers.js';
import { ProcessResultDisplay } from './result_output.js';
import { VoteButton } from './vote_button.js';
import { OverlayMessage } from './overlay_message.js';

const roomName = JSON.parse(document.getElementById('room-name').textContent);

function connectWebSocket() {
    let ws;
    let reconnectDelay = 1000; // start with 1s
    const maxDelay = 10000;    // cap at 10s

    function init() {
        ws = new WebSocket(
            'ws://'
            + window.location.host
            + '/ws/coopiabasewebsockets/'
            + roomName
            + '/'
        );

        ws.onopen = () => {
            console.log("Connected to server");
            reconnectDelay = 1000; // reset backoff

            // Start keepalive ping
            setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send("ping");
                }
            }, 10000);
        };

        // ws.onmessage = (event) => {
        //     console.log("Message:", event.data);
        //     // handle your app messages here
        // };

        ws.onclose = (event) => {
            console.warn("WebSocket closed:", event.code, event.reason);
            reconnect();
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            ws.close();
        };
    }

    function reconnect() {
        console.log(`Reconnecting in ${reconnectDelay / 1000}s...`);
        setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 2, maxDelay); // exponential backoff
            init();
        }, reconnectDelay);
    }

    init();
    return ws;
}
const coopiaSocket = connectWebSocket();

const log = document.querySelector('#process-result-display');
const processResultDisplay = new ProcessResultDisplay(log);

// Vote button functionality
const button_container = document.querySelector('#vote-button');
const voteButton = new VoteButton(button_container, coopiaSocket);

const ideasManager = new IdeasManager(document.getElementById('idea-inputs'),voteButton);

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

coopiaSocket.onmessage = e => CoopiaSocketOnMessage(e, ideasManager,processResultDisplay,voteButton, overlay);

