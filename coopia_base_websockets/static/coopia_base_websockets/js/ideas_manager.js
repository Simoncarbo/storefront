import { IdeaInput } from './idea_input.js';

export class IdeasManager {
    constructor(socket, container, maxSubmits = Infinity, globalCountElementId = 'global-submission-remaining') {
        console.log('IdeasManager constructor called');
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
        // return input;
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