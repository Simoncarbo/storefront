export class VoteButton {
    constructor(targetElement, coopiaSocket, maxClicks = 5) {
        this.coopiaSocket = coopiaSocket;
        this.ideasManager = null;
        this.clickCount = 0;
        this.maxClicks = maxClicks;

        this.voteButton = document.createElement('button');
        this.voteButton.className = 'btn btn-primary ml-2';
        this.voteButton.setAttribute('aria-label', 'Envoyer');
        // add vote icon to the button
        this.voteButton.innerHTML = `
            <div class="vote-button-content" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;">
                <svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.906 10.7143H13.125C13.3571 10.7143 13.5796 10.8083 13.7437 10.9758C13.9078 11.1432 14 11.3703 14 11.6071C14 11.8439 13.9078 12.071 13.7437 12.2385C13.5796 12.4059 13.3571 12.5 13.125 12.5H0.875C0.642936 12.5 0.420376 12.4059 0.256282 12.2385C0.0921875 12.071 0 11.8439 0 11.6071C0 11.3703 0.0921875 11.1432 0.256282 10.9758C0.420376 10.8083 0.642936 10.7143 0.875 10.7143H2.19975C1.95209 10.4339 1.79785 10.0807 1.75918 9.70533C1.72051 9.32996 1.79939 8.95174 1.9845 8.62497L6.3595 0.89281C6.59157 0.482678 6.9738 0.183413 7.4221 0.0608455C7.8704 -0.0617223 8.34806 0.00244676 8.75 0.239237L13.2965 2.91781C13.6984 3.15462 13.9917 3.54465 14.1118 4.0021C14.2319 4.45956 14.1691 4.94696 13.937 5.3571L10.906 10.7143ZM12.4215 4.46425L7.875 1.78567L3.5 9.51783L5.53 10.7143H8.8865L12.4215 4.46425Z" fill="currentColor"/>
                </svg>
                <span class="vote-timer-text" style="font-size:0.75rem;font-weight:500;color:currentColor;line-height:1;">?</span>
            </div>
        `;
        this.voteTimerText = this.voteButton.querySelector('.vote-timer-text');

        this.countdownInterval = null;

        // ensure svg scales to the button size
        const initialSvg = this.voteButton.querySelector('svg');
        if (initialSvg) {
            initialSvg.style.width = '40%';
            initialSvg.style.height = '40%';
            initialSvg.style.display = 'block';
        }

        // Style the button (start in clickable appearance)
        this.voteButton.style.borderRadius = '50%';
        this.voteButton.style.boxSizing = 'border-box';
        // make the button a square so inner svg scales predictably
        this.voteButton.style.width = '3rem';
        this.voteButton.style.height = this.voteButton.style.width
        this.voteButton.style.padding = '0';
        this.voteButton.style.display = 'inline-flex';
        this.voteButton.style.alignItems = 'center';
        this.voteButton.style.justifyContent = 'center';
        this.voteButton.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)';

        // Apply initial clickable appearance
        this.setNotClickableAppearance();

        this.setOnClick();

        targetElement.appendChild(this.voteButton);
    }

    setClickableAppearance() {
        this.voteButton.disabled = false;
        this.voteButton.style.backgroundColor = '#2563eb';
        this.voteButton.style.border = '0px solid #1e40af';
        this.voteButton.style.color = '#ffffff';
        this.voteButton.style.cursor = 'pointer';
        this.voteButton.style.opacity = '1';

        const svg = this.voteButton.querySelector('svg');
        if (svg) {
            svg.style.display = 'block';
            svg.style.width = '40%';
            svg.style.height = '40%';
        }

        if (this.voteTimerText) {
            this.voteTimerText.style.color = '#ffffff';
            this.voteTimerText.style.fontSize = '0.75rem';
            this.voteTimerText.style.fontWeight = '500';
            this.voteTimerText.textContent = this.voteTimerText.textContent || '?';
        }
    }

    setNotClickableAppearance() {
        this.voteButton.disabled = true;
        // remove visible background and make icon hidden
        this.voteButton.style.backgroundColor = 'transparent';
        this.voteButton.style.border = '1px solid #D1D5DB';
        this.voteButton.style.color = '';
        this.voteButton.style.cursor = 'not-allowed';
        this.voteButton.style.opacity = '1';

        const svg = this.voteButton.querySelector('svg');
        if (svg) {
            svg.style.display = 'none';
        }

        if (this.voteTimerText) {
            this.voteTimerText.style.color = '#9ca3af';
            this.voteTimerText.style.fontSize = '0.9rem';
            this.voteTimerText.style.fontWeight = '500';
            // keep a placeholder symbol if empty
            if (!this.voteTimerText.textContent) this.voteTimerText.textContent = '?';
        }
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
                this.setNotClickableAppearance();
            }
        };
    }

    start_countdown(duration) {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }

        // Accept numeric durations in seconds (may be float from server `time.time()`)
        const durNum = Number(duration);
        if (!Number.isFinite(durNum) || durNum <= 0) {
            if (this.voteTimerText) {
                this.voteTimerText.textContent = '?';
            }
            return;
        }

        // Use integer seconds for the visible countdown (ceil so partial seconds still show)
        let timeLeft = Math.ceil(durNum);
        if (this.voteTimerText) {
            this.voteTimerText.textContent = String(timeLeft);
        }

        this.countdownInterval = setInterval(() => {
            timeLeft -= 1;
            if (this.voteTimerText) {
                this.voteTimerText.textContent = String(Math.max(timeLeft, 0));
            }

            if (timeLeft <= 0) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            } else if (timeLeft <= 10) {
                this.flashCountdownHeartbeat();
            }
        }, 1000);
    }

    flashCountdownHeartbeat() {
        this.countdownFlashOriginalStyles = {
            background: this.voteButton.style.backgroundColor,
            border: this.voteButton.style.border,
            color: this.voteButton.style.color,
        };

        const restoreStyles = () => {
            if (!this.countdownFlashOriginalStyles) {
                return;
            }

            this.voteButton.style.backgroundColor = this.countdownFlashOriginalStyles.background || 'transparent';
            this.voteButton.style.border = this.countdownFlashOriginalStyles.border || '1px solid #D1D5DB';
            this.voteButton.style.color = this.countdownFlashOriginalStyles.color || '';
        };

        this.voteButton.style.backgroundColor = '#ef4444';
        this.voteButton.style.border = '0px solid #dc2626';

        this.countdownFlashTimeout = setTimeout(() => {
            restoreStyles();
            this.countdownFlashTimeout = null;
            this.countdownFlashOriginalStyles = null;
        }, 180);
    }

    reset(maxClicks = null) {
        if (maxClicks !== null) {
            this.maxClicks = maxClicks;
        }

        // Reset click counter
        this.clickCount = 0;
        this.updateClickCounter();
    }

    
    updateClickCounter() {
        // this.voteStatusText.textContent = `${this.clickCount} / ${this.maxClicks}`;
    }
}