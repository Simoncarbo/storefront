class IdeaInput {
    constructor(manager, socket, container, defaultValue = '', autoFocus = false, checked = false) {
        this.manager = manager;
        this.socket = socket;
        this.container = container;
        this.submitCount = 0;

        // Create form and input elements
        this.form = document.createElement('form');
        this.form.className = "flex items-center space-x-2 flex-grow";

        this.input = document.createElement('textarea');
        const lineCount = defaultValue.split('\n').length;
        this.input.rows = Math.min(Math.max(lineCount, 1), 4);
        this.input.name = 'message';
        this.input.value = defaultValue;
        this.input.className = "flex-1 p-2 border border-gray-300 rounded-lg resize-none overflow-hidden";
        this.input.placeholder = "Écris ton idée ici...";
        this.input.maxLength = 200;

        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.input.addEventListener('input', () => {
            this.input.style.height = 'auto';
            const maxHeight = 4 * 24;
            this.input.style.height = Math.min(this.input.scrollHeight, maxHeight) + 'px';
            const lines = this.input.value.split('\n');
            if (lines.length > 4) {
                this.input.value = lines.slice(0, 4).join('\n');
            }
            this.radio.value = this.input.value;
            this.manager.ensureEmptyInput();
        });

        this.radio = document.createElement('input');
        this.radio.type = 'radio';
        this.radio.name = 'selectedIdeaInput';
        this.radio.checked = checked;
        this.radio.className = "mr-2 scale-150";
        this.radio.value = this.input.value;

        this.button = document.createElement('button');
        this.button.type = 'submit';
        this.button.textContent = 'Promouvoir l\'idée';
        this.button.className = "px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow hover:bg-green-600";

        this.countBox = document.createElement('div');
        this.countBox.className = "px-3 py-1 bg-gray-200 text-gray-700 font-bold rounded-lg";
        this.countBox.textContent = '0';

        this.form.appendChild(this.input);
        this.form.appendChild(this.button);
        this.form.appendChild(this.countBox);

        this.wrapper = document.createElement('div');
        this.wrapper.className = "flex items-center w-full space-x-2";
        this.wrapper.appendChild(this.radio);
        this.wrapper.appendChild(this.form);

        this.container.appendChild(this.wrapper);

        if (autoFocus) this.input.focus();

        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        if (this.manager.totalSubmits >= this.manager.maxSubmits) {
            this.disable();
        }
    }

    sendMessage() {
        if (this.manager.totalSubmits >= this.manager.maxSubmits) {
            this.manager.disableAllInputs();
            return;
        }
        const message = this.input.value;
        if (message !== '') {
            this.socket.send(JSON.stringify({ message }));
            this.submitCount += 1;
            this.manager.totalSubmits += 1;
            this.updateCountBox();
            this.manager.updateGlobalCountDisplay();
            if (this.manager.totalSubmits >= this.manager.maxSubmits) {
                this.manager.disableAllInputs();
            }
        }
    }

    updateCountBox() {
        this.countBox.textContent = this.submitCount;
    }

    disable() {
        this.button.disabled = true;
    }

    remove() {
        if (this.wrapper && this.wrapper.parentNode) {
            this.wrapper.parentNode.removeChild(this.wrapper);
        }
    }
}

export class IdeaInputManager {
    constructor(socket, container, maxSubmits = Infinity, globalCountElementId = 'global-submission-remaining') {
        this.socket = socket;
        this.container = container;
        this.maxSubmits = maxSubmits;
        this.totalSubmits = 0;
        this.instances = [];
        this.globalCountElement = document.getElementById(globalCountElementId);
        this.updateGlobalCountDisplay();

        this.addInput('', true, false)
    }

    reset(maxSubmits = null) {
        this.instances.forEach(instance => instance.remove());
        this.instances = [];
        this.totalSubmits = 0;
        this.updateGlobalCountDisplay();
        
        this.addInput('', true, false);
        if (maxSubmits !== null) {
            this.maxSubmits = maxSubmits;
        }
    }

    addInput(defaultValue = '', autoFocus = false, checked = false) {
        const input = new IdeaInput(this, this.socket, this.container, defaultValue, autoFocus, checked);
        this.instances.push(input);
        return input;
    }

    ensureEmptyInput() {
        const hasEmptyInput = this.instances.some(instance => instance.input.value === '');
        if (!hasEmptyInput) {
            this.addInput('', false);
        }
    }

    updateGlobalCountDisplay() {
        if (this.globalCountElement) {
            const remaining = Math.max(this.maxSubmits - this.totalSubmits, 0);
            this.globalCountElement.textContent = `Promotions restantes: ${remaining}`;
            this.globalCountElement.className = `text-lg font-semibold ${
                remaining <= 1 ? 'text-red-500' : 'text-gray-700'
            } text-right`;
        }
    }

    disableAllInputs() {
        this.instances.forEach(instance => instance.disable());
    }

    isIdeaPresent(text) {
        return this.instances.some(instance => instance.input.value === text);
    }
}