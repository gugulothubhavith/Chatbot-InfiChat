import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { Logo } from "../components/Logo";
import { LazyMotion, m, domAnimation } from "framer-motion";

export default function Register() {
    const { register, loginWithGoogle } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            await register(email, password);
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        try {
            await loginWithGoogle(credentialResponse.credential);
            navigate("/");
        } catch (err: any) {
            setError("Google sign up failed");
        }
    };

    return (
<LazyMotion features={domAnimation}>
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'var(--color-bg)' }}>
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)' }} />

            <m.div 
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-md relative z-10"
            >
                <div className="rounded-3xl p-8 glass-heavy" style={{ border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-2xl)' }}>
                    <div className="flex justify-center mb-8">
                        <Logo iconSize={48} nameSize={48} gap={12} />
                    </div>

                    <p className="text-center mb-6 text-sm font-medium" style={{ color: 'var(--color-text-tertiary)' }}>Create your account</p>

                    {error && (
                        <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="px-4 py-3 rounded-xl mb-4 text-sm font-medium text-center" style={{ background: 'color-mix(in oklch, var(--color-error) 10%, transparent)', color: 'var(--color-error)', border: '1px solid color-mix(in oklch, var(--color-error) 20%, transparent)' }}>
                            {error}
                        </m.div>
                    )}

                    {success ? (
                        <div className="text-center py-6 animate-scale-in">
                            <div className="p-5 rounded-2xl mb-8" style={{ background: 'color-mix(in oklch, var(--color-success) 10%, transparent)', border: '1px solid color-mix(in oklch, var(--color-success) 20%, transparent)', color: 'var(--color-success)' }}>
                                <h3 className="font-semibold text-xl mb-2 flex items-center justify-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                    </svg>
                                    Registration Successful!
                                </h3>
                                <p className="text-sm font-medium opacity-90">Your account has been created. You can now sign in with your credentials.</p>
                            </div>
                            <button
                                onClick={() => navigate("/login")}
                                className="w-full py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center press-scale"
                                style={{ background: 'var(--color-accent)', color: '#fff', boxShadow: '0 4px 12px color-mix(in oklch, var(--color-accent) 40%, transparent)' }}
                            >
                                Go to Sign In
                            </button>
                        </div>
                    ) : (
                        <>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@company.com"
                                        className="w-full px-4 py-3 rounded-xl focus:outline-none transition-all text-sm font-medium input-ring"
                                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 rounded-xl focus:outline-none transition-all text-sm font-medium input-ring"
                                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                                        Confirm Password
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 rounded-xl focus:outline-none transition-all text-sm font-medium input-ring"
                                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 flex items-center justify-center mt-6 press-scale"
                                    style={{ background: 'var(--color-accent)', color: '#fff', boxShadow: '0 4px 12px color-mix(in oklch, var(--color-accent) 40%, transparent)' }}
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        "Sign Up"
                                    )}
                                </button>
                            </form>

                            {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                                <>
                                    <div className="relative my-8">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t" style={{ borderColor: 'var(--color-border)' }}></div>
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
                                            <span className="px-3" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-tertiary)' }}>Or continue with</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-center">
                                        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
                                            <GoogleLogin
                                                onSuccess={handleGoogleSuccess}
                                                onError={() => setError("Google sign up failed")}
                                                theme="filled_black"
                                                size="large"
                                                width="100%"
                                            />
                                        </GoogleOAuthProvider>
                                    </div>
                                </>
                            )}

                            <p className="text-center mt-8 text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                                Already have an account?{" "}
                                <button
                                    onClick={() => navigate("/login")}
                                    className="font-semibold hover:underline"
                                    style={{ color: 'var(--color-accent)' }}
                                >
                                    Sign in
                                </button>
                            </p>
                        </>
                    )}
                </div>
            </m.div>
        </div>
    </LazyMotion>
);
}
