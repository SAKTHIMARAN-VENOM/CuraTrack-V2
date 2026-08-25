'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { offlineStorage } from '@/lib/offline-storage';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDER_OPTIONS = [
  { value: 'Female', label: 'Female', icon: 'female' },
  { value: 'Male', label: 'Male', icon: 'male' },
  { value: 'Other', label: 'Other / Non-Binary', icon: 'transgender' },
  { value: 'Prefer not to say', label: 'Prefer not to say', icon: 'lock' },
];

export function HealthProfileModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isNewUserSetup, setIsNewUserSetup] = useState(false);

  const checkProfileCompleteness = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      let currentUid = user?.id || '';
      let savedUser: any = null;
      try {
        const raw = localStorage.getItem('curatrack_auth_user');
        if (raw) savedUser = JSON.parse(raw);
        if (!currentUid && savedUser?.id) currentUid = savedUser.id;
      } catch {}

      const offlineProf = offlineStorage.getProfile();
      if (!currentUid && offlineProf?.id) currentUid = offlineProf.id;

      if (!currentUid) {
        setLoading(false);
        return;
      }

      setUserId(currentUid);
      let profile: any = null;

      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUid)
          .maybeSingle();
        profile = data;
      }

      const existingName = profile?.name || savedUser?.name || '';
      const existingBlood = profile?.blood_group || savedUser?.blood_group || '';
      const existingGender = profile?.gender || savedUser?.gender || '';
      const existingAge = profile?.age ? String(profile.age) : (savedUser?.age ? String(savedUser.age) : '');
      const existingPhone = profile?.phone || savedUser?.phone || '';

      setUserName(existingName);
      setBloodGroup(existingBlood);
      setGender(existingGender);
      if (existingAge) setAge(existingAge);
      if (existingPhone) setPhone(existingPhone);

      const userRole = profile?.role || savedUser?.role || localStorage.getItem('curatrack_active_role') || 'patient';

      // Auto-popup ONLY for new patient signups (triggered once, then cleared immediately)
      const isNewPatientSignup = userRole === 'patient' && (
        sessionStorage.getItem('curatrack_new_patient_signup') === 'true' ||
        localStorage.getItem('curatrack_new_patient_signup') === 'true'
      );

      if (isNewPatientSignup) {
        // Clear flag immediately so refreshing the page NEVER pops up the modal again
        sessionStorage.removeItem('curatrack_new_patient_signup');
        localStorage.removeItem('curatrack_new_patient_signup');
        setIsNewUserSetup(true);
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
      setIsBannerVisible(false);
    } catch (err) {
      console.warn('Error checking health profile completeness:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkProfileCompleteness();

    // Listen for custom trigger to open modal from any page / button
    const handleOpenModal = (event?: any) => {
      if (event?.detail) {
        if (event.detail.blood_group) setBloodGroup(event.detail.blood_group);
        if (event.detail.gender) setGender(event.detail.gender);
        if (event.detail.age) setAge(String(event.detail.age));
        if (event.detail.phone) setPhone(event.detail.phone);
      }
      setIsNewUserSetup(false);
      setErrorMsg('');
      setSaveSuccess(false);
      setIsOpen(true);
    };

    window.addEventListener('open-health-profile-modal', handleOpenModal);
    window.addEventListener('curatrack-profile-updated', checkProfileCompleteness);

    return () => {
      window.removeEventListener('open-health-profile-modal', handleOpenModal);
      window.removeEventListener('curatrack-profile-updated', checkProfileCompleteness);
    };
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('curatrack_health_modal_dismissed', 'true');
    setIsOpen(false);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!bloodGroup) {
      setErrorMsg('Please select your blood group.');
      return;
    }
    if (!gender) {
      setErrorMsg('Please select your gender.');
      return;
    }

    setSaving(true);
    try {
      // 1. Send update to API endpoint
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          blood_group: bloodGroup,
          gender: gender,
          age: age ? parseInt(age, 10) : undefined,
          phone: phone || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save health profile');
      }

      // 2. Direct Supabase update for immediate consistency
      try {
        const supabase = createClient();
        if (userId) {
          await supabase.from('profiles').upsert({
            id: userId,
            blood_group: bloodGroup,
            gender: gender,
            age: age ? parseInt(age, 10) : null,
            phone: phone || null,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (sbErr) {
        console.warn('Supabase local sync warning:', sbErr);
      }

      // 3. Update localStorage and offlineStorage caches
      const mergedUserPayload: any = {
        id: userId,
        name: userName || 'Citizen Patient',
        blood_group: bloodGroup,
        gender: gender,
        age: age ? parseInt(age, 10) : null,
        phone: phone || null,
      };

      try {
        const raw = localStorage.getItem('curatrack_auth_user');
        if (raw) {
          const authUser = JSON.parse(raw);
          Object.assign(mergedUserPayload, authUser, {
            blood_group: bloodGroup,
            gender: gender,
            age: age ? parseInt(age, 10) : authUser.age,
            phone: phone || authUser.phone,
          });
        }
        localStorage.setItem('curatrack_auth_user', JSON.stringify(mergedUserPayload));
        offlineStorage.saveProfile(mergedUserPayload);
        document.cookie = `curatrack_auth=${encodeURIComponent(JSON.stringify(mergedUserPayload))}; path=/; max-age=604800; SameSite=Lax`;
      } catch (cacheErr) {
        console.warn('Cache write warning:', cacheErr);
      }

      // Dispatch global update event
      window.dispatchEvent(new CustomEvent('curatrack-profile-updated', {
        detail: mergedUserPayload
      }));

      setSaveSuccess(true);
      setIsBannerVisible(false);
      sessionStorage.removeItem('curatrack_health_modal_dismissed');

      setTimeout(() => {
        setIsOpen(false);
        setSaveSuccess(false);
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Top Banner prompt if user has not yet configured blood group / gender */}
      {isBannerVisible && !isOpen && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-6 py-2.5 shadow-md flex items-center justify-between text-xs font-bold z-30 relative animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-base animate-pulse">health_and_safety</span>
            <span>
              Action Required: Please configure your <strong>Blood Group</strong> and <strong>Gender</strong> for accurate emergency medical triage & prescriptions.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOpen(true)}
              className="px-3.5 py-1 bg-white text-amber-700 hover:bg-white/90 rounded-full font-black text-[11px] shadow-sm transition-all cursor-pointer"
            >
              Set Up Now
            </button>
            <button
              onClick={() => setIsBannerVisible(false)}
              className="text-white/80 hover:text-white"
              title="Dismiss banner"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>
      )}

      {/* POPUP MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="bg-white dark:bg-surface rounded-3xl max-w-xl w-full p-8 shadow-2xl border border-surface-container-high relative overflow-hidden font-body text-on-surface animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Background Ambient Glow */}
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-start justify-between mb-6 relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-400 flex items-center justify-center text-white shadow-lg shadow-red-500/20 shrink-0">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>vital_signs</span>
                </div>
                <div>
                  <h3 className="text-xl font-headline font-black text-on-surface tracking-tight">
                    {isNewUserSetup ? 'Complete Your Health Profile' : 'Edit Health & Vitals Identity'}
                  </h3>
                  <p className="text-xs text-tertiary font-medium mt-0.5">
                    {isNewUserSetup
                      ? 'Welcome to CuraTrack! Please select your blood group & gender for emergency triage.'
                      : 'Update your clinical demographics and emergency identification data.'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="p-2 rounded-xl text-tertiary hover:text-on-surface hover:bg-surface-container-high transition-colors"
                title="Close"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Error / Success Feedback */}
            {errorMsg && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-900 text-xs font-bold flex items-center gap-2.5">
                <span className="material-symbols-outlined text-red-600 text-base">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="mb-5 p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-teal-900 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
                <span className="material-symbols-outlined text-teal-600 text-base">check_circle</span>
                <span>Health profile successfully saved!</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6 relative z-10">
              {/* 1. Blood Group Selection */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-red-600">bloodtype</span>
                    Select Blood Group
                  </label>
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">REQUIRED</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {BLOOD_GROUPS.map((bg) => {
                    const isSelected = bloodGroup === bg;
                    return (
                      <button
                        type="button"
                        key={bg}
                        onClick={() => setBloodGroup(bg)}
                        className={`py-3 rounded-2xl font-headline font-black text-sm transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                          isSelected
                            ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/30 scale-105'
                            : 'bg-surface-container-low text-on-surface border-surface-container-high hover:border-red-300 hover:bg-red-50/50'
                        }`}
                      >
                        <span>{bg}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Gender Selection */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-primary">wc</span>
                    Select Gender
                  </label>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">REQUIRED</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {GENDER_OPTIONS.map((opt) => {
                    const isSelected = gender.toLowerCase() === opt.value.toLowerCase();
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setGender(opt.value)}
                        className={`p-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.02]'
                            : 'bg-surface-container-low text-on-surface border-surface-container-high hover:border-primary/40 hover:bg-primary/5'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Optional Additional Demographics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-surface-container-high">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider">Age (Years)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    placeholder="e.g. 28"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider">Emergency Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98201 44521"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-5 py-3 rounded-2xl text-xs font-bold text-tertiary hover:text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  Remind Me Later
                </button>

                <button
                  type="submit"
                  disabled={saving || !bloodGroup || !gender}
                  className="px-7 py-3 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-2xl shadow-md shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">save</span>
                      <span>Save & Complete Profile</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
