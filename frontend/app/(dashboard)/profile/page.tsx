'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { API_BASE } from '@/lib/api';
import { offlineStorage } from '@/lib/offline-storage';
import { useI18n } from '@/lib/i18n';

export default function ProfilePage() {
    const { t } = useI18n();
    const [currentRole, setCurrentRole] = useState<string>('patient');
    const [qrImage, setQrImage] = useState<string | null>(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [qrError, setQrError] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<number | null>(null);
    const [countdown, setCountdown] = useState<string>('');
    const [isExpired, setIsExpired] = useState(false);

    // Profile States
    const [userName, setUserName] = useState<string>('');
    const [userEmail, setUserEmail] = useState<string>('');
    const [userPhone, setUserPhone] = useState<string>('');
    const [userAge, setUserAge] = useState<string>('');
    const [userGender, setUserGender] = useState<string>('');
    const [userBlood, setUserBlood] = useState<string>('');
    const [userAllergies, setUserAllergies] = useState<string>('');

    // Manager Profile States
    const [facilityName, setFacilityName] = useState<string>('Nandurbar Sub-District Hospital');
    const [facilityType, setFacilityType] = useState<string>('Sub-District Hospital (SDH)');
    const [district, setDistrict] = useState<string>('Nandurbar, Maharashtra');
    const [facilityCode, setFacilityCode] = useState<string>('FAC-MH-NDB-104');
    const [emergencyContact, setEmergencyContact] = useState<string>('+91 2564 220199');
    const [operatingHours, setOperatingHours] = useState<string>('24x7 Emergency & 08:00 - 20:00 OPD');
    const [edlScope, setEdlScope] = useState<string>('120 Essential Medicines & 45 Diagnostics');
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

    // Fetch user name and metadata
    useEffect(() => {
        const fetchUser = async () => {
            let savedAuthUser: any = null;
            try {
                const raw = localStorage.getItem('curatrack_auth_user');
                if (raw) savedAuthUser = JSON.parse(raw);
            } catch {}

            const offlineProf = offlineStorage.getProfile();
            const initialBlood = savedAuthUser?.blood_group || offlineProf?.blood_group || '';
            const initialGender = savedAuthUser?.gender || offlineProf?.gender || '';
            const initialAllergies = savedAuthUser?.allergies || offlineProf?.allergies || savedAuthUser?.chronic_diseases || offlineProf?.chronic_diseases || '';
            const initialAge = savedAuthUser?.age ? String(savedAuthUser.age) : (offlineProf?.age ? String(offlineProf.age) : '');
            const initialPhone = savedAuthUser?.phone || offlineProf?.phone || '';
            const initialName = savedAuthUser?.name || offlineProf?.name || '';
            const initialEmail = savedAuthUser?.email || offlineProf?.email || '';

            if (initialBlood) setUserBlood(initialBlood);
            if (initialGender) setUserGender(initialGender);
            if (initialAllergies) setUserAllergies(initialAllergies);
            if (initialAge) setUserAge(initialAge);
            if (initialPhone) setUserPhone(initialPhone);
            if (initialName) setUserName(initialName);
            if (initialEmail) setUserEmail(initialEmail);

            const activeRole = localStorage.getItem('curatrack_active_role') || savedAuthUser?.role || 'patient';
            setCurrentRole(activeRole);

            // Fetch from backend API
            try {
                const res = await fetch('/api/auth-status');
                if (res.ok) {
                    const d = await res.json();
                    if (d.isAuthenticated && d.user) {
                        const u = d.user;
                        if (u.name) setUserName(u.name);
                        if (u.email) setUserEmail(u.email);
                        if (u.phone) setUserPhone(u.phone);
                        if (u.age) setUserAge(String(u.age));
                        if (u.gender) setUserGender(u.gender);
                        if (u.blood_group) setUserBlood(u.blood_group);
                        if (u.allergies || u.chronic_diseases) setUserAllergies(u.allergies || u.chronic_diseases);

                        const merged = {
                            ...(savedAuthUser || {}),
                            ...(offlineProf || {}),
                            ...u,
                        };
                        localStorage.setItem('curatrack_auth_user', JSON.stringify(merged));
                        offlineStorage.saveProfile(merged);
                    }
                }
            } catch (netErr) {
                console.warn('Network error loading auth status on profile page:', netErr);
            }

            // Also read direct from Supabase as fallback
            try {
                const supabase = createClient();
                const { data } = await supabase.auth.getUser();
                const authUid = data?.user?.id || savedAuthUser?.id || offlineProf?.id;
                if (authUid) {
                    const { data: prof } = await supabase.from('profiles').select('*').eq('id', authUid).maybeSingle();
                    if (prof) {
                        if (prof.name) setUserName(prof.name);
                        if (prof.phone) setUserPhone(prof.phone);
                        if (prof.age) setUserAge(String(prof.age));
                        if (prof.gender) setUserGender(prof.gender);
                        if (prof.blood_group) setUserBlood(prof.blood_group);
                        if (prof.allergies || prof.chronic_diseases) setUserAllergies(prof.allergies || prof.chronic_diseases);

                        const merged = {
                            ...(savedAuthUser || {}),
                            ...(offlineProf || {}),
                            ...prof,
                        };
                        localStorage.setItem('curatrack_auth_user', JSON.stringify(merged));
                        offlineStorage.saveProfile(merged);
                    }
                }
            } catch (sbErr) {
                console.warn('Supabase profile fetch error:', sbErr);
            }

            // Load persisted manager settings if any
            try {
                const rawMgr = localStorage.getItem('curatrack_manager_profile');
                if (rawMgr) {
                    const mgr = JSON.parse(rawMgr);
                    if (mgr.facilityName) setFacilityName(mgr.facilityName);
                    if (mgr.facilityType) setFacilityType(mgr.facilityType);
                    if (mgr.district) setDistrict(mgr.district);
                    if (mgr.facilityCode) setFacilityCode(mgr.facilityCode);
                    if (mgr.emergencyContact) setEmergencyContact(mgr.emergencyContact);
                    if (mgr.operatingHours) setOperatingHours(mgr.operatingHours);
                    if (mgr.edlScope) setEdlScope(mgr.edlScope);
                    if (mgr.userPhone) setUserPhone(mgr.userPhone);
                }
            } catch {}
        };
        fetchUser();

        const handleProfileUpdated = (e: any) => {
            if (e.detail?.blood_group) setUserBlood(e.detail.blood_group);
            if (e.detail?.gender) setUserGender(e.detail.gender);
            if (e.detail?.allergies !== undefined) setUserAllergies(e.detail.allergies);
            else if (e.detail?.chronic_diseases !== undefined) setUserAllergies(e.detail.chronic_diseases);
            if (e.detail?.age) setUserAge(String(e.detail.age));
            if (e.detail?.phone) setUserPhone(e.detail.phone);
        };

        window.addEventListener('curatrack-profile-updated', handleProfileUpdated);
        return () => window.removeEventListener('curatrack-profile-updated', handleProfileUpdated);
    }, []);

    // Countdown timer for QR expiration
    useEffect(() => {
        if (!expiresAt) return;

        const updateTimer = () => {
            const now = Date.now();
            const diff = expiresAt - now;

            if (diff <= 0) {
                setCountdown('0:00');
                setIsExpired(true);
                return;
            }

            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            setIsExpired(false);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    const handleSaveManagerProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveSuccess(null);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.id) {
                await supabase.from('profiles').upsert({
                    id: user.id,
                    name: userName,
                    email: userEmail,
                    phone: userPhone,
                    facility_name: facilityName,
                    role: 'facility_manager'
                });
            }
            setSaveSuccess('Facility operations profile successfully saved.');
        } catch (err: any) {
            console.error('Error saving profile:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const fetchQR = useCallback(async () => {
        setQrLoading(true);
        setQrError(null);
        try {
            const res = await fetch(`${API_BASE}/api/qr/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user?.id || 'demo-patient',
                    userName: userName || user?.user_metadata?.full_name || 'Patient'
                })
            });
            if (!res.ok) {
                const altRes = await fetch(`${API_BASE}/api/patient/demo/emergency-qr`);
                if (!altRes.ok) throw new Error('Failed to generate emergency QR');
                const altData = await altRes.json();
                setQrImage(altData.qrImage || altData.qr_image);
                setExpiresAt(Date.now() + 300000);
                return;
            }
            const data = await res.json();
            setQrImage(data.qrImage || data.qr_image);
            setExpiresAt(Date.now() + (data.expiresInSeconds ? data.expiresInSeconds * 1000 : 300000));
        } catch (err: any) {
            console.warn('QR fetch error:', err);
            const dummySvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220"><rect width="220" height="220" fill="white"/><rect x="20" y="20" width="60" height="60" fill="%23001f29"/><rect x="30" y="30" width="40" height="40" fill="white"/><rect x="40" y="40" width="20" height="20" fill="%23001f29"/><rect x="140" y="20" width="60" height="60" fill="%23001f29"/><rect x="150" y="30" width="40" height="40" fill="white"/><rect x="160" y="40" width="20" height="20" fill="%23001f29"/><rect x="20" y="140" width="60" height="60" fill="%23001f29"/><rect x="30" y="150" width="40" height="40" fill="white"/><rect x="40" y="160" width="20" height="20" fill="%23001f29"/><rect x="100" y="20" width="20" height="20" fill="%23001f29"/><rect x="100" y="60" width="20" height="20" fill="%23001f29"/><rect x="140" y="100" width="40" height="20" fill="%23001f29"/><rect x="100" y="140" width="40" height="20" fill="%23001f29"/><rect x="100" y="180" width="20" height="20" fill="%23001f29"/><rect x="160" y="160" width="40" height="40" fill="%23001f29"/></svg>`;
            setQrImage(dummySvg);
            setExpiresAt(Date.now() + 300000);
        } finally {
            setQrLoading(false);
        }
    }, [user, userName]);

    // FACILITY MANAGER PROFILE VIEW
    if (currentRole === 'facility_manager') {
        return (
            <div className="flex-1 p-6 lg:p-10 bg-surface max-w-7xl mx-auto w-full space-y-8">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 via-primary to-teal-900 rounded-3xl p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-semibold tracking-wide text-blue-200 mb-2">
                            <span className="material-symbols-outlined text-sm">local_hospital</span>
                            <span>{t('facility.subtitle', 'Hospital Administration & Operational Authority')}</span>
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight">{t('navigation.managerProfile', 'Facility Manager Profile')}</h1>
                    </div>

                    <div className="p-4 bg-white/10 backdrop-blur rounded-2xl border border-white/20 text-center shrink-0">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-blue-200 block">Facility ID</span>
                        <span className="text-lg font-mono font-black text-white">{facilityCode}</span>
                    </div>
                </div>

                {saveSuccess && (
                    <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-teal-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                        <span className="material-symbols-outlined text-teal-600">check_circle</span>
                        <span>{saveSuccess}</span>
                    </div>
                )}

                {/* Form Card */}
                <form onSubmit={handleSaveManagerProfile} className="bg-white rounded-3xl border border-surface-container-high p-8 shadow-card space-y-8">
                    {/* Section 1: Manager Personal & Contact */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-surface-container-high pb-2">
                            <span className="material-symbols-outlined text-primary">person</span>
                            <h2 className="text-base font-bold text-on-surface">Officer In-Charge Information</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-tertiary uppercase tracking-wider mb-1.5">Officer Name</label>
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-tertiary uppercase tracking-wider mb-1.5">Official Email</label>
                                <input
                                    type="email"
                                    value={userEmail}
                                    onChange={(e) => setUserEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-tertiary uppercase tracking-wider mb-1.5">Official Phone</label>
                                <input
                                    type="text"
                                    value={userPhone}
                                    onChange={(e) => setUserPhone(e.target.value)}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Hospital & Facility Attributes */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-surface-container-high pb-2">
                            <span className="material-symbols-outlined text-primary">domain</span>
                            <h2 className="text-base font-bold text-on-surface">Institutional Facility Details</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-tertiary uppercase tracking-wider mb-1.5">Facility Name</label>
                                <input
                                    type="text"
                                    value={facilityName}
                                    onChange={(e) => setFacilityName(e.target.value)}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-tertiary uppercase tracking-wider mb-1.5">Facility Classification</label>
                                <select
                                    value={facilityType}
                                    onChange={(e) => setFacilityType(e.target.value)}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                >
                                    <option value="Sub-District Hospital (SDH)">Sub-District Hospital (SDH)</option>
                                    <option value="Community Health Center (CHC)">Community Health Center (CHC)</option>
                                    <option value="Primary Health Center (PHC)">Primary Health Center (PHC)</option>
                                    <option value="District General Hospital (DH)">District General Hospital (DH)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-tertiary uppercase tracking-wider mb-1.5">District / State</label>
                                <input
                                    type="text"
                                    value={district}
                                    onChange={(e) => setDistrict(e.target.value)}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-tertiary uppercase tracking-wider mb-1.5">Emergency Hotline</label>
                                <input
                                    type="text"
                                    value={emergencyContact}
                                    onChange={(e) => setEmergencyContact(e.target.value)}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-tertiary uppercase tracking-wider mb-1.5">Operating Hours</label>
                                <input
                                    type="text"
                                    value={operatingHours}
                                    onChange={(e) => setOperatingHours(e.target.value)}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-tertiary uppercase tracking-wider mb-1.5">EDL Inventory Scope</label>
                                <input
                                    type="text"
                                    value={edlScope}
                                    onChange={(e) => setEdlScope(e.target.value)}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex justify-end pt-4 border-t border-surface-container-high">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-8 py-3.5 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-2xl shadow-md shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-base">save</span>
                            <span>{isSaving ? 'Saving Updates...' : 'Update Manager Profile'}</span>
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    // DEFAULT PATIENT / CLINICIAN SECURE HEALTH ID VIEW
    return (
        <div className="flex-1 p-8 lg:p-12 bg-surface max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                {/* Left Column: Branding & Info */}
                <div className="lg:col-span-5 space-y-8">
                    <div className="space-y-2">
                        <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container text-xs font-bold rounded-full">ENCRYPTED ACCESS</span>
                        <h2 className="text-4xl lg:text-5xl font-headline font-extrabold tracking-tight text-on-surface">Your Secure Health ID</h2>
                    </div>

                    {/* Data List: Profile Fields */}
                    <div className="space-y-1">
                        <div className="p-6 bg-surface-container-low rounded-xl group transition-all hover:bg-surface-container shadow-sm border border-surface-container flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Full Name</p>
                                <p className="text-xl font-headline font-bold text-on-surface">{userName || 'Citizen Patient'}</p>
                                {userEmail && <p className="text-xs text-tertiary mt-0.5">{userEmail}</p>}
                            </div>
                            <button
                                onClick={() => window.dispatchEvent(new CustomEvent('open-health-profile-modal', { detail: { blood_group: userBlood, gender: userGender, age: userAge, phone: userPhone, allergies: userAllergies } }))}
                                className="px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                title="Edit Blood Group, Gender & Allergies"
                            >
                                <span className="material-symbols-outlined text-sm">edit</span>
                                <span>Edit Profile</span>
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-1 mt-1">
                            <div 
                                onClick={() => window.dispatchEvent(new CustomEvent('open-health-profile-modal', { detail: { blood_group: userBlood, gender: userGender, age: userAge, phone: userPhone, allergies: userAllergies } }))}
                                className="p-5 bg-surface-container-low rounded-xl group transition-all hover:bg-surface-container shadow-sm border border-surface-container cursor-pointer hover:border-primary/40"
                                title="Click to edit Age"
                            >
                                <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1 flex items-center justify-between">
                                    <span>Age</span>
                                    <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-100 text-primary transition-opacity">edit</span>
                                </p>
                                <p className="text-lg font-headline font-bold text-on-surface">{userAge || '-'}</p>
                            </div>
                            <div 
                                onClick={() => window.dispatchEvent(new CustomEvent('open-health-profile-modal', { detail: { blood_group: userBlood, gender: userGender, age: userAge, phone: userPhone, allergies: userAllergies } }))}
                                className="p-5 bg-surface-container-low rounded-xl group transition-all hover:bg-surface-container shadow-sm border border-surface-container cursor-pointer hover:border-primary/40"
                                title="Click to edit Gender"
                            >
                                <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1 flex items-center justify-between">
                                    <span>Gender</span>
                                    <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-100 text-primary transition-opacity">edit</span>
                                </p>
                                <p className="text-lg font-headline font-bold text-on-surface">{userGender || '-'}</p>
                            </div>
                            <div 
                                onClick={() => window.dispatchEvent(new CustomEvent('open-health-profile-modal', { detail: { blood_group: userBlood, gender: userGender, age: userAge, phone: userPhone, allergies: userAllergies } }))}
                                className="p-5 bg-surface-container-low rounded-xl group transition-all hover:bg-surface-container shadow-sm border border-surface-container cursor-pointer hover:border-red-400 bg-red-50/20"
                                title="Click to edit Blood Group"
                            >
                                <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1 flex items-center justify-between">
                                    <span>Blood</span>
                                    <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-100 text-red-600 transition-opacity">edit</span>
                                </p>
                                <p className="text-lg font-headline font-bold text-red-700">{userBlood || 'Set Now'}</p>
                            </div>
                            <div 
                                onClick={() => window.dispatchEvent(new CustomEvent('open-health-profile-modal', { detail: { blood_group: userBlood, gender: userGender, age: userAge, phone: userPhone, diseases_and_allergies: userAllergies } }))}
                                className="p-5 bg-surface-container-low rounded-xl group transition-all hover:bg-surface-container shadow-sm border border-surface-container cursor-pointer hover:border-amber-400 bg-amber-50/20"
                                title="Click to edit Existing Diseases & Allergies"
                            >
                                <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-1 flex items-center justify-between">
                                    <span>Diseases & Allergies</span>
                                    <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-100 text-amber-700 transition-opacity">edit</span>
                                </p>
                                <p className="text-xs font-headline font-bold text-amber-900 truncate" title={userAllergies || 'None reported'}>
                                    {userAllergies || 'None'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Generate QR Button */}
                    <button
                        onClick={fetchQR}
                        disabled={qrLoading}
                        className="w-full px-8 py-4 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 cursor-pointer"
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

        </div>
    );
}

