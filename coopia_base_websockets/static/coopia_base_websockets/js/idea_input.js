export class IdeaInput {
    constructor(container, defaultValue = '', autoFocus = false, checked = false) {
        this.container = container;

        // Create wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.className = "flex items-center w-full space-x-2";

        // Create form and input
        this.form = document.createElement('form');
        this.form.className = "flex items-center space-x-2 flex-grow relative";

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.name = 'message';
        this.input.value = defaultValue;
        this.input.className = "flex-1 p-2 border border-gray-300 rounded-lg pr-10";
        this.input.placeholder = "Écris ton idée ici...";
        this.input.maxLength = 200;
        this.input.autocomplete = "off";

        // Prevent Enter key from submitting input
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });

        this.plusBtn = document.createElement('button');
        this.plusBtn.type = 'button';
        this.plusBtn.className = "absolute right-2 aspect-square w-6 md:w-7 rounded-full bg-gray-300 text-white flex items-center justify-center shadow hover:bg-gray-300 focus:outline-none";
        this.plusBtn.style.top = "50%";
        this.plusBtn.style.transform = "translateY(-50%)";
        this.plusBtn.innerHTML = `
        <svg viewBox="0 0 24 24" class="w-3/4 h-3/4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>`;

        // Dropdown menu for options
        this.menu = document.createElement('div');
        this.menu.className = "absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-20 hidden";
        this.menu.style.top = "110%";
        this.menu.innerHTML = `
            <button type="button" class="flex items-center w-full text-left px-4 py-2 hover:bg-gray-100 rounded-t-lg" data-prefix="newline">
                <span class="checkmark w-5 mr-2"></span>
                Dans une nouvelle ligne
            </button>
            <button type="button" class="flex items-center w-full text-left px-4 py-2 hover:bg-gray-100" data-prefix="paragraph">
                <span class="checkmark w-5 mr-2"></span>
                Dans un nouveau paragraphe
            </button>
            <div class="w-full border-t border-gray-200 my-1"></div>
            <button type="button" class="flex items-center w-full text-left px-4 py-2 hover:bg-gray-100 rounded-b-lg" data-prefix="endtext">
                <span class="checkmark w-5 mr-2"></span>
                Fin du texte
            </button>
        `;

        this.selectedPrefix = null; // 'newline', 'paragraph', or null
        this.endTextActive = false;

        // Set prefix type only, don't modify input value directly
        this.updatePrefix = (prefixType) => {
            this.selectedPrefix = prefixType;
            this.updateMenuChecks();
        };

        // Helper to toggle end of text marker (no text modification here, just state)
        this.toggleEndText = () => {
            this.endTextActive = !this.endTextActive;
            this.updateMenuChecks();
        };

        // Show/hide menu
        this.plusBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.menu.classList.toggle('hidden');
            if (!this.menu.classList.contains('hidden')) {
                this.updateMenuChecks();
            }
        });

        // Hide menu when clicking outside
        document.addEventListener('mousedown', (e) => {
            if (!this.form.contains(e.target)) {
                this.menu.classList.add('hidden');
            }
        });

        // Handle menu option click
        this.menu.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-prefix]');
            if (btn) {
                const prefixType = btn.dataset.prefix;
                if (prefixType === 'endtext') {
                    this.toggleEndText();
                } else {
                    if (this.selectedPrefix === prefixType) {
                        this.updatePrefix(null);
                    } else {
                        this.updatePrefix(prefixType);
                    }
                }
                this.menu.classList.add('hidden');
                this.input.focus();
            }
        });



        // Update checkmarks in menu
        this.updateMenuChecks = () => {
            const buttons = this.menu.querySelectorAll('button[data-prefix]');
            buttons.forEach(btn => {
                const checkSpan = btn.querySelector('.checkmark');
                if (btn.dataset.prefix === this.selectedPrefix && (btn.dataset.prefix === 'newline' || btn.dataset.prefix === 'paragraph')) {
                    checkSpan.innerHTML = `<svg class="inline w-4 h-4 text-blue-500" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
                } else if (btn.dataset.prefix === 'endtext' && this.endTextActive) {
                    checkSpan.innerHTML = `<svg class="inline w-4 h-4 text-blue-500" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
                } else {
                    checkSpan.innerHTML = '';
                }
            });
        };

        // Insert elements
        this.form.appendChild(this.input);
        this.form.appendChild(this.plusBtn);
        this.form.appendChild(this.menu);
        this.wrapper.appendChild(this.form);
        this.container.appendChild(this.wrapper);

        if (autoFocus) this.input.focus();
    }

    // Add a method to get the value with prefix applied
    getValue() {
        let value = this.input.value;
        // Remove any existing prefix at the start
        value = value.replace(/^(\n\n|\n)/, '');
        if (this.selectedPrefix === 'newline') {
            value = '\n' + value;
        } else if (this.selectedPrefix === 'paragraph') {
            value = '\n\n' + value;
        }
        return value;
    }

    remove() {
        this.wrapper?.parentNode?.removeChild(this.wrapper);
    }
}