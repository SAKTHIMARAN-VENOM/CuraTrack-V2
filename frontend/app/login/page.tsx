'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type AuthMode = 'login' | 'signup';
type UserRole = 'patient' | 'doctor' | 'fhw' | 'facility_manager' | 'admin';

export default function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [signupRole, setSignupRole] = useState<UserRole>('patient');
    const [roleVerificationKey, setRoleVerificationKey] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const getRoleKeyInfo = (role: UserRole) => {
        switch (role) {
            case 'doctor':
                return {
                    label: 'Doctor Medical License Key',
                    placeholder: 'e.g. DOC-KEY-2025 or MED-00471-TX',
                    helpText: 'Requires verified medical license for OPD queue and clinical prescriptions.'
                };
            case 'fhw':
                return {
                    label: 'ASHA / ANM Govt Authorization Key',
                    placeholder: 'e.g. ASHA-KEY-2025 or ASHA-402',
                    helpText: 'Requires official frontline healthcare worker badge or government registration code.'
                };
            case 'facility_manager':
                return {
                    label: 'Facility Institutional Passkey',
                    placeholder: 'e.g. FAC-KEY-2025 or FAC-MH-NDB-104',
                    helpText: 'Requires hospital / PHC facility administration authority code for EDL inventory.'
                };
            case 'admin':
                return {
                    label: 'District Administrator Security Key',
                    placeholder: 'e.g. ADMIN-KEY-2025 or DIST-ADMIN-99',
                    helpText: 'Requires district health authority security passkey for governance audits.'
                };
            default:
                return null;
        }
    };

    const handleGoogleLogin = async (e?: React.SyntheticEvent) => {
        if (e) e.preventDefault();
        setError('');
        setGoogleLoading(true);
        try {
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
                setGoogleLoading(false);
            }
        } catch (err: any) {
            setError(err?.message || 'Google Login failed');
            setGoogleLoading(false);
        }
    };

    const routeByRole = (role: string) => {
        switch (role) {
            case 'doctor':
                router.push('/doctor');
                break;
            case 'fhw':
                router.push('/fhw');
                break;
            case 'facility_manager':
                router.push('/facility');
                break;
            case 'admin':
                router.push('/admin');
                break;
            default:
                router.push('/dashboard');
                break;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
            const body = mode === 'login'
                ? { email: email.trim().toLowerCase(), password }
                : {
                    email: email.trim().toLowerCase(),
                    password,
                    name,
                    role: signupRole,
                    roleKey: roleVerificationKey.trim(),
                    doctorLicenseKey: roleVerificationKey.trim(),
                };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Invalid email or password');
                return;
            }

            const verifiedRole = data.user?.role || 'patient';
            const authPayload = data.user || { role: verifiedRole, email: email.trim().toLowerCase() };
            localStorage.setItem('curatrack_active_role', verifiedRole);
            localStorage.setItem('curatrack_auth_user', JSON.stringify(authPayload));
            document.cookie = `curatrack_auth=${encodeURIComponent(JSON.stringify(authPayload))}; path=/; max-age=604800; SameSite=Lax`;

            if (mode === 'signup' && verifiedRole === 'patient') {
                sessionStorage.setItem('curatrack_new_patient_signup', 'true');
                router.push('/onboarding/patient');
            } else {
                sessionStorage.removeItem('curatrack_new_patient_signup');
                routeByRole(verifiedRole);
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-surface-bright">
            {/* Left Side: Branding & Info */}
            <section className="flex flex-col justify-center px-8 lg:px-20 py-12 bg-gradient-to-br from-primary/5 via-white to-teal-500/5">
                <div className="max-w-lg mx-auto">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20">
                            <span className="material-symbols-outlined text-2xl">health_and_safety</span>
                        </div>
                        <div>
                            <span className="font-headline text-2xl font-black tracking-tight text-primary block leading-none">CuraTrack</span>
                            <span className="text-[10px] text-tertiary font-bold uppercase tracking-widest block mt-0.5">National Care Ecosystem</span>
                        </div>
                    </div>

                    <h1 className="font-headline text-4xl lg:text-5xl font-black text-on-surface tracking-tight leading-[1.15] mb-4">
                        Integrated Rural & Public Health Care Access.
                    </h1>

                    <p className="text-tertiary text-sm leading-relaxed mb-8">
                        Connecting citizens, ASHA workers, primary health centres, and district hospitals with seamless teleconsultation, triage, and supply tracking.
                    </p>

                    {/* Role Access Guide */}
                    <div className="space-y-3">
                        <span className="text-xs font-bold text-on-surface uppercase tracking-wider block">Role-Scoped Public Health Access</span>
                        <div className="grid grid-cols-1 gap-2.5">
                            <div className="bg-white/80 backdrop-blur p-3.5 rounded-2xl border border-surface-container flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary text-xl">person</span>
                                <div>
                                    <span className="text-xs font-bold text-on-surface block">Patient / Citizen</span>
                                    <span className="text-[11px] text-tertiary">Vitals, Consult Doctor, Records, PMJAY, 108 Emergency SOS</span>
                                </div>
                            </div>

                            <div className="bg-white/80 backdrop-blur p-3.5 rounded-2xl border border-surface-container flex items-center gap-3">
                                <span className="material-symbols-outlined text-teal-700 text-xl">stethoscope</span>
                                <div>
                                    <span className="text-xs font-bold text-on-surface block">Medical Officer / Doctor</span>
                                    <span className="text-[11px] text-tertiary">Clinical OPD Queue, Video Calls, Referrals & Lab Orders</span>
                                </div>
                            </div>

                            <div className="bg-white/80 backdrop-blur p-3.5 rounded-2xl border border-surface-container flex items-center gap-3">
                                <span className="material-symbols-outlined text-purple-700 text-xl">volunteer_activism</span>
                                <div>
                                    <span className="text-xs font-bold text-on-surface block">ASHA / Frontline Worker</span>
                                    <span className="text-[11px] text-tertiary">Village Surveillance, Maternal ANC, Assisted Teleconsult</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Right Side: Authentication & Demo Credential Cards */}
            <section className="flex flex-col items-center justify-center p-6 lg:p-12 overflow-y-auto">
                <div suppressHydrationWarning className="w-full max-w-[540px] bg-white rounded-3xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.06)] border border-surface-container-high overflow-hidden">
                    {/* Tabs */}
                    <div suppressHydrationWarning className="flex relative border-b border-surface-container-high">
                        <button
                            suppressHydrationWarning
                            onClick={() => { setMode('login'); setError(''); }}
                            className={`flex-1 py-5 text-center font-headline font-bold text-sm relative transition-colors ${mode === 'login' ? 'text-primary' : 'text-outline hover:bg-surface-container-low'}`}
                        >
                            Sign In
                            {mode === 'login' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary"></div>}
                        </button>
                        <button
                            suppressHydrationWarning
                            onClick={() => { setMode('signup'); setError(''); }}
                            className={`flex-1 py-5 text-center font-headline font-bold text-sm relative transition-colors ${mode === 'signup' ? 'text-primary' : 'text-outline hover:bg-surface-container-low'}`}
                        >
                            Create Account
                            {mode === 'signup' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary"></div>}
                        </button>
                    </div>

                    <div className="p-8 md:p-10 space-y-6">
                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-3 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-900 text-xs font-medium">
                                <span className="material-symbols-outlined text-base text-red-600">error</span>
                                <span>{error}</span>
                            </div>
                        )}

                        <form suppressHydrationWarning className="space-y-4" onSubmit={handleSubmit}>
                            {/* Name field (signup only) */}
                            {mode === 'signup' && (
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-tertiary">Full Name</label>
                                    <input
                                        suppressHydrationWarning
                                        className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                        placeholder="e.g. Kavita Bai"
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        required
                                    />
                                </div>
                            )}

                            {/* Role Picker (signup only) */}
                            {mode === 'signup' && (
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-tertiary">Select Stakeholder Role</label>
                                    <select
                                        suppressHydrationWarning
                                        className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary cursor-pointer"
                                        value={signupRole}
                                        onChange={e => setSignupRole(e.target.value as UserRole)}
                                    >
                                        <option value="patient">👤 Patient / Citizen</option>
                                        <option value="doctor">🩺 Medical Officer / Doctor</option>
                                        <option value="fhw">👩‍⚕️ ASHA / ANM Frontline Worker</option>
                                        <option value="facility_manager">🏥 Facility & Pharmacy Manager</option>
                                        <option value="admin">🏛️ District Health Administrator</option>
                                    </select>
                                </div>
                            )}

                            {/* Role Authorization / License Key (All non-patient roles) */}
                            {mode === 'signup' && signupRole !== 'patient' && (() => {
                                const keyInfo = getRoleKeyInfo(signupRole);
                                if (!keyInfo) return null;
                                return (
                                    <div className="space-y-1 animate-fadeIn">
                                        <div className="flex justify-between items-center">
                                            <label className="block text-xs font-semibold text-tertiary">{keyInfo.label}</label>
                                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">REQUIRED</span>
                                        </div>
                                        <input
                                            suppressHydrationWarning
                                            className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary uppercase tracking-wider font-mono"
                                            placeholder={keyInfo.placeholder}
                                            type="text"
                                            value={roleVerificationKey}
                                            onChange={e => setRoleVerificationKey(e.target.value)}
                                            required
                                        />
                                        <p className="text-[10px] text-tertiary leading-tight">{keyInfo.helpText}</p>
                                    </div>
                                );
                            })()}

                            {/* Email */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-tertiary">Email Address</label>
                                <input
                                    suppressHydrationWarning
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    placeholder="name@example.com"
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="block text-xs font-semibold text-tertiary">Password</label>
                                </div>
                                <div className="relative">
                                    <input
                                        suppressHydrationWarning
                                        className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary pr-10"
                                        placeholder="••••••••"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        suppressHydrationWarning
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-on-surface"
                                    >
                                        <span className="material-symbols-outlined text-base">
                                            {showPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                suppressHydrationWarning
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                                        <span>Authenticating...</span>
                                    </>
                                ) : (
                                    <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                                )}
                            </button>

                            {/* Google Sign In */}
                            <div className="pt-2">
                                <button
                                    suppressHydrationWarning
                                    type="button"
                                    onClick={handleGoogleLogin}
                                    disabled={googleLoading}
                                    className="w-full py-3 bg-white hover:bg-surface-container border border-surface-container-high rounded-xl text-xs font-bold text-on-surface flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                    </svg>
                                    <span>Continue with Google</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
        </div>
    );
}
