export class ChatLogCommon {
    constructor(logElement, initial_text = '') {
        this.logElement = logElement;
        this.placeholderText = "Ici se construit le texte collaboratif, une phrase à la fois.";
        this.placeholderSpan = null;
        this.hasAppendedMessage = false;
        this.setContent(initial_text);
    }

    setContent(text) {
        this.logElement.textContent = text;
        this.ensureInitialNewline();
        this.hasAppendedMessage = false;
        this.clearCaret();
        this.addCaret();
        this.addPlaceholder();
    }

    ensureInitialNewline() {
        if (!this.logElement.textContent.startsWith('\n')) {
            this.logElement.textContent = '\n' + this.logElement.textContent;
        }
    }

    clearCaret() {
        const oldCaret = this.logElement.querySelector('.blinking-caret');
        if (oldCaret) oldCaret.remove();
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
        this.clearCaret();
        this.clearPlaceholder();
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        messageSpan.classList.add('highlight');
        this.logElement.appendChild(messageSpan);
        this.hasAppendedMessage = true; // Set before adding caret/placeholder
        this.addCaret();
        this.scrollToBottom();

        // Remove highlight after 5 seconds
        setTimeout(() => {
            messageSpan.classList.remove('highlight');
        }, 5000);
    }

    addCaret() {
        const caret = document.createElement('span');
        caret.className = 'blinking-caret';
        this.logElement.appendChild(caret);
    }

    scrollToBottom() {
        this.logElement.scrollTop = this.logElement.scrollHeight;
    }
}