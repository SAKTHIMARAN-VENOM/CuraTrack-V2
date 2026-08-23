'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export type UserRole = 'patient' | 'doctor' | 'fhw' | 'facility_manager' | 'admin';

const PATIENT_NAV_ITEMS = [
    { href: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { href: '/triage', icon: 'medical_information', label: 'Self-Triage' },
    { href: '/telemedicine', icon: 'video_chat', label: 'Consult Doctor' },
    { href: '/records', icon: 'folder_shared', label: 'My Health Records' },
    { href: '/benefits', icon: 'account_balance_wallet', label: 'Gov Schemes & PMJAY' },
    { href: '/bluetooth/patient', icon: 'bluetooth', label: 'Offline Data (BLE)' },
    { href: '/alerts', icon: 'notifications_active', label: 'Outbreak Alerts' },
    { href: '/profile', icon: 'person', label: 'Medical ID & Passport' }
];

const DOCTOR_NAV_ITEMS = [
    { href: '/doctor', icon: 'dashboard', label: 'Doctor Clinical Queue' },
    { href: '/doctor/clinical-schedule', icon: 'calendar_month', label: 'Clinical Schedule' },
    { href: '/triage', icon: 'medical_information', label: 'Triage Assessment' },
    { href: '/referrals', icon: 'alt_route', label: 'Referral Pipeline' },
    { href: '/fhw', icon: 'volunteer_activism', label: 'Catchment & ASHA Care' },
    { href: '/facility', icon: 'local_hospital', label: 'Facility & EDL Meds' },
    { href: '/bluetooth/doctor', icon: 'bluetooth', label: 'Offline Consultation' },
    { href: '/drug-checker', icon: 'pill', label: 'Drug Interaction' },
    { href: '/records', icon: 'folder_shared', label: 'Patient Records' },
    { href: '/profile', icon: 'person', label: 'Profile' }
];

const FHW_NAV_ITEMS = [
    { href: '/fhw', icon: 'volunteer_activism', label: 'ASHA Catchment Center' },
    { href: '/triage', icon: 'medical_information', label: 'Community Triage' },
    { href: '/referrals', icon: 'alt_route', label: 'Village Referrals' },
    { href: '/telemedicine', icon: 'video_chat', label: 'Assisted Teleconsult' },
    { href: '/bluetooth/patient', icon: 'bluetooth', label: 'Offline Field Sync' },
    { href: '/alerts', icon: 'notifications_active', label: 'Outbreak Precautions' },
    { href: '/profile', icon: 'person', label: 'ASHA Profile' }
];

const FACILITY_NAV_ITEMS = [
    { href: '/facility', icon: 'local_hospital', label: 'Facility Operations' },
    { href: '/referrals', icon: 'alt_route', label: 'Inbound Referrals' },
    { href: '/doctor/clinical-schedule', icon: 'calendar_month', label: 'Doctor Roster' },
    { href: '/records', icon: 'folder_shared', label: 'Facility Archive' },
    { href: '/profile', icon: 'person', label: 'Facility In-Charge' }
];

const ADMIN_NAV_ITEMS = [
    { href: '/admin', icon: 'admin_panel_settings', label: 'District Admin Portal' },
    { href: '/facility', icon: 'local_hospital', label: 'Facility Oversight' },
    { href: '/referrals', icon: 'alt_route', label: 'Referral Audit Track' },
    { href: '/fhw', icon: 'volunteer_activism', label: 'Catchment Metrics' },
    { href: '/profile', icon: 'person', label: 'Admin Profile' }
];

export function SideNavBar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const [profile, setProfile] = useState<any>(null);
    const [currentRole, setCurrentRole] = useState<UserRole>('patient');

    useEffect(() => {
        // Check for saved demo role override
        const savedRole = localStorage.getItem('curatrack_active_role') as UserRole | null;

        async function fetchProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                if (savedRole) setCurrentRole(savedRole);
                return;
            }

            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            let detectedRole: UserRole = (savedRole || data?.role || user.user_metadata?.role || 'patient') as UserRole;

            if (!savedRole) {
                if (user.email?.toLowerCase().includes('doctor') || user.email?.toLowerCase().includes('dr.')) {
                    detectedRole = 'doctor';
                } else if (user.email?.toLowerCase().includes('asha') || user.email?.toLowerCase().includes('fhw')) {
                    detectedRole = 'fhw';
                } else if (user.email?.toLowerCase().includes('facility') || user.email?.toLowerCase().includes('pharma')) {
                    detectedRole = 'facility_manager';
                } else if (user.email?.toLowerCase().includes('admin')) {
                    detectedRole = 'admin';
                }
            }

            setCurrentRole(detectedRole);

            const displayName = data?.name || 
                                user.user_metadata?.full_name || 
                                user.user_metadata?.name || 
                                (user.email ? user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Active User');

            setProfile({
                ...data,
                name: displayName,
                role: detectedRole
            });
        }
        fetchProfile();
    }, [supabase]);

    const handleRoleSwitch = (newRole: UserRole) => {
        setCurrentRole(newRole);
        localStorage.setItem('curatrack_active_role', newRole);
        setProfile((prev: any) => ({ ...prev, role: newRole }));
    };

    const getNavItems = () => {
        switch (currentRole) {
            case 'doctor': return DOCTOR_NAV_ITEMS;
            case 'fhw': return FHW_NAV_ITEMS;
            case 'facility_manager': return FACILITY_NAV_ITEMS;
            case 'admin': return ADMIN_NAV_ITEMS;
            default: return PATIENT_NAV_ITEMS;
        }
    };

    const getRoleTitle = () => {
        switch (currentRole) {
            case 'doctor': return 'Clinical Specialist Portal';
            case 'fhw': return 'Frontline ASHA Worker';
            case 'facility_manager': return 'Facility & Pharmacy Ops';
            case 'admin': return 'District Health Administration';
            default: return 'Citizen Health Portal';
        }
    };

    const navItems = getNavItems();

    return (
        <aside className="hidden md:flex w-72 flex-col p-8 rounded-[2rem] my-4 ml-4 h-[calc(100vh-2rem)] bg-white border border-outline-variant/20 shadow-[0_8px_30px_rgb(0,0,0,0.02)] font-headline antialiased tracking-tight shrink-0 sticky top-4">
            <div className="flex flex-col gap-2 mb-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-black tracking-tighter text-primary">CuraTrack</h1>
                    <span className="text-[10px] font-black px-2 py-0.5 bg-primary/10 text-primary rounded-full uppercase">
                        {currentRole.replace('_', ' ')}
                    </span>
                </div>
                <p className="text-[10px] text-tertiary uppercase tracking-[0.15em] font-bold">
                    {getRoleTitle()}
                </p>

                {/* Role Switcher */}
                <div className="mt-1 p-2 bg-surface-container-low rounded-xl border border-surface-container">
                    <span className="text-[9px] uppercase font-bold text-tertiary block mb-1">Switch System Stakeholder</span>
                    <select
                        value={currentRole}
                        onChange={(e) => handleRoleSwitch(e.target.value as UserRole)}
                        className="w-full text-xs font-bold bg-white text-on-surface p-1.5 rounded-lg border border-surface-container-high outline-none cursor-pointer"
                    >
                        <option value="patient">👤 Patient / Citizen</option>
                        <option value="doctor">🩺 Medical Officer / Doctor</option>
                        <option value="fhw">👩‍⚕️ ASHA / ANM Frontline Worker</option>
                        <option value="facility_manager">🏥 Facility Manager / Pharmacist</option>
                        <option value="admin">🏛️ District Health Administrator</option>
                    </select>
                </div>
            </div>

            <nav className="flex flex-col gap-1.5 flex-grow overflow-y-auto pr-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={twMerge(
                                clsx(
                                    "flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all text-xs",
                                    isActive
                                        ? "bg-primary text-white font-bold shadow-md shadow-primary/20"
                                        : "hover:bg-surface-container-low text-tertiary font-medium"
                                )
                            )}
                        >
                            <span
                                className="material-symbols-outlined text-lg"
                                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                            >
                                {item.icon}
                            </span>
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto space-y-3 pt-4 border-t border-outline-variant/20">
                <button
                    onClick={async () => {
                        await fetch('/api/logout', { method: 'POST' });
                        router.push('/login');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all hover:bg-error/5 text-error font-bold text-xs"
                >
                    <span className="material-symbols-outlined text-base">logout</span>
                    <span>Logout</span>
                </button>

                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {currentRole === 'doctor' ? 'medical_services' : currentRole === 'fhw' ? 'volunteer_activism' : currentRole === 'facility_manager' ? 'local_hospital' : currentRole === 'admin' ? 'admin_panel_settings' : 'person'}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-on-surface truncate">
                            {profile?.name || 'Active Stakeholder'}
                        </p>
                        <p className="text-[9px] font-bold text-tertiary uppercase tracking-widest">
                            {currentRole.replace('_', ' ')}
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
