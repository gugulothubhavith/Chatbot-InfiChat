import { useTheme } from '../../context/ThemeContext';
import { THEME_OPTIONS } from './types';
import { cn } from '../../lib/utils';

interface ThemePreviewCardsProps {
    value: 'light' | 'dark' | 'system';
    onChange: (theme: 'light' | 'dark' | 'system') => void;
}

/**
 * ThemePreviewCards — Premium visual theme selector with live mini-preview.
 * Replaces the basic dropdown with 3 interactive cards showing a mockup of each theme.
 */
export function ThemePreviewCards({ value, onChange }: ThemePreviewCardsProps) {
    const { resolvedTheme } = useTheme();

    return (
        <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map((opt) => {
                const isSelected = value === opt.id;
                // Determine preview background color
                const previewBg = opt.id === 'dark' ? '#0a0a0a'
                    : opt.id === 'light' ? '#fafafa'
                    : resolvedTheme === 'dark' ? '#0a0a0a' : '#fafafa';
                const previewFg = opt.id === 'dark' ? '#e5e5e5'
                    : opt.id === 'light' ? '#171717'
                    : resolvedTheme === 'dark' ? '#e5e5e5' : '#171717';
                const previewBorder = opt.id === 'dark' ? '#262626'
                    : opt.id === 'light' ? '#e5e5e5'
                    : resolvedTheme === 'dark' ? '#262626' : '#e5e5e5';

                return (
                    <button
                        key={opt.id}
                        onClick={() => onChange(opt.id)}
                        className={cn(
                            'group relative flex flex-col rounded-xl border-2 p-3 transition-all duration-200',
                            'hover:shadow-lg hover:-translate-y-0.5',
                            isSelected
                                ? 'border-[var(--color-accent)] shadow-md ring-1 ring-[var(--color-accent-subtle)]'
                                : 'border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600'
                        )}
                    >
                        {/* Mini Preview */}
                        <div
                            className="w-full aspect-[4/3] rounded-lg mb-2.5 overflow-hidden border"
                            style={{ backgroundColor: previewBg, borderColor: previewBorder }}
                        >
                            {/* Mini sidebar */}
                            <div className="flex h-full">
                                <div
                                    className="w-[30%] h-full border-r p-1.5 flex flex-col gap-1"
                                    style={{ borderColor: previewBorder }}
                                >
                                    <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: previewBorder }} />
                                    <div className="w-3/4 h-1.5 rounded-full" style={{ backgroundColor: previewBorder }} />
                                    <div className="w-full h-1.5 rounded-full opacity-50" style={{ backgroundColor: previewBorder }} />
                                </div>
                                {/* Mini content */}
                                <div className="flex-1 p-2 flex flex-col justify-end gap-1">
                                    <div className="w-3/4 h-2 rounded-full" style={{ backgroundColor: previewBorder }} />
                                    <div className="w-full h-4 rounded-md" style={{ backgroundColor: 'var(--color-accent)', opacity: 0.8 }} />
                                </div>
                            </div>
                        </div>

                        {/* Label */}
                        <div className="flex items-center gap-2">
                            <opt.icon size={14} className={cn(
                                'transition-colors',
                                isSelected ? 'text-[var(--color-accent)]' : 'text-gray-400 dark:text-gray-500'
                            )} />
                            <span className={cn(
                                'text-xs font-semibold transition-colors',
                                isSelected
                                    ? 'text-[var(--color-accent)]'
                                    : 'text-gray-600 dark:text-gray-400'
                            )}>
                                {opt.label}
                            </span>
                        </div>

                        {/* Selection indicator */}
                        {isSelected && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
