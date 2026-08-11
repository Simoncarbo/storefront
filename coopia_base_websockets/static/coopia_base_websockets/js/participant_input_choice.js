export class ParticipantInputChoice {
    constructor(container, items, layout, multiple_select=false) {
        this.container = container;
        this.items = Array.isArray(items) ? items : [];
        this.layout = layout === 'rows' ? 'rows' : 'columns';
        this.multiple_select = !!multiple_select;

        this._selected = new Set();
        this.onChange = null; // callback(selectedItemsArray)

        this._root = null;
        this._cells = [];

        this._render();
    }

    _render() {
        // clear container
        while (this.container.firstChild) this.container.removeChild(this.container.firstChild);

        const root = document.createElement('div');
        root.className = 'participant-choice-grid';
        // styles to make grid take full width, rounded corners
        root.style.width = '100%';
        root.style.display = 'grid';
        root.style.gap = '6px';
        root.style.padding = '6px';
        root.style.boxSizing = 'border-box';
        root.style.borderRadius = '8px';
        root.style.overflow = 'hidden';
        root.style.alignItems = 'stretch';
        root.style.justifyItems = 'stretch';

        if (this.layout === 'columns') {
            // horizontal row of columns that share available width
            root.style.gridAutoFlow = 'column';
            root.style.gridAutoColumns = '1fr';
            root.style.gridAutoRows = 'auto';
            root.style.alignItems = 'center';
            root.style.justifyItems = 'center';
        } else {
            // rows layout: single column with full-width cells
            root.style.gridTemplateColumns = '1fr';
        }

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
        cell.className = 'participant-choice-cell';
        cell.dataset.index = String(idx);
        cell.tabIndex = 0;
        cell.style.userSelect = 'none';
        cell.style.cursor = 'pointer';
        cell.style.padding = '12px';
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.style.justifyContent = this.layout === 'columns' ? 'center' : 'flex-start';
        cell.style.border = '1px solid rgba(0,0,0,0.08)';
        cell.style.borderRadius = '6px';
        cell.style.background = 'white';
        cell.style.transition = 'box-shadow 0.12s, transform 0.08s';

        const txt = document.createElement('div');
        txt.className = 'participant-choice-text';
        txt.textContent = String(item);
        txt.style.width = '100%';
        txt.style.textAlign = this.layout === 'columns' ? 'center' : 'left';

        cell.appendChild(txt);

        const toggleSelect = (e) => {
            e && e.preventDefault();
            const index = Number(cell.dataset.index);
            if (this.multiple_select) {
                if (this._selected.has(index)) {
                    this._selected.delete(index);
                    this._applyUnselected(cell);
                } else {
                    this._selected.add(index);
                    this._applySelected(cell);
                }
            } else {
                if (this._selected.has(index)) {
                    // unselect
                    this._selected.delete(index);
                    this._applyUnselected(cell);
                } else {
                    // unselect previous
                    this._cells.forEach(c => this._applyUnselected(c));
                    this._selected.clear();
                    this._selected.add(index);
                    this._applySelected(cell);
                }
            }

            // notify
            if (typeof this.onChange === 'function') {
                this.onChange(this.getSelectedItems());
            }
        };

        cell.addEventListener('click', toggleSelect);
        cell.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                toggleSelect(ev);
            }
        });

        return cell;
    }

    _applySelected(cell) {
        cell.style.boxShadow = '0 4px 10px rgba(0,0,0,0.08)';
        cell.style.background = '#f0f9ff';
        cell.style.border = '1px solid rgba(0,124,255,0.25)';
        cell.style.fontWeight = '600';
        cell.setAttribute('aria-pressed', 'true');
    }

    _applyUnselected(cell) {
        cell.style.boxShadow = 'none';
        cell.style.background = 'white';
        cell.style.border = '1px solid rgba(0,0,0,0.08)';
        cell.style.fontWeight = '400';
        cell.setAttribute('aria-pressed', 'false');
    }

    getSelectedItems() {
        const selected = [];
        for (const idx of this._selected) {
            selected.push(this.items[idx]);
        }
        return selected;
    }

    remove() {
        if (this._root && this._root.parentNode) {
            this._root.parentNode.removeChild(this._root);
            this._root = null;
            this._cells = [];
            this._selected.clear();
        }
    }

    onsubmission() {
        return;
    }
}