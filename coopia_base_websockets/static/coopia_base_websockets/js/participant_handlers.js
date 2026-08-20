import { ParticipantSubmitButton } from './participant_submit_button.js';
import { ParticipantInputText } from './participant_input_text.js';
import { ParticipantInputChoice } from './participant_input_choice.js';

export class ParticipantHandler {
    constructor(participant_input_container,participant_submit_button_container, coopiaSocket) {
        this.participant_input_container = participant_input_container;
        this.participant_submit_button_container = participant_submit_button_container;
        this.coopiaSocket = coopiaSocket;
        
        this.participantSubmitButton = null; // connected participantSubmitButton
        this.current_input_form = null
        this.participant_input = null // track participant input

        this.submissionsDone = 0;
        this.maxSubmissions = null;

        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || navigator.maxTouchPoints > 0;
        
        // Handle Enter key to submit
        this.participant_input_container.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (this.participantSubmitButton && !this.isMobile) {
                    if (this.participantSubmitButton.submitButton.disabled===false) {
                        this.participantSubmitButton.submitButton.click();
                    }
                }
            }
        });
    }

    resetSubmissions(maxSubmissions) {
        this.submissionsDone = 0;
        this.maxSubmissions = maxSubmissions;
    }

    showSubmitButton() {
        if (this.participantSubmitButton) {
            return;
        }

        this.participantSubmitButton = new ParticipantSubmitButton(this.participant_submit_button_container);
        
        this.participantSubmitButton.submitButton.onclick = () => {
            
            this.coopiaSocket.send(JSON.stringify({
                type: 'participant_input',
                ...this.participant_input
            }));

            this.submissionsDone++ 
            if (this.submissionsDone === this.maxSubmissions) {
                this.showMaxSubmissionsReached()
            } else {
                this.current_input_form.onsubmission(this.submissionsDone);
            }
            this.participantSubmitButton.setNotClickableAppearance();
        };
    }

    showTextInput(defaultValue = '') {
        // if curren_input_form is not null, remove it
        if (this.current_input_form) {
            this.current_input_form.remove();
            this.current_input_form = null;
        }

        const autoFocus = !this.isMobile;
        const editable=true;
        this.current_input_form = new ParticipantInputText(this.participant_input_container, defaultValue, autoFocus, editable);
        this.participantSubmitButton.setNotClickableAppearance();

        // Listen for changes to the input and update participant_input
        this.current_input_form.input.addEventListener('input', () => {
            const input_value = this.current_input_form.input.value;
            this.participant_input = {'text': input_value};
            // sets SubmitButton clickable once input is not null
            if (input_value.trim() !== '') {
                this.participantSubmitButton.setClickableAppearance();
            } else {
                this.participantSubmitButton.setNotClickableAppearance();
            }
        });
    }

    showChoiceInput(phase, items, layout='rows', multiple_select=false) {
        if (this.submissionsDone === this.maxSubmissions) {
                return;
        } 
        // remove any existing input form
        if (this.current_input_form) {
            this.current_input_form.remove();
            this.current_input_form = null;
        }

        // create choice input
        const choice = new ParticipantInputChoice(this.participant_input_container, items, layout, multiple_select);
        this.current_input_form = choice;

        // update participant_input whenever selection changes
        choice.onChange = (selectedItems) => {
            if (phase==='selection') {
                const losers = items.filter(i => !selectedItems.includes(i));
                const winner = selectedItems.length > 0 ? selectedItems[0] : null;
                const loser = losers.length > 0 ? losers[0] : null;
                this.participant_input = {winner: winner, loser: loser};
            } else {
                this.participant_input = {choice: selectedItems};
            }

            if (this.participantSubmitButton) {
                if (selectedItems.length > 0) {
                    this.participantSubmitButton.setClickableAppearance();
                } else {
                    this.participantSubmitButton.setNotClickableAppearance();
                }
            }
        };
    }

    showMaxSubmissionsReached() {
        // if curren_input_form is not null, remove it
        if (this.current_input_form) {
            this.current_input_form.remove();
            this.current_input_form = null;
        }

        const message = document.createElement('div');
        message.textContent = 'Nombre maximum de soumissions atteint.';
        message.style.fontStyle = 'italic';
        message.style.display = 'flex';
        message.style.alignItems = 'center';
        message.style.justifyContent = 'center';
        message.style.minHeight = '3rem';
        this.participant_input_container.appendChild(message);
        
    }
}