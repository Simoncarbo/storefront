export class ProcessResultDisplay {
    constructor(logElement, initial_text = '') {
        this.logElement = logElement;
        this.placeholderText = "Ici se construit le texte collaboratif.";
        this.placeholderSpan = null;
        this.hasAppendedMessage = false;
        this.setContent(initial_text);
    }

    setContent(text) {
        this.logElement.textContent = text;
        this.ensureInitialNewline();
        this.hasAppendedMessage = false;
        this.addPlaceholder();
    }

    ensureInitialNewline() {
        if (!this.logElement.textContent.startsWith('\n')) {
            this.logElement.textContent = '\n' + this.logElement.textContent;
        }
    }

    clearPlaceholder() {
        if (this.placeholderSpan) {
            this.placeholderSpan.remove();
            this.placeholderSpan = null;
        }
    }

    addPlaceholder() {
        this.clearPlaceholder();
        if (!this.hasAppendedMessage) {
            this.placeholderSpan = document.createElement('span');
            this.placeholderSpan.textContent = this.placeholderText;
            this.placeholderSpan.style.color = '#aaa';
            this.placeholderSpan.style.fontStyle = 'italic';
            this.placeholderSpan.style.marginLeft = '0.5em';
            this.logElement.appendChild(this.placeholderSpan);
        }
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
        this.hasAppendedMessage = true;
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.logElement.scrollTop = this.logElement.scrollHeight;
        // window.scrollTo(0, document.body.scrollHeight);
    }
}