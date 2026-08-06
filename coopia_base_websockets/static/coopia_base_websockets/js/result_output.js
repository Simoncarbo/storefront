export class ProcessResultDisplay {
    constructor(logElement) {
        this.logElement = logElement;
        this.placeholderDiv = null;

        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                if (this.isScrolledToBottom()) {
                    this.scrollToBottom(true);
                }
            });
            this.resizeObserver.observe(this.logElement);
        }
    }

    clearPlaceholder() {
        if (this.placeholderDiv) {
            this.placeholderDiv.remove();
            this.placeholderDiv = null;
        }
    }

    isScrolledToBottom() {
        return this.logElement.scrollHeight - this.logElement.scrollTop - this.logElement.clientHeight <= 1;
    }

    addPlaceholder(placeholderText) {
        const shouldFollow = this.isScrolledToBottom();

        this.clearPlaceholder();
        this.placeholderDiv = document.createElement('div');
        this.placeholderDiv.textContent = placeholderText;
        this.placeholderDiv.style.color = '#aaa';
        // this.placeholderDiv.style.fontStyle = 'italic';
        // this.placeholderDiv.style.marginLeft = '0.5em';
        this.logElement.appendChild(this.placeholderDiv);

        if (shouldFollow) {
            this.scrollToBottom(true);
        }
    }

    appendMessage(message) {
        if (message.trim() === '') {
            return; // Do not append empty messages
        }

        const shouldFollow = this.isScrolledToBottom();
        this.clearPlaceholder();

        const messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        messageDiv.style.backgroundColor = '#fff9c0';
        messageDiv.style.transition = 'background-color 1s ease';
        this.logElement.appendChild(messageDiv);
        setTimeout(() => {
            messageDiv.style.backgroundColor = '';
        }, 5000);

        if (shouldFollow) {
            this.scrollToBottom(true);
        }
    }

    scrollToBottom(force = false) {
        if (force || this.isScrolledToBottom()) {
            this.logElement.scrollTop = this.logElement.scrollHeight;
        }
    }

    disconnect() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }
}