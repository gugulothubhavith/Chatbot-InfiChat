import { useState, type CSSProperties } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2, ShieldAlert } from 'lucide-react';
import { LazyMotion, m, domAnimation } from 'framer-motion';
import logo from '../logo.png';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showOtp, setShowOtp] = useState(false);
    const [otp, setOtp] = useState('');

    const { login, verifyOtp, token } = useAuth();

    if (token) {
        return <Navigate to="/dashboard" />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            if (!showOtp) {
                const res = await login(email, password);
                if (res.otp_required) {
                    setShowOtp(true);
                }
            } else {
                await verifyOtp(email, otp);
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Authentication failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
<LazyMotion features={domAnimation}>
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--color-bg)' }}>
            {/* Background elements */}
            <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] -translate-y-1/2" style={{ background: 'oklch(0.65 0.25 290 / 0.2)' }} />
            <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] -translate-y-1/2" style={{ background: 'oklch(0.7 0.15 160 / 0.15)' }} />

            <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md z-10"
            >
                <Card className="glass shadow-2xl p-6" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <CardHeader className="space-y-1 items-center pb-8">
                        <img src={logo} alt="Logo" className="w-32 h-32 object-contain mb-4" style={{ filter: 'drop-shadow(0 0 20px var(--color-accent-glow))' }} />
                        <CardDescription className="text-center font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                            Authorized personnel only. Secure session initialization.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            {error && (
                                <m.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm flex items-center gap-2"
                                >
                                    <ShieldAlert className="w-4 h-4" />
                                    {error}
                                </m.div>
                            )}
                            {!showOtp ? (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Admin Identifier</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="admin@system.io"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="transition-all rounded-xl h-14 font-medium px-4 border-0 focus-visible:ring-1 focus-visible:ring-offset-0 shadow-inner"
                                            style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                                        />
                                    </div>
                                    <div className="space-y-2 mt-4">
                                        <Label htmlFor="password" className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Security Clearance Key</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="transition-all rounded-xl h-14 font-medium px-4 border-0 focus-visible:ring-1 focus-visible:ring-offset-0 shadow-inner"
                                            style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                                        />
                                    </div>
                                </>
                            ) : (
                                <m.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-2"
                                >
                                    <Label htmlFor="otp" className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Two-Factor Auth Code</Label>
                                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>An authorization code has been dispatched to your secure channel.</p>
                                    <Input
                                        id="otp"
                                        type="text"
                                        placeholder="000000"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        required
                                        maxLength={6}
                                        className="transition-all rounded-xl h-14 text-center tracking-[0.5em] text-lg font-mono px-4 border-0 focus-visible:ring-1 focus-visible:ring-offset-0 shadow-inner"
                                        style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
                                    />
                                </m.div>
                            )}
                        </CardContent>
                        <CardFooter className="pt-6">
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-14 text-base font-bold transition-all hover:scale-[1.02] active:scale-[0.98] rounded-xl border-0"
                                style={{ background: 'var(--color-accent)', color: '#fff', boxShadow: '0 8px 24px oklch(0.65 0.25 290 / 0.4)' }}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Authenticating...
                                    </>
                                ) : (
                                    showOtp ? 'Verify Authorization' : 'Initialize Secure Session'
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </m.div>
        </div>
    </LazyMotion>
);
}
