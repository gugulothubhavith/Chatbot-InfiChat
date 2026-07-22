import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from '../../lib/utils';
import React from 'react';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'default';
    onConfirm: () => void;
    onCancel?: () => void;
}

/**
 * ConfirmDialog — Radix AlertDialog replacement for window.confirm().
 * Supports danger/warning/default variants with appropriate styling.
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const handleConfirm = () => {
        onConfirm();
        onOpenChange(false);
    };

    const handleCancel = () => {
        onCancel?.();
        onOpenChange(false);
    };

    return (
        <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <AlertDialogPrimitive.Portal>
                <AlertDialogPrimitive.Overlay
                    className={cn(
                        'fixed inset-0 z-[var(--z-overlay)]',
                        'bg-black/50 backdrop-blur-sm',
                        'data-[state=open]:animate-in data-[state=closed]:animate-out',
                        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
                    )}
                />
                <AlertDialogPrimitive.Content
                    className={cn(
                        'fixed left-1/2 top-1/2 z-[var(--z-modal)]',
                        '-translate-x-1/2 -translate-y-1/2',
                        'w-full max-w-md rounded-2xl p-6',
                        'shadow-2xl border',
                        'bg-[var(--color-surface)] border-[var(--color-border)]',
                        'data-[state=open]:animate-in data-[state=closed]:animate-out',
                        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                        'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
                        'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
                        'duration-200'
                    )}
                >
                    {/* Icon */}
                    <div className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center mb-4',
                        variant === 'danger' && 'bg-red-500/10',
                        variant === 'warning' && 'bg-amber-500/10',
                        variant === 'default' && 'bg-[var(--color-accent-subtle)]',
                    )}>
                        {variant === 'danger' && (
                            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                        )}
                        {variant === 'warning' && (
                            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                            </svg>
                        )}
                        {variant === 'default' && (
                            <svg className="w-6 h-6" style={{ color: 'var(--color-accent)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                            </svg>
                        )}
                    </div>

                    <AlertDialogPrimitive.Title className="text-lg font-semibold text-[var(--color-text-primary)]">
                        {title}
                    </AlertDialogPrimitive.Title>

                    <AlertDialogPrimitive.Description className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                        {description}
                    </AlertDialogPrimitive.Description>

                    <div className="mt-6 flex items-center justify-end gap-3">
                        <AlertDialogPrimitive.Cancel
                            onClick={handleCancel}
                            className={cn(
                                'px-4 py-2 rounded-lg text-sm font-medium',
                                'bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)]',
                                'hover:bg-[var(--color-surface-hover)] transition-colors',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]'
                            )}
                        >
                            {cancelLabel}
                        </AlertDialogPrimitive.Cancel>

                        <AlertDialogPrimitive.Action
                            onClick={handleConfirm}
                            className={cn(
                                'px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors',
                                'focus-visible:outline-none focus-visible:ring-2',
                                variant === 'danger' && 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500',
                                variant === 'warning' && 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500',
                                variant === 'default' && 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] focus-visible:ring-[var(--color-accent)]',
                            )}
                        >
                            {confirmLabel}
                        </AlertDialogPrimitive.Action>
                    </div>
                </AlertDialogPrimitive.Content>
            </AlertDialogPrimitive.Portal>
        </AlertDialogPrimitive.Root>
    );
}
