// overlay_message.js

export class OverlayMessage {
    constructor(initialMessage = "Tirage au sort en cours...") {
        this.overlay = document.createElement("div");
        this.overlay.className = "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center";
        this.overlay.style.display = "none";

        this.textBox = document.createElement("div");
        this.textBox.className = "bg-white text-center text-xl font-semibold text-gray-800 px-6 py-4 rounded-lg shadow-lg";
        this.textBox.textContent = initialMessage;

        this.overlay.appendChild(this.textBox);
        document.body.appendChild(this.overlay);

        this.timeoutIds = [];
    }

    showWithPhases(resultType, phase1Delay = 3000, totalDelay = 6000) {
        const initialMessage = "Tirage au sort en cours...";
        let secondPhaseMessage = "";

        if (resultType === 'propagation') {
            secondPhaseMessage = `
            <div style="text-align: center; font-family: sans-serif;">
                <div style="margin-bottom: 12px;">
                Diffusion d'idées et nouveau vote.
                </div>
            </div>
            `;
        } else if (resultType === 'decision') {
            secondPhaseMessage = `
            <div style="text-align:center; font-family:sans-serif;">
                <div style="margin-bottom: 12px;">
                Un nouveau bout de texte va être ajouté!
                </div>
            </div>
            `;
        }

        this.clearTimers();

        // Phase 1
        this.show(initialMessage);

        // Phase 2 (after phase1Delay)
        const secondPhaseId = setTimeout(() => {
            this.textBox.innerHTML = secondPhaseMessage;
        }, phase1Delay);
        this.timeoutIds.push(secondPhaseId);

        // Hide after totalDelay
        const hideId = setTimeout(() => this.hide(), totalDelay);
        this.timeoutIds.push(hideId);
    }

    show(message = null) {
        if (message !== null) {
            this.textBox.textContent = message;
        }
        this.overlay.style.display = "flex";
    }

    hide() {
        this.clearTimers();
        this.overlay.style.display = "none";
    }

    clearTimers() {
        this.timeoutIds.forEach(id => clearTimeout(id));
        this.timeoutIds = [];
    }
}
