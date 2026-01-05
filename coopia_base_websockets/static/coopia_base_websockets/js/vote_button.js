export class VoteButton {
    constructor(targetElement, coopiaSocket, maxClicks = 5) {
        this.coopiaSocket = coopiaSocket;
        this.ideasManager = null;
        this.clickCount = 0;
        this.maxClicks = maxClicks;

        this.voteButton = document.createElement('button');
        this.voteButton.textContent = 'Envoyer';
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
        this.voteStatusText.textContent = `0 / ${this.maxClicks}`;
        this.voteStatusText.style.color = '#4a5568'; // default gray
        this.voteStatusText.style.fontSize = '16px';
        this.voteStatusText.style.fontFamily = 'sans-serif';

        // Append button and text
        this.voteContainer.appendChild(this.voteButton);
        this.voteContainer.appendChild(this.voteStatusText);

        // Insert container
        targetElement.appendChild(this.voteContainer);
    }

    // connect a IdeasManager instance so it can gather idea values on click
    connect(ideasManager) {
        this.ideasManager = ideasManager;
    }

    disconnect() {
        this.ideasManager = null;
    }

    setOnClick() {
        this.voteButton.onclick = () => {
            const selectedIdea = this.ideasManager.getSelectedIdeaValue();
            const notSelectedIdea = this.ideasManager.getNotSelectedIdeaValue()

            if (selectedIdea === null || selectedIdea === "") {
                return;
            }
            
            if (notSelectedIdea === null) {
                this.coopiaSocket.send(JSON.stringify({
                    type: 'idea',
                    idea: selectedIdea
                }));
            } else {
                this.coopiaSocket.send(JSON.stringify({
                    type: 'preference',
                    winner: selectedIdea,
                    loser: notSelectedIdea
                }));
            }

            this.ideasManager.reset();    

            this.clickCount++;
            this.updateClickCounter();

            if (this.clickCount >= this.maxClicks) {
                this.disableButton();
            }
        };
    }

    updateClickCounter() {
        this.voteStatusText.textContent = `${this.clickCount} / ${this.maxClicks}`;
    }

    disableButton() {
        this.voteButton.disabled = true;
        this.voteButton.style.backgroundColor = '#e2e8f0';
        this.voteButton.style.border = '2px solid #cbd5e0';
        this.voteButton.style.color = '#a0aec0';
        this.voteButton.style.cursor = 'not-allowed';
        this.voteButton.style.opacity = '0.6';

        // append to voteStatusText that limit has been reached
        this.voteStatusText.textContent += " (limite sur le nombre d'envois atteinte)";

        // this.voteStatusText.style.color = '#a0aec0';
    }

    setVoteButtonText(text) {
        this.voteButton.textContent = text;
    }


    reset(maxClicks = null) {
        if (maxClicks !== null) {
            this.maxClicks = maxClicks;
        }

        // Reset voteButton color to original
        this.voteButton.disabled = false;
        this.voteButton.style.backgroundColor = '#f0f4ff';
        this.voteButton.style.border = '2px solid #b3c6ff';
        this.voteButton.style.color = '';
        this.voteButton.style.cursor = '';
        this.voteButton.style.opacity = '';

        // Reset click counter
        this.clickCount = 0;
        this.updateClickCounter();
        this.voteStatusText.style.color = '#4a5568';
    }
}