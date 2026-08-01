import { IdeaInput } from './idea_input.js';

export class IdeasManager {
    constructor(container,voteButton) {
        this.container = container;
        this.instances = [];
        this.radioName = 'selectedIdeaInput';
        this.selectedIndex = null; // Track which input is selected
        this.voteButton = voteButton; // connected VoteButton
        this.participant_input = {'participant_proposal': null}; // Track participant input

        this.voteButton.connect(this);
    }

    reset(remove = false) {
        // If there's only one instance, reset that instance instead of removing it
        if (this.instances.length === 1 && !remove) {
            if (typeof this.instances[0].reset === 'function') {
                this.instances[0].reset();
            } 
            this.voteButton.setNotClickableAppearance();
            return;
        }

        this.instances.forEach(instance => {
            // Remove associated radio if present
            if (instance.radio && instance.radio.parentNode) {
                instance.radio.parentNode.removeChild(instance.radio);
            }
            instance.remove();
        });
        this.instances = [];
        this.selectedIndex = 0;
        this.voteButton.setNotClickableAppearance();
    }

    addInput(defaultValue = '', autoFocus = false, checked = false, editable = false) {
        if (this.voteButton.clickCount < this.voteButton.maxClicks) {
            const input = new IdeaInput(this.container, this.voteButton, defaultValue, autoFocus, checked, editable);
            // Create radio button and insert before the input's wrapper
            input.radio = document.createElement('input');
            input.radio.type = 'radio';
            input.radio.name = this.radioName;
            input.radio.className = "mr-2 scale-150";
            input.radio.checked = checked;
            // The radio value will be set dynamically when requested
            input.radio.addEventListener('change', () => {
                this.selectedIndex = this.instances.indexOf(input);
                if (this.voteButton.clickCount < this.voteButton.maxClicks) {
                        this.voteButton.setClickableAppearance();
                }
            });
            // Insert radio before the input's wrapper only if selection phase
            if (!checked) {
                input.wrapper.insertBefore(input.radio, input.wrapper.firstChild);
            }

            this.instances.push(input);

            // Listen for changes to the input and update participant_input
            input.input.addEventListener('input', () => {
                this.participant_input = {'participant_proposal': input.getValue()};
                if (input.getValue().trim() !== '' && this.voteButton.clickCount < this.voteButton.maxClicks) {
                    this.voteButton.setClickableAppearance();
                } else {
                    this.voteButton.setNotClickableAppearance();
                }
            });

            // If checked, update selectedIndex
            if (checked) {
                this.selectedIndex = this.instances.length - 1;
            }
        }
    }

    // Get the value of the selected idea (radio)
    getSelectedIdeaValue() {
        const selected = this.instances[this.selectedIndex];
        if (selected) {
            // Set radio value to current input value before returning
            selected.radio.value = selected.input.value;
            return selected.getValue();
        }
        return null;
    }


    getNotSelectedIdeaValue() {
        if (!this.instances.length === 2) {
            return null;
        }
        const notSelectedIndex = this.selectedIndex === 0 ? 1 : 0;
        const notSelected = this.instances[notSelectedIndex];
        if (notSelected) {
            notSelected.radio.value = notSelected.input.value;
            return notSelected.getValue();
        }
        return null;
    }

}