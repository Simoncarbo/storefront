export class IdeaInput {
            static totalSubmits = 0;
            static maxSubmits = Infinity;
            static instances = [];
            static globalCountElement = document.getElementById('global-submission-remaining');

            static reset() {
                // Remove all DOM elements for each instance
                IdeaInput.instances.forEach(instance => {
                    if (instance.wrapper && instance.wrapper.parentNode) {
                        instance.wrapper.parentNode.removeChild(instance.wrapper);
                    }
                });

                // Reset the instances array and total submissions
                IdeaInput.instances = [];
                IdeaInput.totalSubmits = 0;
            }

            constructor(socket, container, defaultValue = '', autoFocus = false, checked=false) {
                this.socket = socket;
                this.container = container;
                this.submitCount = 0;

                // Create form and input elements
                this.form = document.createElement('form');
                // Set the form to grow and take remaining space
                this.form.className = "flex items-center space-x-2 flex-grow";

                this.input = document.createElement('textarea');
                // Set rows based on defaultValue line count (min 1, max 4)
                const lineCount = defaultValue.split('\n').length;
                this.input.rows = Math.min(Math.max(lineCount, 1), 4);
                this.input.name = 'message';
                this.input.value = defaultValue;
                this.input.className = "flex-1 p-2 border border-gray-300 rounded-lg resize-none overflow-hidden";
                this.input.placeholder = "Écris ton idée ici...";
                this.input.maxLength = 200; // Built-in character limit
                
                this.input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.sendMessage();
                    }
                });

                this.input.addEventListener('input', () => {
                    // Auto-grow: reset height first to calculate correctly
                    this.input.style.height = 'auto';

                    // Cap at 4 rows = approx 4 * line-height (~24px default)
                    const maxHeight = 4 * 24;
                    this.input.style.height = Math.min(this.input.scrollHeight, maxHeight) + 'px';

                    // Enforce newline limit
                    const lines = this.input.value.split('\n');
                    if (lines.length > 4) {
                        this.input.value = lines.slice(0, 4).join('\n');
                    }
                });

                // Create a radio button for selecting the input
                this.radio = document.createElement('input');
                this.radio.type = 'radio';
                this.radio.name = 'selectedIdeaInput';
                this.radio.checked = checked;
                this.radio.className = "mr-2 scale-150";
                // Set radio value to match input value
                this.radio.value = this.input.value;
                // Keep radio value in sync with input value
                this.input.addEventListener('input', () => {
                    this.radio.value = this.input.value;
                });

                this.button = document.createElement('button');
                this.button.type = 'submit';
                this.button.textContent = 'Promouvoir l\'idée';
                this.button.className = "px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow hover:bg-green-600";

                if (IdeaInput.totalSubmits >= IdeaInput.maxSubmits) {
                    this.disable();
                }

                // Create a small box for the click count
                this.countBox = document.createElement('div');
                this.countBox.className = "px-3 py-1 bg-gray-200 text-gray-700 font-bold rounded-lg";
                this.countBox.textContent = '0';

                // Append the input, button, and count box to the form
                this.form.appendChild(this.input);
                this.form.appendChild(this.button);
                this.form.appendChild(this.countBox);

                // Wrap radio and form in a flex container
                this.wrapper = document.createElement('div');
                this.wrapper.className = "flex items-center w-full space-x-2"; // Full width wrapper

                this.wrapper.appendChild(this.radio);
                this.wrapper.appendChild(this.form);

                this.container.appendChild(this.wrapper);

                // Focus input if requested
                if (autoFocus) this.input.focus();

                // Handle form submission
                this.form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.sendMessage();
                });

                this.input.addEventListener('input', () => {
                    IdeaInput.ensureEmptyInput(socket, container);
                });

                // Register this instance
                IdeaInput.instances.push(this);
                IdeaInput.updateGlobalCountDisplay();
            }

            sendMessage() {
                if (IdeaInput.totalSubmits >= IdeaInput.maxSubmits) {
                    this.disableAllInputs();
                    return;
                }

                const message = this.input.value;
                if (message !== '') {
                    this.socket.send(JSON.stringify({ message }));
                    this.submitCount += 1;
                    IdeaInput.totalSubmits += 1;

                    // Update the count box with the number of clicks
                    this.updateCountBox();

                    // Update global remaining submissions
                    IdeaInput.updateGlobalCountDisplay();

                    if (IdeaInput.totalSubmits >= IdeaInput.maxSubmits) {
                        this.disableAllInputs();
                    }
                }
            }

            updateCountBox() {
                this.countBox.textContent = this.submitCount;
            }

            static updateGlobalCountDisplay() {
                if (IdeaInput.globalCountElement) {
                    const remaining = Math.max(IdeaInput.maxSubmits - IdeaInput.totalSubmits, 0);
                    IdeaInput.globalCountElement.textContent = `Promotions restantes: ${remaining}`;

                    // Update styling based on remaining submissions
                    IdeaInput.globalCountElement.className = `text-lg font-semibold ${
                        remaining <= 1 ? 'text-red-500' : 'text-gray-700'
                    } text-right`;
                }
            }

            disable() {
                this.button.disabled = true;
                // this.input.disabled = true;
            }

            disableAllInputs() {
                IdeaInput.instances.forEach(instance => instance.disable());
            }

            static ensureEmptyInput(socket, container) {
                const hasEmptyInput = IdeaInput.instances.some(instance => instance.input.value === '');
                if (!hasEmptyInput) {
                    new IdeaInput(socket, container, '', false);
                }
            }

            static getLastLogLine() {
                const log = document.querySelector('#chat-log-common');
                if (!log) return '';
                const lines = log.textContent.split('\n').filter(l => l.trim() !== '');
                return lines.length ? lines[lines.length - 1] : '';
            }

            static isIdeaPresent(text) {
                return IdeaInput.instances.some(instance => instance.input.value === text);
            }
        }