export class CycleTimer {
    /**
     * phase durations in seconds
     * container: DOM element (or selector) where the timer will be mounted
     * colors: { phase1: '#...', phase2: '#...' }
     */
    constructor(phase1_duration = 30, phase2_duration = 30, container = null, colors = { phase1: '#4caf50', phase2: '#2196f3' }) {
        this.phase1 = Number(phase1_duration) || 0;
        this.phase2 = Number(phase2_duration) || 0;
        this.total = this.phase1 + this.phase2;
        this.colors = colors;

        this._root = null;
        this._container = typeof container === 'string' ? document.querySelector(container) : container;
        this._raf = null;
        this._textTimer = null;
        this._endTs = null;
        this._started = false;

        this._buildElements();
    }

    _buildElements() {
        const root = document.createElement('div');
        root.className = 'cycle-timer';
        root.style.display = 'flex';
        root.style.alignItems = 'center';
        root.style.width = '100%';
        root.style.boxSizing = 'border-box';
        root.style.padding = '4px';
        root.style.marginBottom = '20px'; // add blank space under the progress bar

        // background split bar (static split visually showing phase sizes)
        const split = document.createElement('div');
        split.className = 'cycle-timer-split';
        split.style.position = 'relative';
        split.style.flex = '1';
        split.style.height = '28px';
        split.style.borderRadius = '6px';
        split.style.overflow = 'hidden';
        split.style.background = this._splitGradient();

        // overlay mask that shrinks to show remaining progress
        const mask = document.createElement('div');
        mask.className = 'cycle-timer-mask';
        mask.style.position = 'absolute';
        mask.style.top = '0';     // inset to split so it exactly matches the split bar
        mask.style.bottom = '0';
        mask.style.right = '0';   // anchor to the right so shrinking reveals from left->right
        mask.style.left = 'auto';
        mask.style.width = '100%';
        // keep right corners rounded, left corners square
        mask.style.borderTopRightRadius = '6px';
        mask.style.borderBottomRightRadius = '6px';
        mask.style.borderTopLeftRadius = '0';
        mask.style.borderBottomLeftRadius = '0';
        mask.style.background = 'rgba(0,0,0,0.25)'; // cover that shrinks
        mask.style.transition = 'width 0.25s linear';


        // remaining time text (next to bar)
        const rem = document.createElement('div');
        rem.className = 'cycle-timer-remaining';
        rem.style.marginLeft = '5px';
        rem.style.width = '30px';
        rem.style.textAlign = 'center';
        rem.style.fontSize = '12px';
        rem.style.fontFamily = 'monospace';
        rem.style.color = '#000';
        rem.style.background = 'rgba(255,255,255,0.85)';
        rem.style.padding = '2px 6px';
        rem.style.borderRadius = '12px';
        rem.style.pointerEvents = 'none';

        root.appendChild(split);
        // place mask inside the split so it exactly overlays the gradient
        split.appendChild(mask);
        // root.appendChild(mask);
        root.appendChild(rem);

        this._root = root;
        this._split = split;
        this._mask = mask;
        this._remText = rem;
    }

    _splitGradient() {
        // calculate percentage where phase1 ends
        const pct = this.total > 0 ? (this.phase1 / this.total) * 100 : 50;
        return `linear-gradient(90deg, ${this.colors.phase1} 0% ${pct}%, ${this.colors.phase2} ${pct}% 100%)`;
    }

    mount(container) {
        const target = container ? (typeof container === 'string' ? document.querySelector(container) : container) : this._container;
        if (!target) throw new Error('No container to mount CycleTimer');
        // clear existing
        target.appendChild(this._root);
        this._container = target;
    }

    setDurations(phase1_seconds, phase2_seconds) {
        this.phase1 = Number(phase1_seconds) || 0;
        this.phase2 = Number(phase2_seconds) || 0;
        this.total = this.phase1 + this.phase2;
        this._split.style.background = this._splitGradient();
    }

    start(startTimestamp = Date.now()) {
        this.stop();
        this._started = true;
        this._startTs = startTimestamp;
        this._endTs = this._startTs + (this.total * 1000);
        // immediate visual update
        this._updateProgressFrame();
        this._scheduleTextUpdate(0);
    }

    stop() {
        this._started = false;
        if (this._raf) {
            cancelAnimationFrame(this._raf);
            this._raf = null;
        }
        if (this._textTimer) {
            clearTimeout(this._textTimer);
            this._textTimer = null;
        }
    }

    reset() {
        this.stop();
        this._remText.textContent = '';
        this._mask.style.width = '100%'; // full cover again
    }

    _updateProgressFrame() {
        if (!this._started) return;
        const now = Date.now();
        const remainingMs = Math.max(0, this._endTs - now);
        const pct = this.total > 0 ? (remainingMs / (this.total * 1000)) * 100 : 0;
        this._mask.style.width = pct + '%';

        if (remainingMs <= 0) {
            this._remText.textContent = '0s';
            this.stop();
            return;
        }

        // keep animating the mask for smooth visual
        this._raf = requestAnimationFrame(() => this._updateProgressFrame());
    }

    _scheduleTextUpdate(initialDelay = null) {
        if (!this._started) return;
        if (this._textTimer) clearTimeout(this._textTimer);

        const fmt = (sec) => {
            if (sec > 60 && sec % 60 !== 0) {
                const m = Math.floor(sec / 60);
                const s = sec % 60;
                return `${m}m${s}s`;
            }
            return `${sec}s`;
        };

        const updateNow = () => {
            if (!this._started) return;
            const now = Date.now();
            const elapsed = (now - this._startTs) / 1000;
            let remainingSeconds;
            if (elapsed < this.phase1) {
                // phase 1
                remainingSeconds = Math.max(0, Math.ceil(this.phase1 - elapsed));
            } else {
                // phase 2
                const phase2Elapsed = elapsed - this.phase1;
                remainingSeconds = Math.max(0, Math.ceil(this.phase2 - phase2Elapsed));
            }
            if (remainingSeconds <= 10) {
                // final 10 seconds: update every second
                this._remText.textContent = fmt(remainingSeconds);
                if (remainingSeconds <= 0) {
                    this.stop();
                    return;
                }
                this._textTimer = setTimeout(updateNow, 1000);
                return;
            }

            // round up to the next 10s multiple for display
            const bucket = Math.ceil(remainingSeconds / 10);
            const displaySec = bucket * 10;
            this._remText.textContent = fmt(displaySec);

            // next change occurs when we cross into the previous 10s bucket
            let nextChangeSec = (bucket - 1) * 10;
            // if that would be inside the last-10s window, switch to updating at 10s boundary
            if (nextChangeSec < 10) nextChangeSec = 10;

            const delaySeconds = Math.max(1, remainingSeconds - nextChangeSec);
            const nextIntervalMs = delaySeconds * 1000;
            this._textTimer = setTimeout(updateNow, nextIntervalMs);
        };

        if (initialDelay === 0) updateNow();
        else {
            const delay = initialDelay !== null ? initialDelay : 0;
            this._textTimer = setTimeout(updateNow, delay);
        }
    }

    // optional: set explicit end timestamp (ms since epoch)
    setEndTimestamp(ms) {
        this._endTs = ms;
        this._started = true;
        this._updateProgressFrame();
        this._scheduleTextUpdate(0);
    }
}

/* Usage example:
import { CycleTimer } from './cycle_timer.js';
const t = new CycleTimer(20, 40, '#timer-container');
t.mount('#timer-container');
t.start(); // starts now
// or supply server start: t.start(Date.parse(server_start_time));
*/