/**
 * Toast Notification Component
 * Renders user-friendly alert toasts in the top-right corner.
 */
export class Toast {
  static container = null;

  static initContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container position-fixed top-0 end-0 p-3';
      this.container.style.zIndex = '9999';
      document.body.appendChild(this.container);
    }
  }

  /**
   * Show a toast message
   * @param {string} message - Message text
   * @param {'success'|'danger'|'warning'|'info'} type - Toast type
   * @param {number} duration - Display duration in ms
   */
  static show(message, type = 'info', duration = 4000) {
    this.initContainer();

    const toastEl = document.createElement('div');
    const bgClass = type === 'danger' ? 'bg-danger' : type === 'success' ? 'bg-success' : type === 'warning' ? 'bg-warning text-dark' : 'bg-primary';
    const iconClass = type === 'danger' ? 'fa-circle-xmark' : type === 'success' ? 'fa-circle-check' : type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info';

    toastEl.className = `toast align-items-center text-white ${bgClass} border-0 show shadow-lg mb-2`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');

    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2 py-3 px-3">
          <i class="fa-solid ${iconClass} fs-5"></i>
          <div>${message}</div>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close"></button>
      </div>
    `;

    const closeBtn = toastEl.querySelector('.btn-close');
    closeBtn.addEventListener('click', () => {
      toastEl.classList.remove('show');
      setTimeout(() => toastEl.remove(), 300);
    });

    this.container.appendChild(toastEl);

    if (duration > 0) {
      setTimeout(() => {
        if (toastEl.parentNode) {
          toastEl.classList.remove('show');
          setTimeout(() => toastEl.remove(), 300);
        }
      }, duration);
    }
  }

  static success(message, duration = 4000) {
    this.show(message, 'success', duration);
  }

  static error(message, duration = 5000) {
    this.show(message, 'danger', duration);
  }

  static warning(message, duration = 4000) {
    this.show(message, 'warning', duration);
  }

  static info(message, duration = 4000) {
    this.show(message, 'info', duration);
  }
}
