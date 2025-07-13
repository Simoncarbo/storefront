class VoteProcessUI {
    constructor() {
        this.voteButton = document.getElementById('vote-button');
        this.statusDisplay = document.getElementById('status-display');
        this.ideaInput = document.getElementById('idea-input');
        this.voteCountDisplay = document.getElementById('vote-count-display');
        this.votes = [];
        this.init();
    }

    init() {
        this.voteButton.addEventListener('click', () => this.sendVote());
    }

    sendVote() {
        const idea = this.ideaInput.value;
        if (idea) {
            const message = {
                type: 'vote',
                idea: idea
            };
            // Send the vote to the backend via WebSocket
            this.websocket.send(JSON.stringify(message));
            this.ideaInput.value = ''; // Clear input after sending
        } else {
            this.updateUI('Please enter an idea to vote for.');
        }
    }

    updateUI(message) {
        this.statusDisplay.textContent = message;
        // Additional UI updates can be added here
    }

    setWebSocket(websocket) {
        this.websocket = websocket;
        this.websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'vote_result') {
                this.updateUI(`Vote received for idea: ${data.idea}`);
                this.voteCountDisplay.textContent = `Total Votes: ${data.totalVotes}`;
            }
        };
    }
}