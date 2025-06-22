export class ChatLogCommon {
    constructor(logElement, initial_text = '') {
        this.logElement = logElement;
        this.placeholderText = "Ici se construit le texte collaboratif, un bout à la fois.";
        this.placeholderSpan = null;
        this.hasAppendedMessage = false;
        this.setContent(initial_text);
    }

    setContent(text) {
        this.logElement.textContent = text;
        this.ensureInitialNewline();
        this.hasAppendedMessage = false;
        this.clearAllCarets();
        this.addCaret(); // Add initial caret at the end of initial_text
        this.addPlaceholder();
    }

    ensureInitialNewline() {
        if (!this.logElement.textContent.startsWith('\n')) {
            this.logElement.textContent = '\n' + this.logElement.textContent;
        }
    }

    clearAllCarets() {
        // Remove all carets
        const carets = this.logElement.querySelectorAll('.blinking-caret');
        carets.forEach(caret => caret.remove());
    }

    updateCaretStyles() {
        // Set all carets to grey and thin except the last one, which is black and slightly wider
        const carets = this.logElement.querySelectorAll('.blinking-caret');
        carets.forEach((caret, idx) => {
            const isLast = idx === carets.length - 1;
            caret.style.backgroundColor = isLast ? '#000' : '#ccc';
            caret.style.width = isLast ? '2px' : '1px';
        });
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
        this.clearPlaceholder();
        // Split message by \n and append each part with <br> in between
        const lines = message.split("\\n");
        lines.forEach((line, idx) => {
            const messageSpan = document.createElement('span');
            messageSpan.textContent = line;
            messageSpan.style.backgroundColor = '#fff9c0';
            messageSpan.style.transition = 'background-color 1s ease';
            this.logElement.appendChild(messageSpan);
            if (idx < lines.length - 1) {
                this.logElement.appendChild(document.createElement('br'));
            }
            setTimeout(() => {
                messageSpan.style.backgroundColor = '';
            }, 5000);
        });
        this.hasAppendedMessage = true;
        this.addCaret(); // Add new caret after the message
        this.updateCaretStyles(); // Update caret colors
        this.scrollToBottom();
    }

    addCaret() {
        const caret = document.createElement('span');
        caret.className = 'blinking-caret inline-block align-middle'; // Removed 'ml-2'
        caret.style.display = 'inline-block';
        caret.style.width = '2px';
        caret.style.height = '1.2em';
        caret.style.verticalAlign = 'middle';
        caret.style.backgroundColor = '#000'; // Will be updated by updateCaretStyles
        this.logElement.appendChild(caret);
    }

    scrollToBottom() {
        this.logElement.scrollTop = this.logElement.scrollHeight;
    }
}