import { IdeaInput } from './idea_input.js';

export class IdeasManager {
    constructor(container, chatLogCommon) {
        this.container = container;
        this.instances = [];
        this.radioName = 'selectedIdeaInput';
        this.selectedIndex = null; // Track which input is selected

        this.chatLogCommon = chatLogCommon;
        this.chatLogCommon_prefix_length = 5;

        // Add "Je manque d'inspiration." radio option before addInput
        this.inspirationRadio = document.createElement('input');
        this.inspirationRadio.type = 'radio';
        this.inspirationRadio.name = this.radioName;
        this.inspirationRadio.value = '';
        this.inspirationRadio.className = "mr-2 scale-150";
        this.inspirationRadio.id = 'inspiration-radio';
        const inspirationLabel = document.createElement('label');
        inspirationLabel.htmlFor = 'inspiration-radio';
        inspirationLabel.textContent = " Envoyez-moi des idées et effectuons un nouveau vote.";

        // Insert at the top of the container
        this.container.appendChild(this.inspirationRadio);
        this.container.appendChild(inspirationLabel);

        this.addInput('', true, true);
    }

    reset() {
        this.instances.forEach(instance => {
            // Remove associated radio if present
            if (instance.radio && instance.radio.parentNode) {
                instance.radio.parentNode.removeChild(instance.radio);
            }
            instance.remove();
        });
        this.instances = [];
        this.selectedIndex = 0;
        this.addInput('', true, true);
    }

    addInput(defaultValue = '', autoFocus = false, checked = false) {
        const idea_prefix = this.chatLogCommon.getLastNCharsOfLastLine(this.chatLogCommon_prefix_length)
        const input = new IdeaInput(this.container, defaultValue, idea_prefix, autoFocus, checked);
        // Create radio button and insert before the input's wrapper
        input.radio = document.createElement('input');
        input.radio.type = 'radio';
        input.radio.name = this.radioName;
        input.radio.className = "mr-2 scale-150";
        input.radio.checked = checked;
        // The radio value will be set dynamically when requested
        input.radio.addEventListener('change', () => {
            this.selectedIndex = this.instances.indexOf(input);
        });
        // Insert radio before the input's wrapper
        input.wrapper.insertBefore(input.radio, input.wrapper.firstChild);

        this.instances.push(input);

        // If checked, update selectedIndex
        if (checked) {
            this.selectedIndex = this.instances.length - 1;
        }
    }

    ensureEmptyInput() {
        const hasEmptyInput = this.instances.some(instance => instance.input.value === '');
        if (!hasEmptyInput) {
            this.addInput('', false);
        }
    }

    isIdeaPresent(text) {
        return this.instances.some(instance => instance.input.value === text);
    }

    // Get the value of the selected idea (radio)
    getSelectedIdeaValue() {
        // Check if the inspirationRadio is selected
        if (this.inspirationRadio.checked) {
            return this.inspirationRadio.value; // which is ''
        }
        const selected = this.instances[this.selectedIndex];
        if (selected) {
            // Set radio value to current input value before returning
            selected.radio.value = selected.input.value;
            return selected.getValue();
        }
        return null;
    }

}