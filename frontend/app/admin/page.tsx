'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRootRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/dashboard');
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center mx-auto animate-pulse">
                    <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
                </div>
                <p className="text-sm font-bold text-slate-700">Loading District Health Administrator Command Center...</p>
            </div>
        </div>
    );
}
