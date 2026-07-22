import { useEffect } from 'react';

/**
 * Accent color definitions in OKLCH color space.
 * Each accent has base, hover, subtle, and muted variants.
 */
const ACCENT_MAP = {
    default: {
        base:   'oklch(0.550 0.250 265)',
        hover:  'oklch(0.500 0.270 265)',
        subtle: 'oklch(0.550 0.250 265 / 0.08)',
        muted:  'oklch(0.550 0.250 265 / 0.15)',
    },
    indigo: {
        base:   'oklch(0.550 0.250 265)',
        hover:  'oklch(0.500 0.270 265)',
        subtle: 'oklch(0.550 0.250 265 / 0.08)',
        muted:  'oklch(0.550 0.250 265 / 0.15)',
    },
    sky: {
        base:   'oklch(0.600 0.200 240)',
        hover:  'oklch(0.550 0.220 240)',
        subtle: 'oklch(0.600 0.200 240 / 0.08)',
        muted:  'oklch(0.600 0.200 240 / 0.15)',
    },
    teal: {
        base:   'oklch(0.650 0.180 175)',
        hover:  'oklch(0.600 0.200 175)',
        subtle: 'oklch(0.650 0.180 175 / 0.08)',
        muted:  'oklch(0.650 0.180 175 / 0.15)',
    },
    green: {
        base:   'oklch(0.650 0.200 155)',
        hover:  'oklch(0.600 0.220 155)',
        subtle: 'oklch(0.650 0.200 155 / 0.08)',
        muted:  'oklch(0.650 0.200 155 / 0.15)',
    },
    orange: {
        base:   'oklch(0.700 0.200 55)',
        hover:  'oklch(0.650 0.220 55)',
        subtle: 'oklch(0.700 0.200 55 / 0.08)',
        muted:  'oklch(0.700 0.200 55 / 0.15)',
    },
    rose: {
        base:   'oklch(0.600 0.220 15)',
        hover:  'oklch(0.550 0.240 15)',
        subtle: 'oklch(0.600 0.220 15 / 0.08)',
        muted:  'oklch(0.600 0.220 15 / 0.15)',
    },
    purple: {
        base:   'oklch(0.580 0.230 295)',
        hover:  'oklch(0.530 0.250 295)',
        subtle: 'oklch(0.580 0.230 295 / 0.08)',
        muted:  'oklch(0.580 0.230 295 / 0.15)',
    },
} as const;

export type AccentColorId = keyof typeof ACCENT_MAP;

/**
 * Hook that syncs the selected accent color to CSS custom properties on :root.
 * This makes the accent color immediately available to all components via
 * var(--color-accent), var(--color-accent-hover), etc.
 */
export function useAccentColor(colorId: string) {
    useEffect(() => {
        const accent = ACCENT_MAP[colorId as AccentColorId] || ACCENT_MAP.default;
        const root = document.documentElement;

        root.style.setProperty('--color-accent', accent.base);
        root.style.setProperty('--color-accent-hover', accent.hover);
        root.style.setProperty('--color-accent-subtle', accent.subtle);
        root.style.setProperty('--color-accent-muted', accent.muted);

        // Also update shadow-glow to match accent
        root.style.setProperty('--shadow-glow', `0 0 20px ${accent.subtle}`);
    }, [colorId]);
}

export { ACCENT_MAP };
