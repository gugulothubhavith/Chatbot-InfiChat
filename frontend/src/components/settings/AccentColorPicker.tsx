import { cn } from '../../lib/utils';
import { ACCENT_COLORS } from './types';
import { Check } from '@phosphor-icons/react';

interface AccentColorPickerProps {
    value: string;
    onChange: (colorId: string) => void;
}

/**
 * AccentColorPicker — Premium inline color picker with animated selection.
 * Replaces the basic dropdown accent selector.
 */
export function AccentColorPicker({ value, onChange }: AccentColorPickerProps) {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
                {ACCENT_COLORS.map((c) => {
                    const isSelected = value === c.id;
                    return (
                        <button
                            key={c.id}
                            title={c.label}
                            onClick={() => onChange(c.id)}
                            className={cn(
                                'relative w-7 h-7 rounded-full transition-all duration-200',
                                'hover:scale-110 active:scale-95',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                                'focus-visible:ring-[var(--color-border-focus)]',
                                isSelected && 'ring-2 ring-offset-2 ring-offset-[var(--color-surface)]',
                            )}
                            style={{
                                backgroundColor: c.color,
                                ...(isSelected ? { boxShadow: `0 0 12px ${c.color}50` } : {}),
                            }}
                        >
                            {isSelected && (
                                <Check
                                    size={14}
                                    className="absolute inset-0 m-auto text-white drop-shadow-sm"
                                    weight="bold"
                                />
                            )}
                        </button>
                    );
                })}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
                {ACCENT_COLORS.find(c => c.id === value)?.label ?? 'Default'}
            </span>
        </div>
    );
}
