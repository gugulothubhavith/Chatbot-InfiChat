/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Geist', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
                mono: ['Geist Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
            },
            colors: {
                brand: {
                    DEFAULT: 'var(--color-accent)',
                    hover: 'var(--color-accent-hover)',
                    subtle: 'var(--color-accent-subtle)',
                    muted: 'var(--color-accent-muted)',
                },
                surface: {
                    DEFAULT: 'var(--color-surface)',
                    hover: 'var(--color-surface-hover)',
                    active: 'var(--color-surface-active)',
                    elevated: 'var(--color-elevated)',
                },
            },
            borderRadius: {
                'sm': 'var(--radius-sm)',
                'md': 'var(--radius-md)',
                'lg': 'var(--radius-lg)',
                'xl': 'var(--radius-xl)',
                '2xl': 'var(--radius-2xl)',
                '3xl': 'var(--radius-3xl)',
                'pill': 'var(--radius-pill)',
            },
            boxShadow: {
                'xs': 'var(--shadow-xs)',
                'sm': 'var(--shadow-sm)',
                'md': 'var(--shadow-md)',
                'lg': 'var(--shadow-lg)',
                'xl': 'var(--shadow-xl)',
                'glow': 'var(--shadow-glow)',
                'inner': 'var(--shadow-inner)',
                'island': 'var(--shadow-island)',
            },
            transitionTimingFunction: {
                'out-expo': 'var(--ease-out)',
                'in-out-expo': 'var(--ease-in-out)',
                'drawer': 'var(--ease-drawer)',
                'spring': 'var(--ease-spring)',
                'expo-out': 'var(--ease-expo-out)',
            },
            transitionDuration: {
                'instant': 'var(--dur-instant)',
                'fast': 'var(--dur-fast)',
                'normal': 'var(--dur-normal)',
                'slow': 'var(--dur-slow)',
                'reveal': 'var(--dur-reveal)',
                'dramatic': 'var(--dur-dramatic)',
            },
            fontSize: {
                'xs': ['var(--text-xs)', { lineHeight: 'var(--leading-normal)' }],
                'sm': ['var(--text-sm)', { lineHeight: 'var(--leading-normal)' }],
                'base': ['var(--text-base)', { lineHeight: 'var(--leading-normal)' }],
                'md': ['var(--text-md)', { lineHeight: 'var(--leading-normal)' }],
                'lg': ['var(--text-lg)', { lineHeight: 'var(--leading-snug)' }],
                'xl': ['var(--text-xl)', { lineHeight: 'var(--leading-tight)' }],
                '2xl': ['var(--text-2xl)', { lineHeight: 'var(--leading-tight)' }],
                '3xl': ['var(--text-3xl)', { lineHeight: 'var(--leading-tight)' }],
                'hero': ['var(--text-hero)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
            },
            animation: {
                'fade-in': 'fadeIn var(--dur-reveal) var(--ease-out) both',
                'slide-up': 'slideUp var(--dur-reveal) var(--ease-out) both',
                'slide-down': 'slideDown var(--dur-slow) var(--ease-out) both',
                'scale-in': 'scaleIn var(--dur-slow) var(--ease-out) both',
                'blur-in': 'blurIn var(--dur-reveal) var(--ease-out) both',
                'shimmer': 'shimmer 1.5s ease-in-out infinite',
                'breathe': 'breathe 4s ease-in-out infinite',
                'float': 'float 6s ease-in-out infinite',
                'recording-pulse': 'recordingPulse 1.5s ease-in-out infinite',
                'gradient-shift': 'gradientShift 8s ease infinite',
                'spin-slow': 'spin 3s linear infinite',
            },
            keyframes: {
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                slideUp: {
                    from: { opacity: '0', transform: 'translateY(12px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                slideDown: {
                    from: { opacity: '0', transform: 'translateY(-8px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                scaleIn: {
                    from: { opacity: '0', transform: 'scale(0.95)' },
                    to: { opacity: '1', transform: 'scale(1)' },
                },
                blurIn: {
                    from: { opacity: '0', filter: 'blur(8px)', transform: 'translateY(8px)' },
                    to: { opacity: '1', filter: 'blur(0)', transform: 'translateY(0)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '200% 0' },
                    '100%': { backgroundPosition: '-200% 0' },
                },
                breathe: {
                    '0%, 100%': { opacity: '0.85', transform: 'scale(1)' },
                    '50%': { opacity: '1', transform: 'scale(1.02)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-8px)' },
                },
                recordingPulse: {
                    '0%, 100%': { boxShadow: '0 0 0 0 oklch(0.580 0.220 25 / 0.4)' },
                    '50%': { boxShadow: '0 0 0 8px oklch(0.580 0.220 25 / 0)' },
                },
                gradientShift: {
                    '0%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                    '100%': { backgroundPosition: '0% 50%' },
                },
            },
            backdropBlur: {
                'xs': '2px',
                'sm': '4px',
                'md': '12px',
                'lg': '20px',
                'xl': '40px',
                '2xl': '64px',
                '3xl': '100px',
            },
        },
    },
    plugins: [],
}
