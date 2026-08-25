'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export type UserRole = 'patient' | 'doctor' | 'fhw' | 'facility_manager' | 'admin';

const PATIENT_NAV_ITEMS = [
    { href: '/dashboard', icon: 'dashboard', i18nKey: 'nav.dashboard', label: 'My Health Dashboard' },
    { href: '/self-triage', icon: 'emergency', i18nKey: 'nav.selfTriage', label: 'Emergency Self-Triage' },
    { href: '/telemedicine', icon: 'video_chat', i18nKey: 'nav.telemedicine', label: 'Consult Doctor' },
    { href: '/records', icon: 'folder_shared', i18nKey: 'nav.records', label: 'My Medical Records' },
    { href: '/benefits', icon: 'account_balance_wallet', i18nKey: 'nav.benefits', label: 'Gov Schemes & Hospitals' },
    { href: '/alerts', icon: 'notifications_active', i18nKey: 'nav.alerts', label: 'Health Alerts' },
    { href: '/profile', icon: 'person', i18nKey: 'nav.profile', label: 'Medical ID & Passport' }
];

const DOCTOR_NAV_ITEMS = [
    { href: '/doctor', icon: 'dashboard', i18nKey: 'nav.doctorQueue', label: 'Clinical OPD Queue' },
    { href: '/doctor/triage', icon: 'assignment_late', i18nKey: 'nav.doctorTriage', label: 'Triage Alerts' },
    { href: '/doctor/clinical-schedule', icon: 'calendar_month', i18nKey: 'nav.doctorSchedule', label: 'Consultation Schedule' },
    { href: '/referrals', icon: 'alt_route', i18nKey: 'nav.referrals', label: 'Referral Pipeline' },
    { href: '/drug-checker', icon: 'pill', i18nKey: 'nav.drugChecker', label: 'Drug Safety' },
    { href: '/records', icon: 'folder_shared', i18nKey: 'nav.patientRecords', label: 'Patient Records' },
    { href: '/profile', icon: 'person', i18nKey: 'nav.doctorProfile', label: 'Doctor Profile' }
];

const FHW_NAV_ITEMS = [
    { href: '/fhw', icon: 'volunteer_activism', i18nKey: 'nav.fhwCatchment', label: 'ASHA Catchment Center' },
    { href: '/triage', icon: 'medical_information', i18nKey: 'nav.communityTriage', label: 'Community Triage' },
    { href: '/referrals', icon: 'alt_route', i18nKey: 'nav.villageReferrals', label: 'Village Referrals' },
    { href: '/telemedicine', icon: 'video_chat', i18nKey: 'nav.assistedTeleconsult', label: 'Assisted Teleconsult' },
    { href: '/alerts', icon: 'notifications_active', i18nKey: 'nav.outbreakAlerts', label: 'Outbreak Alerts' },
    { href: '/profile', icon: 'person', i18nKey: 'nav.ashaProfile', label: 'ASHA Profile' }
];

const FACILITY_NAV_ITEMS = [
    { href: '/facility', icon: 'local_hospital', i18nKey: 'nav.facilityOps', label: 'Facility Operations' },
    { href: '/records', icon: 'folder_shared', i18nKey: 'nav.facilityArchive', label: 'Facility Archive' },
    { href: '/profile', icon: 'person', i18nKey: 'nav.managerProfile', label: 'Manager Profile' }
];

const ADMIN_NAV_ITEMS = [
    { href: '/admin', icon: 'admin_panel_settings', i18nKey: 'nav.districtAdmin', label: 'District Admin' },
    { href: '/facility', icon: 'local_hospital', i18nKey: 'nav.facilityOversight', label: 'Facility Oversight' },
    { href: '/referrals', icon: 'alt_route', i18nKey: 'nav.referralAudit', label: 'Referral Audit Track' },
    { href: '/fhw', icon: 'volunteer_activism', i18nKey: 'nav.catchmentMetrics', label: 'Catchment Metrics' },
    { href: '/profile', icon: 'person', i18nKey: 'nav.adminProfile', label: 'Admin Profile' }
];

