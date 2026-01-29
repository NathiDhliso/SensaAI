/**
 * Simple Toast Notification Utility
 * Provides lightweight toast notifications without external dependencies
 */

type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToastOptions {
  duration?: number; // milliseconds
  position?: 'top' | 'bottom';
}

class ToastManager {
  private container: HTMLDivElement | null = null;
  private toasts: Map<string, HTMLDivElement> = new Map();

  private ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  private createToast(message: string, type: ToastType): HTMLDivElement {
    const toast = document.createElement('div');
    toast.style.cssText = `
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      background: ${this.getBackgroundColor(type)};
      color: white;
      font-size: 0.875rem;
      font-weight: 500;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      pointer-events: auto;
      cursor: pointer;
      transition: all 0.2s ease;
      max-width: 400px;
      word-wrap: break-word;
    `;

    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span>${this.getIcon(type)}</span>
        <span>${message}</span>
      </div>
    `;

    // Hover effect
    toast.addEventListener('mouseenter', () => {
      toast.style.transform = 'translateX(-4px)';
    });
    toast.addEventListener('mouseleave', () => {
      toast.style.transform = 'translateX(0)';
    });

    return toast;
  }

  private getBackgroundColor(type: ToastType): string {
    switch (type) {
      case 'success':
        return '#10b981'; // green-500
      case 'error':
        return '#ef4444'; // red-500
      case 'warning':
        return '#f59e0b'; // amber-500
      case 'info':
      default:
        return '#3b82f6'; // blue-500
    }
  }

  private getIcon(type: ToastType): string {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  }

  show(message: string, type: ToastType = 'info', options: ToastOptions = {}) {
    const { duration = 3000 } = options;
    const container = this.ensureContainer();
    const toast = this.createToast(message, type);
    const id = `toast-${Date.now()}-${Math.random()}`;

    // Add to container
    container.appendChild(toast);
    this.toasts.set(id, toast);

    // Animate in
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    requestAnimationFrame(() => {
      toast.style.transition = 'all 0.3s ease';
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    });

    // Click to dismiss
    toast.addEventListener('click', () => {
      this.dismiss(id);
    });

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  dismiss(id: string) {
    const toast = this.toasts.get(id);
    if (!toast) return;

    // Animate out
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';

    setTimeout(() => {
      toast.remove();
      this.toasts.delete(id);

      // Clean up container if empty
      if (this.toasts.size === 0 && this.container) {
        this.container.remove();
        this.container = null;
      }
    }, 300);
  }

  dismissAll() {
    this.toasts.forEach((_, id) => this.dismiss(id));
  }
}

// Singleton instance
const toastManager = new ToastManager();

// Convenience functions
export const toast = {
  info: (message: string, options?: ToastOptions) => 
    toastManager.show(message, 'info', options),
  
  success: (message: string, options?: ToastOptions) => 
    toastManager.show(message, 'success', options),
  
  warning: (message: string, options?: ToastOptions) => 
    toastManager.show(message, 'warning', options),
  
  error: (message: string, options?: ToastOptions) => 
    toastManager.show(message, 'error', options),
  
  dismiss: (id: string) => toastManager.dismiss(id),
  
  dismissAll: () => toastManager.dismissAll(),
};
