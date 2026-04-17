'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type AuthMode = 'login' | 'signup';

export default function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setError('');
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                scopes: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.heart_rate.read https://www.googleapis.com/auth/fitness.sleep.read',
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
                redirectTo: `${window.location.origin}/api/auth/callback`,
            },
        });

        if (error) {
            setError(error.message);
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
            const body = mode === 'login'
                ? { email, password }
                : { email, password, name };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Something went wrong');
                return;
            }

            router.push('/dashboard');
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-surface-bright">
            {/* Left Side: Branding */}
            <section className="flex flex-col justify-center px-12 lg:px-24 py-12">
                <div className="max-w-md">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-2xl">health_and_safety</span>
                        </div>
                        <span className="font-headline text-2xl font-bold tracking-tight text-primary">CuraTrack</span>
                    </div>

                    <h1 className="font-headline text-5xl font-bold text-on-surface tracking-tight leading-[1.15] mb-6">
                        Empathetic Precision <br />in Modern Care.
                    </h1>

                    <p className="text-tertiary text-lg leading-relaxed mb-12">
                        Access your health ecosystem with clinical-grade security and human-centric simplicity.
                    </p>

                    <div className="space-y-4">
                        <div className="bg-surface-container-low p-6 rounded-2xl flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary-fixed rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary">verified_user</span>
                            </div>
                            <div>
                                <h3 className="font-headline font-bold text-on-surface">Secure Health Records</h3>
                                <p className="text-sm text-tertiary">End-to-end encryption for all medical data.</p>
                            </div>
                        </div>

                        <div className="bg-surface-container-low p-6 rounded-2xl flex items-center gap-4">
                            <div className="w-10 h-10 bg-secondary-container rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-secondary">medical_services</span>
                            </div>
                            <div>
                                <h3 className="font-headline font-bold text-on-surface">Seamless Telemedicine</h3>
                                <p className="text-sm text-tertiary">Connect with specialists in just two clicks.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Right Side: Auth Card */}
            <section className="flex flex-col items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-[540px] bg-white rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
                    {/* Tabs */}
                    <div className="flex relative border-b border-surface-container-high">
                        <button
                            onClick={() => { setMode('login'); setError(''); }}
                            className={`flex-1 py-8 text-center font-headline font-bold relative transition-colors ${mode === 'login' ? 'text-primary' : 'text-outline hover:bg-surface-container-low'}`}
                        >
                            Login
                            {mode === 'login' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary"></div>}
                        </button>
                        <button
                            onClick={() => { setMode('signup'); setError(''); }}
                            className={`flex-1 py-8 text-center font-headline font-bold relative transition-colors ${mode === 'signup' ? 'text-primary' : 'text-outline hover:bg-surface-container-low'}`}
                        >
                            Sign Up
                            {mode === 'signup' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary"></div>}
                        </button>
                    </div>

                    <div className="p-10 md:p-14 space-y-8">
                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-error-container rounded-xl text-on-error-container text-sm font-medium">
                                <span className="material-symbols-outlined text-lg">error</span>
                                {error}
                            </div>
                        )}

                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {/* Name field (signup only) */}
                            {mode === 'signup' && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-on-surface-variant">Full Name</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl">person</span>
                                        <input
                                            className="outline-none w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant"
                                            placeholder="John Doe"
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Email */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-on-surface-variant">Email Address</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl">mail</span>
                                    <input
                                        className="outline-none w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant"
                                        placeholder="name@example.com"
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="block text-sm font-semibold text-on-surface-variant">Password</label>
                                    {mode === 'login' && (
                                        <a className="text-xs font-bold text-primary hover:underline" href="#">Forgot password?</a>
                                    )}
                                </div>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl">lock</span>
                                    <input
                                        className="outline-none w-full pl-12 pr-12 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant"
                                        placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        minLength={mode === 'signup' ? 6 : undefined}
                                    />
                                    <button
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary"
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        <span className="material-symbols-outlined text-xl">
                                            {showPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <button
                                className="w-full py-4 auth-gradient text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                                        {mode === 'login' ? 'Signing In...' : 'Creating Account...'}
                                    </>
                                ) : (
                                    mode === 'login' ? 'Sign In to CuraTrack' : 'Create Account'
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-surface-container-high"></div>
                            <span className="flex-shrink mx-4 text-[10px] font-bold text-outline-variant uppercase tracking-widest">or continue with</span>
                            <div className="flex-grow border-t border-surface-container-high"></div>
                        </div>

                        {/* Google OAuth */}
                        <div className="grid gap-4">
                            <button
                                onClick={handleGoogleLogin}
                                className="flex items-center justify-center gap-3 py-3.5 px-4 bg-surface-container-low rounded-xl font-bold text-on-surface hover:bg-surface-container-high transition-colors"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                                </svg>
                                Continue with Google
                            </button>
                        </div>
                    </div>
                </div>

                <footer className="mt-8 flex gap-8 text-[13px] text-outline-variant font-semibold">
                    <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
                    <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
                    <a className="hover:text-primary transition-colors" href="#">Contact Support</a>
                </footer>
            </section>
        </div>
    );
}
