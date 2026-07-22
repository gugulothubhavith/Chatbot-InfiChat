import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '../../lib/utils';

interface SwitchProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    id?: string;
    'aria-label'?: string;
}

/**
 * Switch — Radix-based toggle replacing all custom toggle implementations.
 * Uses accent color from CSS variables for consistency.
 */
export function Switch({ checked, onCheckedChange, disabled, id, ...props }: SwitchProps) {
    return (
        <SwitchPrimitive.Root
            id={id}
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={disabled}
            className={cn(
                'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center',
                'rounded-full border-2 border-transparent transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2',
                'focus-visible:ring-offset-[var(--color-surface)]',
                'disabled:cursor-not-allowed disabled:opacity-50',
                checked
                    ? 'bg-[var(--color-accent)]'
                    : 'bg-[var(--color-border)]',
            )}
            {...props}
        >
            <SwitchPrimitive.Thumb
                className={cn(
                    'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0',
                    'transition-transform duration-200',
                    checked ? 'translate-x-4' : 'translate-x-0',
                )}
            />
        </SwitchPrimitive.Root>
    );
}
