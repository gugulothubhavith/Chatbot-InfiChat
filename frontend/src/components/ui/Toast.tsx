import { Toaster as SonnerToaster, toast } from 'sonner';
import { useTheme } from '../../context/ThemeContext';

/**
 * ToastProvider — Sonner-based toast system replacing all window.alert() calls.
 * Automatically adapts to light/dark theme.
 * 
 * Usage:
 *   import { toast } from 'sonner';
 *   toast.success('Settings saved');
 *   toast.error('Failed to save');
 *   toast.warning('Are you sure?');
 *   toast.info('New update available');
 */
export function ToastProvider() {
    const { resolvedTheme } = useTheme();

    return (
        <SonnerToaster
            theme={resolvedTheme}
            position="bottom-right"
            toastOptions={{
                style: {
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-sm)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                },
                classNames: {
                    success: 'border-emerald-500/30',
                    error: 'border-red-500/30',
                    warning: 'border-amber-500/30',
                    info: 'border-sky-500/30',
                },
            }}
            closeButton
            richColors
            duration={4000}
        />
    );
}

// Re-export toast for convenience
export { toast };
