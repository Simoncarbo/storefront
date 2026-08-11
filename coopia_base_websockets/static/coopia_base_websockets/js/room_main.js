import { IdeasManager } from './ideas_manager.js';
import { CoopiaSocketOnMessage } from './websocket_handlers.js';
import { ProcessResultDisplay } from './result_output.js';

const roomName = JSON.parse(document.getElementById('room-name').textContent);

let coopiaSocket;
let onmessageHandler;

function connectWebSocket() {
    let reconnectDelay = 1000; // start with 1s
    const maxDelay = 10000;    // cap at 10s
    let keepaliveInterval;

    function init() {
        // Determine the secure or insecure scheme dynamically
        const wsScheme = window.location.protocol === 'https:' ? 'wss://' : 'ws://';

        coopiaSocket = new WebSocket(
            wsScheme
            + window.location.host
            + '/ws/coopiabasewebsockets/'
            + roomName
            + '/'
        );

        coopiaSocket.onopen = () => {
            console.log("Connected to server");
            reconnectDelay = 1000; // reset backoff

            // Start keepalive ping
            keepaliveInterval = setInterval(() => {
                if (coopiaSocket.readyState === WebSocket.OPEN) {
                    coopiaSocket.send("ping");
                }
            }, 10000);
        };

        coopiaSocket.onclose = (event) => {
            console.warn("WebSocket closed:", event.code, event.reason);
            if (keepaliveInterval) {
                clearInterval(keepaliveInterval);
                keepaliveInterval = null;
            }
            reconnect();
        };

        coopiaSocket.onerror = (error) => {
            console.error("WebSocket error:", error);
            coopiaSocket.close();
        };

        if (onmessageHandler) {
            coopiaSocket.onmessage = onmessageHandler;
        }
    }

    function reconnect() {
        console.log(`Reconnecting in ${reconnectDelay / 1000}s...`);
        setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 2, maxDelay); // exponential backoff
            init();
        }, reconnectDelay);
    }

    init();
}

connectWebSocket();

const log = document.querySelector('#process-result-display');
const processResultDisplay = new ProcessResultDisplay(log, document.getElementById('participant-container'));

// participant input functionality
const participant_submit_button_container = document.querySelector('#participant-submit-button');
const participant_input_container = document.getElementById('participant-input-container')
const ideasManager = new IdeasManager(participant_input_container,participant_submit_button_container, coopiaSocket);

onmessageHandler = e => CoopiaSocketOnMessage(e, ideasManager,processResultDisplay);
coopiaSocket.onmessage = onmessageHandler;

