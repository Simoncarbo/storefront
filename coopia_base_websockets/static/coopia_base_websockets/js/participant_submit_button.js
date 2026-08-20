export class ParticipantSubmitButton {
    constructor(targetElement) {
        this.submitButton = document.createElement('button');
        this.submitButton.className = 'btn btn-primary ml-2';
        this.submitButton.setAttribute('aria-label', 'Envoyer');
        // add vote icon to the button (old icon)
        // this.submitButton.innerHTML = `
        //     <div class="vote-button-content" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;">
        //         <svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
        //             <path d="M10.906 10.7143H13.125C13.3571 10.7143 13.5796 10.8083 13.7437 10.9758C13.9078 11.1432 14 11.3703 14 11.6071C14 11.8439 13.9078 12.071 13.7437 12.2385C13.5796 12.4059 13.3571 12.5 13.125 12.5H0.875C0.642936 12.5 0.420376 12.4059 0.256282 12.2385C0.0921875 12.071 0 11.8439 0 11.6071C0 11.3703 0.0921875 11.1432 0.256282 10.9758C0.420376 10.8083 0.642936 10.7143 0.875 10.7143H2.19975C1.95209 10.4339 1.79785 10.0807 1.75918 9.70533C1.72051 9.32996 1.79939 8.95174 1.9845 8.62497L6.3595 0.89281C6.59157 0.482678 6.9738 0.183413 7.4221 0.0608455C7.8704 -0.0617223 8.34806 0.00244676 8.75 0.239237L13.2965 2.91781C13.6984 3.15462 13.9917 3.54465 14.1118 4.0021C14.2319 4.45956 14.1691 4.94696 13.937 5.3571L10.906 10.7143ZM12.4215 4.46425L7.875 1.78567L3.5 9.51783L5.53 10.7143H8.8865L12.4215 4.46425Z" fill="currentColor"/>
        //         </svg>
        //         <span class="vote-timer-text" style="font-size:0.75rem;font-weight:500;color:currentColor;line-height:1;">?</span>
        //     </div>
        // `;
        this.submitButton.innerHTML = `
            <div class="vote-button-content" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.25rem;padding-block:0.25rem;">
                <svg width="52" height="44" viewBox="0 0 52 44" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M23.712 1.83126C24.2045 0.990296 25.0151 0.376649 25.9657 0.125083C26.9163 -0.126483 27.9292 0.00459937 28.782 0.489543L37.1429 5.2552C37.9959 5.74134 38.6184 6.54203 38.8733 7.48113C39.1283 8.42024 38.9948 9.42083 38.5023 10.2628L33.7814 18.3388H37.1429C37.6354 18.3388 38.1078 18.5319 38.4561 18.8756C38.8043 19.2194 39 19.6856 39 20.1717C39 20.6578 38.8043 21.1241 38.4561 21.4678C38.1078 21.8115 37.6354 22.0047 37.1429 22.0047H14.8571C14.3646 22.0047 13.8922 21.8115 13.5439 21.4678C13.1957 21.1241 13 20.6578 13 20.1717C13 19.6856 13.1957 19.2194 13.5439 18.8756C13.8922 18.5319 14.3646 18.3388 14.8571 18.3388H17.3643C16.7539 17.7726 16.3554 17.0195 16.2333 16.2016C16.1113 15.3837 16.2729 14.5492 16.692 13.8334L23.712 1.83126ZM24.5923 18.3388H29.4914L35.2857 8.42986L26.9286 3.6642L19.9086 15.6663L24.5923 18.3388ZM13.0557 11.007H14.0549L13.4717 12.0004C12.9629 12.8729 12.6546 13.8041 12.5357 14.7462C12.1353 14.8618 11.7859 15.1072 11.544 15.4427L4.13771 25.6705H47.8623L40.456 15.4427C40.3355 15.2753 40.1873 15.1291 40.0177 15.0101L41.7189 12.0958C41.7709 12.0078 41.8204 11.9173 41.8674 11.8245C42.4996 12.2084 43.0477 12.7132 43.4794 13.3092L50.9637 23.647C51.636 24.5818 52 25.6999 52 26.8436V38.5012C52 39.9595 51.413 41.3582 50.3682 42.3894C49.3233 43.4207 47.9062 44 46.4286 44H5.57143C4.09379 44 2.67668 43.4207 1.63183 42.3894C0.586988 41.3582 0 39.9595 0 38.5012V26.8436C0.00131378 25.6984 0.364897 24.5821 1.04 23.6506L8.52057 13.3128C9.03546 12.6003 9.71524 12.0194 10.5034 11.6183C11.2915 11.2173 12.169 11.0077 13.0557 11.007ZM48.2857 29.3364H3.71429V38.5012C3.71429 38.9873 3.90995 39.4535 4.25823 39.7973C4.60651 40.141 5.07888 40.3341 5.57143 40.3341H46.4286C46.9211 40.3341 47.3935 40.141 47.7418 39.7973C48.0901 39.4535 48.2857 38.9873 48.2857 38.5012V29.3364Z" fill="white"/>
</svg>

            <span class="vote-timer-text" style="font-size:0.4rem;font-weight:500;color:currentColor;line-height:1;">?</span>
            </div>
        `;
        this.voteTimerText = this.submitButton.querySelector('.vote-timer-text');

        this.countdownInterval = null;

        // Style the button (start in clickable appearance)
        this.submitButton.style.borderRadius = '50%';
        this.submitButton.style.boxSizing = 'border-box';
        // make the button a square so inner svg scales predictably
        this.submitButton.style.width = '3rem';
        this.submitButton.style.height = this.submitButton.style.width
        this.submitButton.style.padding = '0';
        this.submitButton.style.display = 'inline-flex';
        this.submitButton.style.alignItems = 'center';
        this.submitButton.style.justifyContent = 'center';
        this.submitButton.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)';

        // Apply initial clickable appearance
        this.setNotClickableAppearance();

        targetElement.appendChild(this.submitButton);
    }

    setClickableAppearance() {
        this.submitButton.disabled = false;
        this.submitButton.style.backgroundColor = '#6D28D9'; // #8B5CF6 #6D28D9 #4F46E5
        this.submitButton.style.border = '0px solid #1e40af';
        this.submitButton.style.color = '#ffffff';
        this.submitButton.style.cursor = 'pointer';
        this.submitButton.style.opacity = '1';

        const svg = this.submitButton.querySelector('svg');
        if (svg) {
            svg.style.display = 'block';
            svg.style.width = '50%';
            svg.style.height = '50%';
        }

        if (this.voteTimerText) {
            this.voteTimerText.style.color = '#ffffff';
            this.voteTimerText.style.fontSize = '0.65rem';
            this.voteTimerText.style.fontWeight = '500';
            this.voteTimerText.textContent = this.voteTimerText.textContent || '?';
        }

        this.countdownFlashOriginalStyles = {
            background: this.submitButton.style.backgroundColor,
            border: this.submitButton.style.border,
            color: this.submitButton.style.color,
        };
    }

    setNotClickableAppearance() {
        this.submitButton.disabled = true;
        // remove visible background and make icon hidden
        this.submitButton.style.backgroundColor = 'transparent';
        this.submitButton.style.border = '1px solid #D1D5DB';
        this.submitButton.style.color = '';
        this.submitButton.style.cursor = 'not-allowed';
        this.submitButton.style.opacity = '1';

        const svg = this.submitButton.querySelector('svg');
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

        // specifies which styles should be set after a countdown flash
        this.countdownFlashOriginalStyles = {
            background: this.submitButton.style.backgroundColor,
            border: this.submitButton.style.border,
            color: this.submitButton.style.color,
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
        const formatCountdownText = (totalSeconds) => {
            const safeSeconds = Math.max(0, Math.floor(totalSeconds));
            const minutes = Math.floor(safeSeconds / 60);
            const seconds = safeSeconds % 60;
            return `${minutes}:${String(seconds).padStart(2, '0')}`;
        };

        if (this.voteTimerText) {
            this.voteTimerText.textContent = formatCountdownText(timeLeft);
        }

        this.countdownInterval = setInterval(() => {
            timeLeft -= 1;
            if (this.voteTimerText) {
                this.voteTimerText.textContent = formatCountdownText(Math.max(timeLeft, 0));
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
        const restoreStyles = () => {
            if (!this.countdownFlashOriginalStyles) {
                return;
            }

            this.submitButton.style.backgroundColor = this.countdownFlashOriginalStyles.background || 'transparent';
            this.submitButton.style.border = this.countdownFlashOriginalStyles.border || '1px solid #D1D5DB';
            this.submitButton.style.color = this.countdownFlashOriginalStyles.color || '';
        };

        this.submitButton.style.backgroundColor = '#ef4444';
        this.submitButton.style.border = '0px solid #dc2626';

        this.countdownFlashTimeout = setTimeout(() => {
            restoreStyles();
            this.countdownFlashTimeout = null;
        }, 180);
    }

    remove() {
        this.targetElement.removeChild(this.submitButton);
    }
}