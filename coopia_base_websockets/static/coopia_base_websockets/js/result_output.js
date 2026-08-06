export class ProcessResultDisplay {
    constructor(logElement) {
        this.logElement = logElement;
        this.placeholderDiv = null;
    }

    ensureInitialNewline() {
        if (!this.logElement.textContent.startsWith('\n')) {
            this.logElement.textContent = '\n' + this.logElement.textContent;
        }
    }

    clearPlaceholder() {
        if (this.placeholderDiv) {
            this.placeholderDiv.remove();
            this.placeholderDiv = null;
        }
    }

    addPlaceholder(placeholderText) {
        this.clearPlaceholder();
        this.placeholderDiv = document.createElement('div');
        this.placeholderDiv.textContent = placeholderText;
        this.placeholderDiv.style.color = '#aaa';
        // this.placeholderDiv.style.fontStyle = 'italic';
        this.placeholderDiv.style.marginLeft = '0.5em';
        this.logElement.appendChild(this.placeholderDiv);
    }

    appendMessage(message) {
        if (message.trim() === '') {
            return; // Do not append empty messages
        }
        this.clearPlaceholder();
        // Split message by actual newline and append each part with <br> after each line
        const lines = message.split('\n');
        lines.forEach((line) => {
            const messageSpan = document.createElement('span');
            messageSpan.textContent = line;
            messageSpan.style.backgroundColor = '#fff9c0';
            messageSpan.style.transition = 'background-color 1s ease';
            this.logElement.appendChild(messageSpan);
            // add a line break after every line (including the last) to ensure a new line
            this.logElement.appendChild(document.createElement('br'));
            setTimeout(() => {
                messageSpan.style.backgroundColor = '';
            }, 5000);
        });
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.logElement.scrollTop = this.logElement.scrollHeight;
        // window.scrollTo(0, document.body.scrollHeight);
    }
}