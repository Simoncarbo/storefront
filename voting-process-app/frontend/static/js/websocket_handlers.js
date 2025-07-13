// filepath: voting-process-app/frontend/static/js/websocket_handlers.js

import { VoteProcessUI } from './vote_process.js';

export function handleVoteMessage(e, voteProcessUI) {
    const data = JSON.parse(e.data);

    if (data.type === 'vote_result') {
        // Update the UI with the result of the voting process
        voteProcessUI.updateUI(data.selectedIdea);
    } else {
        console.error('Unknown message type:', data.type);
    }
}