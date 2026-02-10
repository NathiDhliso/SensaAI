type ToastType = 'info' | 'success' | 'warning' | 'error';
interface ToastOptions {
 duration?: number;
 position?: 'top' | 'bottom';
}
const DEDUP_WINDOW_MS = 2000;
class ToastManager {
 private container: HTMLDivElement | null = null;
 private toasts: Map<string, HTMLDivElement> = new Map();
 private recentMessages: Map<string, number> = new Map();
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
 private isDuplicate(message: string, type: ToastType): boolean {
 const key = `${type}:${message}`;
 const lastShown = this.recentMessages.get(key);
 if (lastShown && Date.now() - lastShown < DEDUP_WINDOW_MS) return true;
 this.recentMessages.set(key, Date.now());
 if (this.recentMessages.size > 50) {
 const oldest = [...this.recentMessages.entries()]
 .sort((a, b) => a[1] - b[1])[0];
 if (oldest) this.recentMessages.delete(oldest[0]);
 }
 return false;
 }
 private getStyles(type: ToastType): { bg: string; border: string; text: string; icon: string } {
 switch (type) {
 case 'success':
 return {
 bg: 'var(--color-surface)',
 border: 'var(--color-success)',
 text: 'var(--color-text-primary)',
 icon: 'var(--color-success)'
 };
 case 'error':
 return {
 bg: 'var(--color-surface)',
 border: 'var(--color-error)',
 text: 'var(--color-text-primary)',
 icon: 'var(--color-error)'
 };
 case 'warning':
 return {
 bg: 'var(--color-surface)',
 border: 'var(--color-warning)',
 text: 'var(--color-text-primary)',
 icon: 'var(--color-warning)'
 };
 case 'info':
 default:
 return {
 bg: 'var(--color-surface)',
 border: 'var(--color-primary)',
 text: 'var(--color-text-primary)',
 icon: 'var(--color-primary)'
 };
 }
 }
 private getIcon(type: ToastType): string {
 switch (type) {
 case 'success': return '';
 case 'error': return '';
 case 'warning': return '';
 case 'info':
 default: return 'ℹ';
 }
 }
 private createToast(message: string, type: ToastType): HTMLDivElement {
 const s = this.getStyles(type);
 const el = document.createElement('div');
 el.style.cssText = `
 padding: 0.75rem 1rem;
 border-radius: 0.5rem;
 background: ${s.bg};
 border-left: 3px solid ${s.border};
 color: ${s.text};
 font-size: 0.875rem;
 font-weight: 500;
 box-shadow: var(--shadow-toast, 0 4px 12px rgba(0,0,0,0.25));
 pointer-events: auto;
 cursor: pointer;
 transition: all 0.2s ease;
 max-width: 400px;
 word-wrap: break-word;
 `;
 el.innerHTML = `
 <div style="display: flex; align-items: center; gap: 0.5rem;">
 <span style="color: ${s.icon}; font-weight: 700;">${this.getIcon(type)}</span>
 <span>${message}</span>
 </div>
 `;
 el.addEventListener('mouseenter', () => { el.style.transform = 'translateX(-4px)'; });
 el.addEventListener('mouseleave', () => { el.style.transform = 'translateX(0)'; });
 return el;
 }
 show(message: string, type: ToastType = 'info', options: ToastOptions = {}) {
 if (this.isDuplicate(message, type)) return '';
 const { duration = 3000 } = options;
 const container = this.ensureContainer();
 const el = this.createToast(message, type);
 const id = `toast-${Date.now()}-${Math.random()}`;
 container.appendChild(el);
 this.toasts.set(id, el);
 el.style.opacity = '0';
 el.style.transform = 'translateX(100%)';
 requestAnimationFrame(() => {
 el.style.transition = 'all 0.3s ease';
 el.style.opacity = '1';
 el.style.transform = 'translateX(0)';
 });
 el.addEventListener('click', () => { this.dismiss(id); });
 if (duration > 0) {
 setTimeout(() => { this.dismiss(id); }, duration);
 }
 return id;
 }
 dismiss(id: string) {
 const el = this.toasts.get(id);
 if (!el) return;
 el.style.opacity = '0';
 el.style.transform = 'translateX(100%)';
 setTimeout(() => {
 el.remove();
 this.toasts.delete(id);
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
const toastManager = new ToastManager();
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
 dismissAll: () => toastManager.dismissAll()
};
