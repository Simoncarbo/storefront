export class ProcessResultDisplay {
    constructor(logElement, inputContainerElement) {
        this.logElement = logElement;
        this.inputContainerElement = inputContainerElement;
        this.placeholderDiv = null;
        this.resizeObservers = [];

        this.followBottom = true;
        this.logElement.addEventListener("scroll", () => {
            this.followBottom = this.isScrolledToBottom();
        });
        this.handleResize = () => {
            if (this.followBottom) {
                this.scrollToBottom();
            }
        };

        this.observeResize(this.inputContainerElement);
        window.addEventListener('resize', this.handleResize);
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
        this.logElement.appendChild(this.placeholderDiv);

        this.handleResize()
    }

    appendMessage(message) {
        if (message.trim() === '') {
            return; // Do not append empty messages
        }
        this.clearPlaceholder();

        const messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        messageDiv.style.backgroundColor = '#fff9c0';
        messageDiv.style.transition = 'background-color 1s ease';
        this.logElement.appendChild(messageDiv);
        setTimeout(() => {
            messageDiv.style.backgroundColor = '';
        }, 5000);

        this.handleResize()
    }
    
    isScrolledToBottom() {
        return this.logElement.scrollHeight - this.logElement.scrollTop - this.logElement.clientHeight <= 50;
    }

    scrollToBottom() {
        this.logElement.scrollTop = this.logElement.scrollHeight;
    }

    observeResize(element) {
        if (!element || typeof ResizeObserver === 'undefined') {
            return;
        }

        const resizeObserver = new ResizeObserver(this.handleResize);
        resizeObserver.observe(element);
        this.resizeObservers.push(resizeObserver);
    }

    disconnect() {
        this.resizeObservers.forEach((observer) => {
            observer.disconnect();
        });
        this.resizeObservers = [];

        if (this.handleResize) {
            window.removeEventListener('resize', this.handleResize);
            this.handleResize = null;
        }
    }
}