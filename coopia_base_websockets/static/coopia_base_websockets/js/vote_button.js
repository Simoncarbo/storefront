export class VoteButton {
    constructor(targetElement, coopiaSocket, ideasManager) {
        this.coopiaSocket = coopiaSocket;
        this.ideasManager = ideasManager;

        this.voteButton = document.createElement('button');
        this.voteButton.textContent = 'Envoyer l\'idée pour l\'étape d\'inspiration';
        this.voteButton.className = 'btn btn-primary ml-2';

        // Style the button
        // this.voteButton.style.marginTop = '15px';
        this.voteButton.style.backgroundColor = '#f0f4ff';
        this.voteButton.style.border = '2px solid #b3c6ff';
        this.voteButton.style.borderRadius = '8px';
        this.voteButton.style.padding = '10px 18px';
        this.voteButton.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)';

        this.setOnClick();

        // Create container
        this.voteContainer = document.createElement('div');
        this.voteContainer.style.display = 'flex';
        this.voteContainer.style.alignItems = 'flex-end';
        this.voteContainer.style.gap = '16px';
        this.voteContainer.style.marginTop = '15px';

        // Create status text
        this.voteStatusText = document.createElement('span');
        this.voteStatusText.textContent = '';
        this.voteStatusText.style.color = '#4a5568'; // default gray
        this.voteStatusText.style.fontSize = '16px';
        this.voteStatusText.style.fontFamily = 'sans-serif';

        // Append button and text
        this.voteContainer.appendChild(this.voteButton);
        this.voteContainer.appendChild(this.voteStatusText);

        // Insert container
        targetElement.appendChild(this.voteContainer);

        // Inject pulse keyframes once
        if (!document.getElementById('pulse-keyframes-style')) {
            const style = document.createElement('style');
            style.id = 'pulse-keyframes-style';
            style.textContent = `
            @keyframes pulse {
              0% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.5); opacity: 0.5; }
              100% { transform: scale(1); opacity: 1; }
            }`;
            document.head.appendChild(style);
        }

        // Internal countdown interval reference
        this.countdownInterval = null;
    }

    setOnClick() {
        this.voteButton.onclick = () => {
            // Disable buttons
            document.querySelectorAll("button").forEach(el => el.disabled = true);
            // Disable input fields (text, checkbox, radio, etc.)
            document.querySelectorAll("input").forEach(el => el.disabled = true);
            // Disable textareas
            document.querySelectorAll("textarea").forEach(el => el.disabled = true);
            // Disable selects
            document.querySelectorAll("select").forEach(el => el.disabled = true);

            // Change voteButton color to indicate it's disabled
            this.voteButton.style.backgroundColor = '#d1d5db'; // light gray
            this.voteButton.style.border = '2px solid #a0aec0'; // gray border
            this.voteButton.style.color = '#888';
            
            const selectedIdea = this.ideasManager.getSelectedIdeaValue();
            
            this.coopiaSocket.send(JSON.stringify({
                type: 'vote',
                idea: selectedIdea
            }));
            this.updateVoteStatus('waiting');
            
        };
    }

    setVoteButtonText(text) {
        this.voteButton.textContent = text;
    }

    updateVoteStatus(statusType, secondsRemaining = null) {
        // Clear any existing countdown
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }

        this.voteStatusText.innerHTML = '';
        this.voteStatusText.style.color = '#4a5568'; // Reset color to gray
        this.voteStatusText.style.animation = '';

        if (statusType === 'waiting') {
            const dot = document.createElement('span');
            dot.style.display = 'inline-block';
            dot.style.width = '10px';
            dot.style.height = '10px';
            dot.style.marginRight = '8px';
            dot.style.borderRadius = '50%';
            dot.style.backgroundColor = '#4a90e2';
            dot.style.animation = 'pulse 1.5s infinite ease-in-out';

            this.voteStatusText.appendChild(dot);
            this.voteStatusText.appendChild(document.createTextNode('En attente des autres participants'));
            
            // Append vote percentage
            const percentageSpan = document.createElement('span');
            percentageSpan.id = 'vote_percentage';
            // percentageSpan.style.marginLeft = '8px';
            percentageSpan.textContent = ` (?%)`;
            this.voteStatusText.appendChild(percentageSpan);
            

        } else if (statusType === 'countdown' && typeof secondsRemaining === 'number') {
            this.voteStatusText.style.color = '#e53e3e'; // red for urgency
            this.voteStatusText.textContent = `Fin du vote dans ${secondsRemaining} secondes`;

            this.countdownInterval = setInterval(() => {
                secondsRemaining--;
                if (secondsRemaining > 0) {
                    this.voteStatusText.textContent = `Fin du vote dans ${secondsRemaining} secondes`;
                } else {
                    this.voteStatusText.textContent = 'Fin du vote';
                    clearInterval(this.countdownInterval);
                    this.countdownInterval = null;
                }
            }, 1000);

        } else if (statusType === 'tirage') {
            this.voteStatusText.style.color = '#4a90e2'; // blue
            this.voteStatusText.textContent = 'Tirage au sort en cours';
            this.voteStatusText.style.animation = 'blink 1s steps(2, start) infinite';

            // Inject blink keyframes once
            if (!document.getElementById('blink-keyframes-style')) {
                const style = document.createElement('style');
                style.id = 'blink-keyframes-style';
                style.textContent = `
                @keyframes blink {
                  0% { opacity: 1; }
                  50% { opacity: 0; }
                  100% { opacity: 1; }
                }`;
                document.head.appendChild(style);
            }
        } else {
            this.voteStatusText.textContent = '';
        }
    }

    reset() {
        // Re-enable all buttons
        document.querySelectorAll("button").forEach(el => el.disabled = false);
        // Re-enable input fields (text, checkbox, radio, etc.)
        document.querySelectorAll("input").forEach(el => el.disabled = false);
        // Re-enable textareas
        document.querySelectorAll("textarea").forEach(el => el.disabled = false);
        // Re-enable selects
        document.querySelectorAll("select").forEach(el => el.disabled = false);

        // Clear vote status
        this.updateVoteStatus('');

    // Reset voteButton color to original
    this.voteButton.style.backgroundColor = '#f0f4ff';
    this.voteButton.style.border = '2px solid #b3c6ff';
    this.voteButton.style.color = '';
    }
}
