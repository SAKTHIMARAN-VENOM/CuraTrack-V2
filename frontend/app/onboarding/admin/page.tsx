'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n';

export default function AdminOnboardingPage() {
    const { t } = useI18n();
    const router = useRouter();
    const [userId, setUserId] = useState<string>('demo-admin-001');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [adminForm, setAdminForm] = useState({
        name: 'System Administrator',
        email: 'admin@curatrack.org',
        department: 'Health Informatics & Governance',
        organization: 'CuraTrack Central System',
        role: 'Super Administrator',
        emergency_contact: '+1 (555) 992-0192',
    });

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                const userEmail = user.email || 'admin@curatrack.org';
                const userName = user.user_metadata?.name || 'System Administrator';
                setAdminForm(prev => ({ ...prev, email: userEmail, name: userName }));
            }
        };
        fetchUser();
    }, []);

    const handleSubmitAdminOnboarding = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE}/api/onboarding/admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    ...adminForm,
                }),
            });

            if (!res.ok) throw new Error('Failed to save administrator profile');

            router.push('/admin');
        } catch (err: any) {
            setError(err.message || 'Submission error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface flex flex-col justify-center items-center p-4">
            <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl p-8 lg:p-10 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
                    </div>
                    <div>
                        <h1 className="font-headline font-bold text-2xl text-on-surface">Administrator Onboarding</h1>
                        <p className="text-xs text-tertiary">Configure system governance credentials for your administrative account.</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-error-container text-on-error-container p-4 rounded-2xl text-xs font-semibold">
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmitAdminOnboarding} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-tertiary mb-1">Administrator Full Name</label>
                        <input
                            type="text"
                            required
                            value={adminForm.name}
                            onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                            className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold border border-transparent focus:border-purple-600 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-tertiary mb-1">Official Email Address</label>
                        <input
                            type="email"
                            required
                            value={adminForm.email}
                            onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                            className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold border border-transparent focus:border-purple-600 outline-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-tertiary mb-1">Department</label>
                            <input
                                type="text"
                                value={adminForm.department}
                                onChange={(e) => setAdminForm({ ...adminForm, department: e.target.value })}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold border border-transparent focus:border-purple-600 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-tertiary mb-1">Organization</label>
                            <input
                                type="text"
                                value={adminForm.organization}
                                onChange={(e) => setAdminForm({ ...adminForm, organization: e.target.value })}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold border border-transparent focus:border-purple-600 outline-none"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-tertiary mb-1">Administrative Role</label>
                            <input
                                type="text"
                                value={adminForm.role}
                                onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value })}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold border border-transparent focus:border-purple-600 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-tertiary mb-1">Emergency Contact Phone</label>
                            <input
                                type="tel"
                                value={adminForm.emergency_contact}
                                onChange={(e) => setAdminForm({ ...adminForm, emergency_contact: e.target.value })}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold border border-transparent focus:border-purple-600 outline-none"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition-colors shadow-lg mt-4"
                    >
                        {loading ? 'Setting up Profile...' : 'Complete Administrator Onboarding →'}
                    </button>
                </form>
            </div>
        </div>
    );
}
