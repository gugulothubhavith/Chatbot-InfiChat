import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { Logo } from "../components/Logo";
import { LazyMotion, m, domAnimation } from "framer-motion";

export default function Login() {
    const { loginWithPassword, verifyOTP, loginWithGoogle, requestOTP } = useAuth();
    // ...
    // Update src in line 90

    const navigate = useNavigate();

    // UI State
    const [step, setStep] = useState<"email_password" | "otp">("email_password");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Step 1: Login with Password
    const handleLoginWithPassword = async (e: FormEvent) => {
        if (e) e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await loginWithPassword(email, password);
            if (res.otp_required) {
                setStep("otp");
            } else {
                // Should not happen with new logic, but for robustness:
                navigate("/");
            }
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            setError(detail || "Invalid email or password");
            // If the error indicates no password is set, we don't clear it yet so UI can show fallback
        } finally {
            setLoading(false);
        }
    };

    const handleLoginWithOTP = async (e?: FormEvent) => {
        if (e) e.preventDefault();
        if (!email) {
            setError("Please enter your email address first");
            return;
        }
        setError("");
        setLoading(true);
        try {
            await requestOTP(email);
            setStep("otp");
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to send OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOTP = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await verifyOTP(email, otp);
            navigate("/");
        } catch (err: any) {
            setError(err.response?.data?.detail || "Invalid OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        try {
            await loginWithGoogle(credentialResponse.credential);
            navigate("/");
        } catch (err: any) {
            console.error("DEBUG Google Login Error:", err.response || err);
            setError(err.response?.data?.detail || err.message || "Backend Google login failed");
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

                    <p className="text-center mb-6 text-sm font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                        {step === "email_password" ? "Sign in to your account" : "Enter Verification Code"}
                    </p>

                    {error && (
                        <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="px-4 py-3 rounded-xl mb-4 text-sm font-medium" style={{ background: 'color-mix(in oklch, var(--color-error) 10%, transparent)', color: 'var(--color-error)', border: '1px solid color-mix(in oklch, var(--color-error) 20%, transparent)' }}>
                            {error}
                            {error.includes("no password set") && (
                                <button
                                    onClick={() => handleLoginWithOTP()}
                                    className="block mt-2 font-bold underline transition-colors opacity-80 hover:opacity-100"
                                >
                                    Login with OTP instead →
                                </button>
                            )}
                        </m.div>
                    )}

                    {step === "email_password" ? (
                        <form onSubmit={handleLoginWithPassword} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Email</label>
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
                                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Password</label>
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
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 flex items-center justify-center mt-4 press-scale"
                                style={{ background: 'var(--color-accent)', color: '#fff', boxShadow: '0 4px 12px color-mix(in oklch, var(--color-accent) 40%, transparent)' }}
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    "Continue"
                                )}
                            </button>

                            <div className="text-center mt-6">
                                <button
                                    type="button"
                                    onClick={() => handleLoginWithOTP()}
                                    className="text-sm font-medium transition-colors hover-glow"
                                    style={{ color: 'var(--color-text-secondary)' }}
                                >
                                    Login with OTP instead
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOTP} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-center" style={{ color: 'var(--color-text-secondary)' }}>
                                    Verification Code
                                </label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    className="w-full px-4 py-4 rounded-xl text-center text-3xl tracking-[0.5em] focus:outline-none transition-all font-mono input-ring"
                                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                    required
                                    autoFocus
                                />
                                <p className="text-xs mt-3 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                                    Sent to <span style={{ color: 'var(--color-text-primary)' }}>{email}</span>
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 flex items-center justify-center mt-4 press-scale"
                                style={{ background: 'var(--color-text-primary)', color: 'var(--color-bg)', boxShadow: 'var(--shadow-md)' }}
                            >
                                {loading ? "Verifying..." : "Verify & Login"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep("email_password")}
                                className="w-full text-sm mt-4 font-medium hover-glow"
                                style={{ color: 'var(--color-text-tertiary)' }}
                            >
                                ← Back to password
                            </button>
                        </form>
                    )}

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
                                        onError={() => setError("Google popup closed or failed to open")}
                                        theme="filled_black"
                                        size="large"
                                        width="100%"
                                    />
                                </GoogleOAuthProvider>
                            </div>
                        </>
                    )}

                    <p className="text-center mt-8 text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                        Don't have an account?{" "}
                        <button
                            onClick={() => navigate("/register")}
                            className="font-semibold hover:underline"
                            style={{ color: 'var(--color-accent)' }}
                        >
                            Sign up
                        </button>
                    </p>
                </div>
            </m.div>
        </div>
    </LazyMotion>
);
}

