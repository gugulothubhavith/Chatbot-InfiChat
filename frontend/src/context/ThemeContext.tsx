import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { flushSync } from 'react-dom';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/** Resolve 'system' to actual light/dark */
function getSystemTheme(): ResolvedTheme {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): ResolvedTheme {
    return theme === 'system' ? getSystemTheme() : theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        const saved = localStorage.getItem('theme') as Theme;
        return saved || 'system';
    });

    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(theme === 'system' ? 'system' : (localStorage.getItem('theme') as Theme) || 'system'));

    const setTheme = (newTheme: Theme) => {
        const applyTheme = () => {
            flushSync(() => {
                setThemeState(newTheme);
                setResolvedTheme(resolveTheme(newTheme));
            });
        };

        // Use View Transitions API if available for smooth theme switch
        if (document.startViewTransition) {
            document.startViewTransition(applyTheme);
        } else {
            applyTheme();
        }
    };

    // Apply theme class to <html> element
    useEffect(() => {
        const root = document.documentElement;
        const resolved = resolveTheme(theme);

        root.classList.remove('light', 'dark');
        root.classList.add(resolved);
        setResolvedTheme(resolved);

        // Let CSS handle body background via var(--color-bg) — no hardcoded colors
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Listen for OS theme changes when in 'system' mode
    useEffect(() => {
        if (theme !== 'system') return;

        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => {
            const root = document.documentElement;
            const newResolved: ResolvedTheme = e.matches ? 'dark' : 'light';
            root.classList.remove('light', 'dark');
            root.classList.add(newResolved);
            setResolvedTheme(newResolved);
        };

        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, [theme]);

    const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
};
