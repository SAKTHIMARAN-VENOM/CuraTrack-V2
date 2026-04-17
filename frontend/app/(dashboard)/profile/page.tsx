'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { API_BASE } from '@/lib/api';

export default function ProfilePage() {
    const [qrImage, setQrImage] = useState<string | null>(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [qrError, setQrError] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<number | null>(null);
    const [countdown, setCountdown] = useState<string>('');
    const [isExpired, setIsExpired] = useState(false);
    const [userName, setUserName] = useState('Alex Sterling Rivera');

    // Fetch user name from Supabase
    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata?.name) {
                setUserName(user.user_metadata.name);
            } else if (user?.email) {
                setUserName(user.email.split('@')[0]);
            }
        };
        fetchUser();
    }, []);

    // Countdown timer
    useEffect(() => {
        if (!expiresAt) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const remaining = expiresAt - now;

            if (remaining <= 0) {
                setCountdown('00:00');
                setIsExpired(true);
                clearInterval(interval);
                return;
            }

            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            setCountdown(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(interval);
    }, [expiresAt]);

    const generateQR = useCallback(async () => {
        setQrLoading(true);
        setQrError(null);
        setIsExpired(false);
        setQrImage(null);

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setQrError('You must be logged in to generate a QR code.');
                return;
            }

            const res = await fetch(`${API_BASE}/api/qr/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, userName: userName }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'Failed to generate QR code');
            }

            const data = await res.json();
            setQrImage(data.qrImage);
            setExpiresAt(Date.now() + (data.expiresInSeconds || 300) * 1000);
        } catch (err: any) {
            setQrError(err.message || 'Failed to generate QR code. Ensure backend is running.');
        } finally {
            setQrLoading(false);
        }
    }, [userName]);

    return (
        <div className="flex-1 p-8 lg:p-12 bg-surface max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                {/* Left Column: Branding & Info */}
                <div className="lg:col-span-5 space-y-8">
                    <div className="space-y-2">
                        <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container text-xs font-bold rounded-full">ENCRYPTED ACCESS</span>
                        <h2 className="text-4xl lg:text-5xl font-headline font-extrabold tracking-tight text-on-surface">Your Secure Health ID</h2>
                        <p className="text-tertiary font-body text-lg leading-relaxed max-w-sm">
                            Present this code to your healthcare provider for instant, secure access to your clinical profile and history.
                        </p>
                    </div>

                    {/* Data List: Profile Fields */}
                    <div className="space-y-1">
                        <div className="p-6 bg-surface-container-low rounded-xl group transition-all hover:bg-surface-container shadow-sm border border-surface-container">
                            <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Full Name</p>
                            <p className="text-xl font-headline font-bold text-on-surface">{userName}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 mt-1">
                            <div className="p-6 bg-surface-container-low rounded-xl group transition-all hover:bg-surface-container shadow-sm border border-surface-container">
                                <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Age</p>
                                <p className="text-xl font-headline font-bold text-on-surface">28</p>
                            </div>
                            <div className="p-6 bg-surface-container-low rounded-xl group transition-all hover:bg-surface-container shadow-sm border border-surface-container">
                                <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Gender</p>
                                <p className="text-xl font-headline font-bold text-on-surface">Male</p>
                            </div>
                            <div className="p-6 bg-surface-container-low rounded-xl group transition-all hover:bg-surface-container shadow-sm border border-surface-container">
                                <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Blood</p>
                                <p className="text-xl font-headline font-bold text-on-surface">O+</p>
                            </div>
                        </div>
                    </div>

                    {/* Generate QR Button */}
                    <button
                        onClick={generateQR}
                        disabled={qrLoading}
                        className="w-full px-8 py-4 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_2</span>
                        {qrLoading ? 'Generating...' : isExpired ? 'Regenerate Secure QR' : 'Generate Secure QR'}
                    </button>

                    {qrError && (
                        <div className="flex items-center gap-3 p-4 bg-error-container rounded-xl text-on-error-container text-sm font-medium">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {qrError}
                        </div>
                    )}
                </div>

                {/* Right Column: QR Code Visual */}
                <div className="lg:col-span-7 flex justify-center lg:justify-end">
                    <div className="relative w-full max-w-md aspect-square bg-surface-container-lowest rounded-[2.5rem] p-10 flex flex-col items-center justify-center shadow-xl shadow-on-surface/5 border border-outline-variant/10">
                        {/* Secure Shield Background Ornament */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20rem]">verified_user</span>
                        </div>

                        {qrImage ? (
                            <>
                                <div className={`relative z-10 w-full aspect-square bg-white p-6 rounded-3xl shadow-sm overflow-hidden flex items-center justify-center ${isExpired ? 'opacity-30 blur-sm' : ''}`}>
                                    <img
                                        src={qrImage}
                                        alt="Secure Health QR Code"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                {isExpired && (
                                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
                                        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl text-center shadow-lg">
                                            <span className="material-symbols-outlined text-4xl text-error mb-2">timer_off</span>
                                            <p className="font-bold text-on-surface text-lg">QR Expired</p>
                                            <p className="text-sm text-tertiary mt-1">Click regenerate for a new code</p>
                                        </div>
                                    </div>
                                )}
                                <div className="mt-8 text-center pt-4">
                                    <p className="text-on-surface-variant font-medium flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                                        {isExpired ? 'Token expired' : 'Dynamic encryption active'}
                                    </p>
                                    <p className={`text-xs mt-1 font-mono font-bold ${isExpired ? 'text-error' : 'text-tertiary'}`}>
                                        {isExpired ? 'Expired' : `Expires in ${countdown}`}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="relative z-10 w-full aspect-square bg-white p-6 rounded-3xl shadow-sm overflow-hidden flex items-center justify-center">
                                    {/* QR Placeholder */}
                                    <div className="w-full h-full relative border-[12px] border-primary" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #001f29 1px, transparent 0)', backgroundSize: '12px 12px' }}>
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[2px]">
                                            <div className="w-4/5 h-4/5 bg-white border-8 border-primary flex items-center justify-center p-2">
                                                <div className="w-full h-full grid grid-cols-5 grid-rows-5 gap-1">
                                                    <div className="col-span-2 row-span-2 bg-primary"></div>
                                                    <div className="bg-primary/20"></div><div className="bg-primary"></div><div className="bg-primary/40"></div>
                                                    <div className="bg-primary/50"></div><div className="bg-primary"></div><div className="bg-primary/20"></div>
                                                    <div className="bg-primary"></div><div className="bg-primary/70"></div><div className="bg-primary/30"></div>
                                                    <div className="col-span-2 row-span-2 bg-primary"></div><div className="bg-primary/20"></div><div className="bg-primary"></div>
                                                    <div className="bg-primary/50"></div><div className="bg-primary"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 text-center pt-4">
                                    <p className="text-on-surface-variant font-medium flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                                        Click generate to create a secure QR
                                    </p>
                                    <p className="text-xs text-tertiary mt-1 italic">Valid for 5 minutes after generation</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Section: Trust indicators */}
            <div className="mt-16 pt-8 border-t border-outline-variant/10 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">health_and_safety</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-sm">HIPAA Compliant</h4>
                        <p className="text-xs text-tertiary leading-tight mt-1">Your data is stored and transmitted using industry-leading encryption standards.</p>
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">history</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-sm">Access Logs</h4>
                        <p className="text-xs text-tertiary leading-tight mt-1">Every scan of your Health ID is logged. You receive a notification for every external access.</p>
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">toggle_on</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-sm">You&apos;re in Control</h4>
                        <p className="text-xs text-tertiary leading-tight mt-1">Revoke access or update sharing permissions instantly from your profile settings.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
