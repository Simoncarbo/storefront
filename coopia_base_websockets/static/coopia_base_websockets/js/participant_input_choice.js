export class ParticipantInputChoice {
    constructor(container, items, boxed = false) {
        this.container = container;
        this.items = Array.isArray(items) ? items : [];
        this.boxed = !!boxed;
        
        this.onChange = null; // callback(selectedItemsArray)

        this._selected = null; // Will store the selected index
        this._root = null;
        this._cells = [];

        this._render();
    }

    _render() {
        // clear container
        while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
        
        // clear cells
        this._cells = [];

        const root = document.createElement('div');
        root.className = 'participant-choice-radio-group';
        root.style.display = 'flex';
        root.style.flexDirection = 'column';
        root.style.gap = '8px';
        root.style.width = '100%';
        root.style.boxSizing = 'border-box';

        this.items.forEach((item, idx) => {
            const cell = this._createCell(item, idx);
            root.appendChild(cell);
            this._cells.push(cell);
        });

        this.container.appendChild(root);
        this._root = root;
    }

    _createCell(item, idx) {
        const cell = document.createElement('div');
        cell.className = 'participant-choice-radio-cell';
        cell.dataset.index = String(idx);
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.style.cursor = 'pointer';
        cell.style.userSelect = 'none';
        cell.style.gap = '12px';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = `participant-choice-${Math.random()}`;
        radio.value = String(idx);
        radio.style.cursor = 'pointer';
        radio.style.flexShrink = 0;
        radio.style.resize = '2em';
        radio.style.transform = 'scale(1.5)';
        radio.style.cursor = 'pointer';
        radio.style.accentColor = '#6D28D9';
    

        const box = document.createElement('div');
        box.className = 'participant-choice-radio-box';
        box.style.flex = '1';
        box.style.cursor = 'pointer';

        if (this.boxed) {
            box.style.padding = '12px';
            box.style.border = '1px solid rgba(0,0,0,0.08)';
            box.style.borderRadius = '6px';
            box.style.background = 'white';
        }

        const label = document.createElement('label');
        label.textContent = String(item);
        label.style.cursor = 'pointer';
        label.style.margin = '0';

        box.appendChild(label);
        cell.appendChild(radio);
        cell.appendChild(box);

        const toggleSelect = (e) => {
            e && e.preventDefault();
            const index = Number(cell.dataset.index);

            // Deselect previous
            this._cells.forEach(c => {
                const r = c.querySelector('input[type="radio"]');
                if (r) r.checked = false;
            });

            // Select current
            radio.checked = true;
            radio.focus();
            this._selected = index;

            // notify
            if (typeof this.onChange === 'function') {
                this.onChange(this.getSelectedItems());
            }
        };

        box.addEventListener('click', toggleSelect);
        radio.addEventListener('change', toggleSelect);

        return cell;
    }

    getSelectedItems() {
        if (this._selected !== null) {
            return [this.items[this._selected]];
        }
        return [];
    }

    remove() {
        if (this._root && this._root.parentNode) {
            this._root.parentNode.removeChild(this._root);
            this._root = null;
            this._cells = [];
            this._selected = null;
        }
    }

    onsubmission(submissionsDone) {
        return;
    }
}