export function SideNavBar() {
    const pathname = usePathname();
    const router = useRouter();
    const { t } = useI18n();
    const supabase = useMemo(() => createClient(), []);
    const [profile, setProfile] = useState<any>(null);
    const [currentRole, setCurrentRole] = useState<UserRole>('patient');

    useEffect(() => {
        async function fetchProfile() {
            let user: any = null;
            try {
                const { data } = await supabase.auth.getUser();
                user = data?.user;
            } catch {}

            let savedAuthUser: any = null;
            try {
                const raw = localStorage.getItem('curatrack_auth_user');
                if (raw) savedAuthUser = JSON.parse(raw);
            } catch {}

            const savedRole = (localStorage.getItem('curatrack_active_role') || savedAuthUser?.role) as UserRole | null;

            if (!user) {
                if (savedRole) {
                    setCurrentRole(savedRole);
                    setProfile({
                        name: savedAuthUser?.name || (savedRole === 'doctor' ? 'Dr. David Ross' : savedRole === 'fhw' ? 'Sunita Tai (ASHA)' : savedRole === 'facility_manager' ? 'Anil Deshmukh (Ops)' : savedRole === 'admin' ? 'District Administrator' : 'Kavita Bai'),
                        role: savedRole
                    });
                }
                return;
            }

            let profileData: any = null;
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();
                profileData = data;
            } catch {}

            const email = (user.email || savedAuthUser?.email || '').toLowerCase();
            let role: UserRole = (profileData?.role || user.user_metadata?.role || savedRole) as UserRole;

            if (!role) {
                if (email.includes('admin')) role = 'admin';
                else if (email.includes('doctor') || email.includes('dr.')) role = 'doctor';
                else if (email.includes('asha') || email.includes('fhw') || email.includes('anm')) role = 'fhw';
                else if (email.includes('facility') || email.includes('pharma')) role = 'facility_manager';
                else role = 'patient';
            }

            setCurrentRole(role);
            localStorage.setItem('curatrack_active_role', role);

            const displayName = profileData?.name || 
                                user.user_metadata?.full_name || 
                                user.user_metadata?.name || 
                                savedAuthUser?.name ||
                                (user.email ? user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'User');

            setProfile({
                ...profileData,
                name: displayName,
                role: role
            });
        }
        fetchProfile();
    }, [supabase]);

    const getNavItems = () => {
        switch (currentRole) {
            case 'doctor': return DOCTOR_NAV_ITEMS;
            case 'fhw': return FHW_NAV_ITEMS;
            case 'facility_manager': return FACILITY_NAV_ITEMS;
            case 'admin': return ADMIN_NAV_ITEMS;
            default: return PATIENT_NAV_ITEMS;
        }
    };

    const getRoleDetails = () => {
        switch (currentRole) {
            case 'doctor':
                return { title: 'Clinical Portal', badge: 'Medical Officer', color: 'bg-teal-50 text-teal-800 border-teal-200', icon: 'stethoscope' };
            case 'fhw':
                return { title: 'ASHA Field Portal', badge: 'Frontline Worker', color: 'bg-purple-50 text-purple-800 border-purple-200', icon: 'volunteer_activism' };
            case 'facility_manager':
                return { title: 'Facility Operations', badge: 'Hospital In-Charge', color: 'bg-blue-50 text-blue-800 border-blue-200', icon: 'local_hospital' };
            case 'admin':
                return { title: 'District Health Admin', badge: 'System Administrator', color: 'bg-amber-50 text-amber-800 border-amber-200', icon: 'admin_panel_settings' };
            default:
                return { title: 'Citizen Health Care', badge: 'Patient Account', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: 'person' };
        }
    };

    const navItems = getNavItems();
    const roleMeta = getRoleDetails();

    return (
        <aside className="hidden md:flex w-72 flex-col p-6 rounded-[2rem] my-4 ml-4 h-[calc(100vh-2rem)] bg-white border border-surface-container-high shadow-card font-headline antialiased tracking-tight shrink-0 sticky top-4">
            {/* Header / Brand */}
            <div className="flex flex-col gap-1.5 mb-6">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-lg">health_and_safety</span>
                    </div>
                    <h1 className="text-xl font-black tracking-tight text-primary">CuraTrack</h1>
                </div>

                {/* Scoped Role Badge */}
                <div className={`mt-2 p-2.5 rounded-xl border flex items-center gap-2 ${roleMeta.color}`}>
                    <span className="material-symbols-outlined text-base">{roleMeta.icon}</span>
                    <div className="min-w-0">
                        <span className="text-[10px] uppercase font-black tracking-wider block leading-tight">{roleMeta.badge}</span>
                        <span className="text-[11px] font-bold block truncate">{roleMeta.title}</span>
                    </div>
                </div>
            </div>

            {/* Scoped Nav Items */}
            <nav className="flex flex-col gap-1 flex-grow overflow-y-auto pr-1">
                {navItems.map((item: any) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={twMerge(
                                clsx(
                                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-semibold",
                                    isActive
                                        ? "bg-primary text-white font-bold shadow-sm shadow-primary/20"
                                        : "hover:bg-surface-container-low text-tertiary hover:text-on-surface"
                                )
                            )}
                        >
                            <span
                                className="material-symbols-outlined text-base"
                                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                            >
                                {item.icon}
                            </span>
                            <span className="truncate">{t(item.i18nKey, item.label)}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / User Profile & Logout */}
            <div className="mt-auto space-y-3 pt-4 border-t border-surface-container-high">
                <button
                    onClick={async () => {
                        localStorage.removeItem('curatrack_active_role');
                        await fetch('/api/logout', { method: 'POST' });
                        router.push('/login');
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl transition-all hover:bg-red-50 text-red-700 font-bold text-xs cursor-pointer"
                >
                    <span className="material-symbols-outlined text-base">logout</span>
                    <span>{t('nav.logout', 'Sign Out')}</span>
                </button>

                <div className="flex items-center gap-3 bg-surface-container-low p-2.5 rounded-xl">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {roleMeta.icon}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-on-surface truncate">
                            {profile?.name || t('topNav.user', 'User')}
                        </p>
                        <p className="text-[10px] text-tertiary font-semibold capitalize truncate">
                            {currentRole.replace('_', ' ')}
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
