'use client';

import { useState } from 'react';
import { API_BASE } from '@/lib/api';

const SCOPE_OPTIONS = [
    { value: 'medications', label: 'Active Medications', icon: 'pill', color: 'text-amber-600 bg-amber-50' },
    { value: 'allergies', label: 'Allergies', icon: 'warning', color: 'text-red-600 bg-red-50' },
    { value: 'vitals', label: 'Latest Vitals', icon: 'favorite', color: 'text-pink-600 bg-pink-50' },
    { value: 'diagnoses', label: 'Last 3 Diagnoses', icon: 'clinical_notes', color: 'text-blue-600 bg-blue-50' },
    { value: 'insurance', label: 'Insurance Status', icon: 'shield', color: 'text-green-600 bg-green-50' },
];

interface Props {
    userId: string;
    userName: string;
    onClose: () => void;
}

export function PassportQRModal({ userId, userName, onClose }: Props) {
    const [selectedScopes, setSelectedScopes] = useState<string[]>(['medications', 'allergies']);
    const [loading, setLoading] = useState(false);
    const [qrData, setQrData] = useState<{ qrImage: string; token: string; expiresInSeconds: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(0);

    const toggleScope = (scope: string) => {
        setSelectedScopes(prev =>
            prev.includes(scope)
                ? prev.filter(s => s !== scope)
                : [...prev, scope]
        );
    };

    const handleGenerate = async () => {
        if (selectedScopes.length === 0) {
            setError('Select at least one data scope');
            return;
        }

        setLoading(true);
        setError(null);
        setQrData(null);

        try {
            const res = await fetch(`${API_BASE}/api/passport/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    userName,
                    scope: selectedScopes,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'Failed to generate passport');
            }

            const data = await res.json();
            setQrData(data);

            // Start countdown
            let remaining = data.expiresInSeconds;
            setCountdown(remaining);
            const interval = setInterval(() => {
                remaining--;
                setCountdown(remaining);
                if (remaining <= 0) {
                    clearInterval(interval);
                    setQrData(null);
                }
            }, 1000);
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 pb-0">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 primary-gradient rounded-xl flex items-center justify-center text-white">
                                <span className="material-symbols-outlined text-lg">qr_code_2</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-extrabold text-on-surface font-headline tracking-tight">Patient Passport</h2>
                                <p className="text-xs text-tertiary">Secure, scoped, one-time access</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-tertiary hover:bg-surface-container-highest transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                </div>

                {!qrData ? (
                    <>
                        {/* Scope Selector */}
                        <div className="p-6">
                            <p className="text-sm font-bold text-on-surface mb-4">Select data to share:</p>
                            <div className="space-y-2">
                                {SCOPE_OPTIONS.map((opt) => {
                                    const isSelected = selectedScopes.includes(opt.value);
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => toggleScope(opt.value)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                                                isSelected
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-transparent bg-surface-container-low hover:bg-surface-container'
                                            }`}
                                        >
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${opt.color}`}>
                                                <span className="material-symbols-outlined text-lg">{opt.icon}</span>
                                            </div>
                                            <span className="font-semibold text-sm text-on-surface flex-1">{opt.label}</span>
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                                                isSelected ? 'bg-primary border-primary' : 'border-outline-variant'
                                            }`}>
                                                {isSelected && (
                                                    <span className="material-symbols-outlined text-white text-xs">check</span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {error && (
                                <div className="mt-4 p-3 bg-error-container rounded-xl text-on-error-container text-sm font-semibold flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">error</span>
                                    {error}
                                </div>
                            )}
                        </div>

                        {/* Generate Button */}
                        <div className="p-6 pt-0">
                            <button
                                onClick={handleGenerate}
                                disabled={loading || selectedScopes.length === 0}
                                className="w-full py-4 primary-gradient text-white font-bold rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                            >
                                {loading ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-lg">qr_code</span>
                                        Generate Passport QR
                                    </>
                                )}
                            </button>
                            <p className="text-[11px] text-tertiary text-center mt-3">
                                QR expires in 5 minutes • One-time use only
                            </p>
                        </div>
                    </>
                ) : (
                    /* QR Display */
                    <div className="p-6 flex flex-col items-center">
                        <div className="bg-white p-4 rounded-2xl shadow-inner border border-surface-container mb-4">
                            <img
                                src={qrData.qrImage}
                                alt="Patient Passport QR Code"
                                className="w-56 h-56"
                            />
                        </div>

                        {/* Countdown */}
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm mb-4 ${
                            countdown > 60 ? 'bg-secondary/10 text-secondary' : countdown > 10 ? 'bg-amber-100 text-amber-700' : 'bg-error-container text-error'
                        }`}>
                            <span className="material-symbols-outlined text-sm">timer</span>
                            Expires in {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                        </div>

                        <p className="text-xs text-tertiary text-center mb-4">
                            Scan this QR code to view a secure, read-only patient summary.<br />
                            <span className="font-bold">This link can only be used once.</span>
                        </p>

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/passport/${qrData.token}`);
                                }}
                                className="flex-1 py-3 bg-surface-container-high text-on-surface font-bold text-sm rounded-xl hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-1"
                            >
                                <span className="material-symbols-outlined text-sm">content_copy</span>
                                Copy Link
                            </button>
                            <button
                                onClick={() => { setQrData(null); }}
                                className="flex-1 py-3 bg-surface-container-high text-on-surface font-bold text-sm rounded-xl hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-1"
                            >
                                <span className="material-symbols-outlined text-sm">refresh</span>
                                New QR
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
