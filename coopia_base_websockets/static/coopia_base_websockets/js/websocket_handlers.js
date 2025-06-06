import { startCountdown } from './vote_process.js';

export function CoopiaSocketOnMessage(e, CoopiaSocket, IdeasManager) {
    const data = JSON.parse(e.data);

    if (data.type === 'common') {
        // document.querySelector('#chat-log-common').value += (data.message);
        const log = document.querySelector('#chat-log-common');

        // Remove previous caret if any
        const oldCaret = log.querySelector('.blinking-caret');
        if (oldCaret) {
            oldCaret.remove();
        }

        // Append new message
        const messageSpan = document.createElement('span');
        messageSpan.textContent = data.message;
        log.appendChild(messageSpan);

        // Add blinking caret
        const caret = document.createElement('span');
        caret.className = 'blinking-caret';
        log.appendChild(caret);

        // Scroll to bottom
        log.scrollTop = log.scrollHeight;
    } else if (data.type === 'promoted_idea') {
        // Check if the idea is already present
        if (!IdeasManager.isIdeaPresent(data.message)) {
            IdeasManager.addInput(data.message)
        } else {
            // Send the message back through the WebSocket
            CoopiaSocket.send(e.data);
        }
    } else if (data.type === 'roundinfo') {
        // Set the task description if provided
        if (data.task_description !== undefined) {
            document.getElementById('task-description').textContent = data.task_description;
        }
        
        IdeasManager.reset(data.nb_idea_promotions);
        IdeasManager.updateGlobalCountDisplay();

        // Start countdown
        if (data.round_duration) {
            startCountdown(data.round_duration);
        }
    } else if (data.type === 'request_vote') {
        // Find the selected radio value
        const selected = document.querySelector('input[name="selectedIdeaInput"]:checked');
        const value = selected ? selected.value : '';
        CoopiaSocket.send(JSON.stringify({
            type: "vote.response",
            request_id: data.request_id,
            value: value
        }));
    } else {
        console.error('Unknown message type:', data.type);
    }
};