export class IdeaInput {
    constructor(container,voteButton, defaultValue = '', autoFocus = false, checked = false, editable = true) {
        this.container = container;
        this.editable = editable;

        // Create wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.className = "flex items-center w-full space-x-2";

        // Create form and input
        this.form = document.createElement('form');
        this.form.className = "flex items-center space-x-2 flex-grow relative";

        // Wrapper styled like an input
        this.inputWrapper = document.createElement('div');
        this.inputWrapper.className = "flex items-start border border-gray-300 rounded-lg px-2 pr-10 w-full bg-white relative";

        this.input = document.createElement('textarea');
        this.input.className = "flex-1 outline-none bg-transparent resize-none overflow-hidden leading-snug";
        this.input.value = defaultValue;
        if (this.editable)  this.input.placeholder = "Proposition anonyme";
        
        this.input.autocomplete = "off";
        this.input.maxLength = 150;
        this.input.rows = 1;
        this.input.style.minHeight = '3rem';  // minimum height
        this.input.style.lineHeight = '1.25rem';
        this.input.style.verticalAlign = 'middle'; // Align with sibling inline elements
        this.input.style.paddingTop = '0.85rem';   // Slight adjustment (tweak as needed)
        this.input.style.paddingBottom = '0';//.1rem';
        this.input.style.margin = '0';            // Remove default margin
        this.input.disabled = !editable;

        // Create character counter
        this.counter = document.createElement('span');
        this.counter.className = "absolute right-2 top-1 text-xs text-gray-500";
        this.counter.textContent = `${this.input.value.length}/150`;
        this.counter.style.display = 'none';

        // Insert elements
        this.inputWrapper.appendChild(this.input);
        this.inputWrapper.appendChild(this.counter);

        // Handle Enter key to submit idea
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (voteButton) {
                    voteButton.voteButton.click();
                }
            }
        });

        // Auto-resize height to fit content and update counter
        const resizeTextarea = () => {
            this.input.style.height = 'auto'; // reset first
            this.input.style.height = this.input.scrollHeight + 'px';
        };
        const updateCounter = () => {
            this.counter.textContent = `${this.input.value.length}/${this.input.maxLength}`;
            if (this.editable && this.input.value.length >= this.input.maxLength * 0.8) {
                this.counter.style.display = 'block';
            } else {
                this.counter.style.display = 'none';
            }
        };
        this.input.addEventListener('input', () => {
            resizeTextarea();
            updateCounter();
        });
        setTimeout(() => {
            resizeTextarea();
            updateCounter();
        }, 0); // initial resize and counter update after DOM render

        // Insert elements
        this.form.appendChild(this.inputWrapper);
        this.wrapper.appendChild(this.form);
        // new ideas are added to the top of the container.
        this.container.insertBefore(this.wrapper, this.container.firstChild);
        // this.container.appendChild(this.wrapper);

        if (autoFocus) this.input.focus();
    }

    // Add a method to get the value with prefix applied
    getValue() {
        return this.input.value;
    }

    reset() {
        this.input.value = '';
        this.input.style.height = 'auto';
        this.input.style.height = this.input.scrollHeight + 'px';
        this.counter.textContent = '0/150';
        this.counter.style.display = 'none';
    }

    remove() {
        this.wrapper?.parentNode?.removeChild(this.wrapper);
    }
}