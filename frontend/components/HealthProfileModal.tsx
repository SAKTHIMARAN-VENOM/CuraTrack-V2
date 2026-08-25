'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { offlineStorage } from '@/lib/offline-storage';
import { useI18n } from '@/lib/i18n';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDER_OPTIONS = [
  { value: 'Female', labelKey: 'gender.female', label: 'Female', icon: 'female' },
  { value: 'Male', labelKey: 'gender.male', label: 'Male', icon: 'male' },
  { value: 'Other', labelKey: 'gender.other', label: 'Other / Non-Binary', icon: 'transgender' },
  { value: 'Prefer not to say', labelKey: 'gender.preferNot', label: 'Prefer not to say', icon: 'lock' },
];

export function HealthProfileModal() {
  const { t } = useI18n();
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

      const activeBlood = profile?.blood_group || savedUser?.blood_group || offlineProf?.blood_group || '';
      const activeGender = profile?.gender || savedUser?.gender || offlineProf?.gender || '';
      const activeAge = profile?.age || savedUser?.age || offlineProf?.age || '';
      const activePhone = profile?.phone || savedUser?.phone || offlineProf?.phone || '';
      const activeName = profile?.name || user?.user_metadata?.full_name || savedUser?.name || offlineProf?.name || 'Patient';

      setUserName(activeName);
      setBloodGroup(activeBlood);
      setGender(activeGender);
      setAge(activeAge ? String(activeAge) : '');
      setPhone(activePhone || '');

      const isDismissed = sessionStorage.getItem('curatrack_health_modal_dismissed');

      if (!activeBlood || !activeGender) {
        setIsNewUserSetup(true);
        if (!isDismissed) {
          setIsOpen(true);
        } else {
          setIsBannerVisible(true);
        }
      } else {
        setIsBannerVisible(false);
      }
    } catch (err) {
      console.warn('HealthProfileModal profile check error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkProfileCompleteness();

    const handleCustomOpen = (e: any) => {
      if (e.detail) {
        if (e.detail.blood_group) setBloodGroup(e.detail.blood_group);
        if (e.detail.gender) setGender(e.detail.gender);
        if (e.detail.age) setAge(String(e.detail.age));
        if (e.detail.phone) setPhone(e.detail.phone);
        if (e.detail.name) setUserName(e.detail.name);
      }
      setIsNewUserSetup(false);
      setIsOpen(true);
    };

    window.addEventListener('open-health-profile-modal', handleCustomOpen);
    return () => {
      window.removeEventListener('open-health-profile-modal', handleCustomOpen);
    };
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('curatrack_health_modal_dismissed', 'true');
    setIsOpen(false);
    if (!bloodGroup || !gender) {
      setIsBannerVisible(true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bloodGroup || !gender) {
      setErrorMsg(t('healthModal.requiredError', 'Please select both Blood Group and Gender before continuing.'));
      return;
    }

    try {
      setSaving(true);
      setErrorMsg('');

      const updatePayload: Record<string, any> = {
        blood_group: bloodGroup,
        gender: gender,
      };
      if (age && !isNaN(Number(age))) {
        updatePayload.age = Number(age);
      }
      if (phone) {
        updatePayload.phone = phone;
      }

      if (userId) {
        try {
          const supabase = createClient();
          await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', userId);
        } catch (supaErr) {
          console.warn('Supabase profile direct update warn:', supaErr);
        }
      }

      try {
        await fetch('/api/profile/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });
      } catch (apiErr) {
        console.warn('Backend profile update route fallback warn:', apiErr);
      }

      const mergedUserPayload = {
        id: userId,
        name: userName,
        blood_group: bloodGroup,
        gender: gender,
        age: age ? Number(age) : undefined,
        phone: phone,
      };

      try {
        const rawAuth = localStorage.getItem('curatrack_auth_user');
        if (rawAuth) {
          const authUser = JSON.parse(rawAuth);
          Object.assign(mergedUserPayload, {
            ...authUser,
            blood_group: bloodGroup,
            gender: gender,
            age: age ? Number(age) : authUser.age,
            phone: phone || authUser.phone,
          });
        }
        localStorage.setItem('curatrack_auth_user', JSON.stringify(mergedUserPayload));
        offlineStorage.saveProfile(mergedUserPayload);
        document.cookie = `curatrack_auth=${encodeURIComponent(JSON.stringify(mergedUserPayload))}; path=/; max-age=604800; SameSite=Lax`;
      } catch (cacheErr) {
        console.warn('Cache write warning:', cacheErr);
      }

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
      setErrorMsg(err.message || t('healthModal.saveError', 'Unable to save profile. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {isBannerVisible && !isOpen && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-6 py-2.5 shadow-md flex items-center justify-between text-xs font-bold z-30 relative animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-base animate-pulse">health_and_safety</span>
            <span>
              {t('healthModal.actionRequired', 'Action Required: Please configure your Blood Group and Gender for accurate emergency medical triage & prescriptions.')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOpen(true)}
              className="px-3.5 py-1 bg-white text-amber-700 hover:bg-white/90 rounded-full font-black text-[11px] shadow-sm transition-all cursor-pointer"
            >
              {t('healthModal.setUpNow', 'Set Up Now')}
            </button>
            <button
              onClick={() => setIsBannerVisible(false)}
              className="text-white/80 hover:text-white"
              title={t('common.close', 'Dismiss banner')}
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="bg-white dark:bg-surface rounded-3xl max-w-xl w-full p-8 shadow-2xl border border-surface-container-high relative overflow-hidden font-body text-on-surface animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start justify-between mb-6 relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-400 flex items-center justify-center text-white shadow-lg shadow-red-500/20 shrink-0">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>vital_signs</span>
                </div>
                <div>
                  <h3 className="text-xl font-headline font-black text-on-surface tracking-tight">
                    {isNewUserSetup ? t('healthModal.newTitle', 'Complete Your Health Profile') : t('healthModal.editTitle', 'Edit Health & Vitals Identity')}
                  </h3>
                  <p className="text-xs text-tertiary font-medium mt-0.5">
                    {isNewUserSetup
                      ? t('healthModal.newSubtitle', 'Welcome to CuraTrack! Please select your blood group & gender for emergency triage.')
                      : t('healthModal.editSubtitle', 'Update your clinical demographics and emergency identification data.')}
                  </p>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="p-2 rounded-xl text-tertiary hover:text-on-surface hover:bg-surface-container-high transition-colors"
                title={t('common.close', 'Close')}
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {errorMsg && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-900 text-xs font-bold flex items-center gap-2.5">
                <span className="material-symbols-outlined text-red-600 text-base">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="mb-5 p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-teal-900 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
                <span className="material-symbols-outlined text-teal-600 text-base">check_circle</span>
                <span>{t('healthModal.savedSuccess', 'Health profile successfully saved!')}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6 relative z-10">
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-red-600">bloodtype</span>
                    {t('healthModal.selectBlood', 'Select Blood Group')}
                  </label>
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{t('common.required', 'REQUIRED')}</span>
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

              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-primary">wc</span>
                    {t('healthModal.selectGender', 'Select Gender')}
                  </label>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{t('common.required', 'REQUIRED')}</span>
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
                        <span>{t(opt.labelKey, opt.label)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-surface-container-high">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider">{t('healthModal.ageYears', 'Age (Years)')}</label>
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
                  <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider">{t('healthModal.emergencyPhone', 'Emergency Contact Phone')}</label>
                  <input
                    type="text"
                    placeholder="+91 98201 44521"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-5 py-3 rounded-2xl text-xs font-bold text-tertiary hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  {t('healthModal.remindLater', 'Remind Me Later')}
                </button>

                <button
                  type="submit"
                  disabled={saving || !bloodGroup || !gender}
                  className="px-7 py-3 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-2xl shadow-md shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                      <span>{t('healthModal.savingProfile', 'Saving Profile...')}</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">save</span>
                      <span>{t('healthModal.saveComplete', 'Save & Complete Profile')}</span>
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
