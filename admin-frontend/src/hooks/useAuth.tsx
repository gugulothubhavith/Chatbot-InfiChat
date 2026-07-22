import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export interface User {
    email: string;
    user_id: string;
    picture?: string;
    role?: string;
    permissions?: string[];
}

interface AuthContextType {
    token: string | null;
    user: User | null;
    login: (email: string, password: string) => Promise<{ otp_required: boolean }>;
    verifyOtp: (email: string, otp: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const redirectLogin = () => {
    window.location.href = '/login';
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('admin_user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMe = async () => {
            if (token) {
                try {
                    const res = await axios.get(`${API_URL}/auth/me`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (res.data.role !== 'admin') {
                        throw new Error("Unauthorized: Admin access required.");
                    }

                    const userData = {
                        email: res.data.email,
                        user_id: res.data.user_id,
                        picture: res.data.avatar_url,
                        role: res.data.role,
                        permissions: res.data.permissions || []
                    };
                    setUser(userData);
                    localStorage.setItem('admin_user', JSON.stringify(userData));
                } catch (error) {
                    console.error("Admin session validation failed:", error);
                    logout();
                }
            }
            setIsLoading(false);
        };
        fetchMe();
    }, [token]);


    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const res = await axios.post(`${API_URL}/auth/login`, { email, password });

            if (res.data.access_token) {
                if (res.data.role !== 'admin') {
                    throw new Error("Access denied. Admin privileges required.");
                }

                const newToken = res.data.access_token;
                setToken(newToken);
                localStorage.setItem('admin_token', newToken);

                const userData = {
                    email: res.data.email,
                    user_id: res.data.user_id,
                    picture: res.data.avatar_url,
                    role: res.data.role,
                    permissions: res.data.permissions || []
                };
                setUser(userData);
                localStorage.setItem('admin_user', JSON.stringify(userData));

                return { otp_required: false };
            }

            return res.data;
        } catch (error: any) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const verifyOtp = async (email: string, otp: string) => {
        setIsLoading(true);
        try {
            const res = await axios.post(`${API_URL}/auth/verify-otp`, { email, otp });

            if (res.data.role !== 'admin') {
                throw new Error("Access denied. Admin privileges required.");
            }

            const newToken = res.data.access_token;
            setToken(newToken);
            localStorage.setItem('admin_token', newToken);

            const userData = {
                email: res.data.email,
                user_id: res.data.user_id,
                picture: res.data.avatar_url,
                role: res.data.role,
                permissions: res.data.permissions || []
            };
            setUser(userData);
            localStorage.setItem('admin_user', JSON.stringify(userData));

            window.location.href = '/dashboard';
        } catch (error: any) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ token, user, login, verifyOtp, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
