/**
 * Reusable Modal Manager Component
 */
export class Modal {
  /**
   * Create and present a modal overlay
   * @param {Object} options
   * @param {string} options.title - Modal title
   * @param {string|HTMLElement} options.content - HTML string or element
   * @param {string} [options.size] - Optional modal size ('modal-sm' | 'modal-lg' | 'modal-xl')
   * @param {Array<{text: string, class: string, onClick: Function}>} [options.actions] - Action buttons
   */
  constructor({ title, content, size = '', actions = [] }) {
    this.title = title;
    this.content = content;
    this.size = size;
    this.actions = actions;
    this.modalEl = null;
    this.backdropEl = null;

    this.render();
  }

  render() {
    // 1. Backdrop
    this.backdropEl = document.createElement('div');
    this.backdropEl.className = 'modal-backdrop fade show';
    document.body.appendChild(this.backdropEl);

    // 2. Modal Wrapper
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal fade show d-block';
    this.modalEl.tabIndex = -1;
    this.modalEl.setAttribute('role', 'dialog');

    const contentHtml = typeof this.content === 'string' ? this.content : '';

    this.modalEl.innerHTML = `
      <div class="modal-dialog ${this.size} modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content glass-modal text-white border-secondary">
          <div class="modal-header border-secondary border-opacity-50">
            <h5 class="modal-title fw-bold text-light">${this.title}</h5>
            <button type="button" class="btn-close btn-close-white" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            ${contentHtml}
          </div>
          ${this.actions.length > 0 ? `<div class="modal-footer border-secondary border-opacity-50"></div>` : ''}
        </div>
      </div>
    `;

    if (typeof this.content !== 'string') {
      const bodyEl = this.modalEl.querySelector('.modal-body');
      bodyEl.appendChild(this.content);
    }

    // Attach actions
    const footerEl = this.modalEl.querySelector('.modal-footer');
    if (footerEl) {
      this.actions.forEach((action) => {
        const btn = document.createElement('button');
        btn.className = `btn ${action.class || 'btn-secondary'}`;
        btn.textContent = action.text;
        btn.addEventListener('click', (e) => {
          if (action.onClick) action.onClick(e, this);
        });
        footerEl.appendChild(btn);
      });
    }

    // Attach close listener
    const closeBtn = this.modalEl.querySelector('.btn-close');
    closeBtn.addEventListener('click', () => this.close());

    this.backdropEl.addEventListener('click', () => this.close());

    document.body.appendChild(this.modalEl);
    document.body.classList.add('modal-open');
  }

  close() {
    if (this.modalEl) this.modalEl.remove();
    if (this.backdropEl) this.backdropEl.remove();
    document.body.classList.remove('modal-open');
  }

  /**
   * Helper to quickly present a confirmation dialog
   */
  static confirm({ title = 'Confirm Action', message, confirmText = 'Confirm', confirmClass = 'btn-danger', onConfirm }) {
    const modal = new Modal({
      title,
      content: `<p class="m-0">${message}</p>`,
      actions: [
        { text: 'Cancel', class: 'btn-outline-secondary', onClick: (_, m) => m.close() },
        {
          text: confirmText,
          class: confirmClass,
          onClick: async (_, m) => {
            if (onConfirm) await onConfirm();
            m.close();
          },
        },
      ],
    });
    return modal;
  }
}
