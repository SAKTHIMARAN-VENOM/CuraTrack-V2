'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { offlineStorage } from '@/lib/offline-storage';
import { useI18n } from '@/lib/i18n';
import { getCachedUser } from '@/lib/auth-cache';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDER_OPTIONS = [
  { value: 'Female', labelKey: 'gender.female', label: 'Female', icon: 'female' },
  { value: 'Male', labelKey: 'gender.male', label: 'Male', icon: 'male' },
  { value: 'Other', labelKey: 'gender.other', label: 'Other / Non-Binary', icon: 'transgender' },
  { value: 'Prefer not to say', labelKey: 'gender.preferNot', label: 'Prefer not to say', icon: 'lock' },
];

const COMMON_DISEASES_AND_ALLERGIES = [
  { value: 'None', label: 'None', icon: 'verified_user', isNone: true },
  { value: 'Diabetes', label: 'Diabetes', icon: 'water_drop' },
  { value: 'Hypertension', label: 'Hypertension (BP)', icon: 'favorite' },
  { value: 'Asthma', label: 'Asthma / Respiratory', icon: 'air' },
  { value: 'Heart Disease', label: 'Heart Disease', icon: 'cardiology' },
  { value: 'Kidney Disease', label: 'Kidney Disease', icon: 'science' },
  { value: 'Thyroid', label: 'Thyroid', icon: 'vital_signs' },
  { value: 'Penicillin Allergy', label: 'Penicillin Allergy', icon: 'medication' },
  { value: 'Sulfa Drug Allergy', label: 'Sulfa Drug Allergy', icon: 'prescriptions' },
  { value: 'Food / Nut Allergy', label: 'Food / Nut Allergy', icon: 'nutrition' },
  { value: 'Dust / Pollen Allergy', label: 'Dust / Pollen Allergy', icon: 'eco' },
];

export function HealthProfileModal() {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [diseasesAndAllergies, setDiseasesAndAllergies] = useState<string>('');
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [customCondition, setCustomCondition] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isNewUserSetup, setIsNewUserSetup] = useState(false);

  const parseConditions = (condStr: string) => {
    if (!condStr) {
      setSelectedChips([]);
      setCustomCondition('');
      return;
    }
    if (condStr.trim().toLowerCase() === 'none' || condStr.trim().toLowerCase() === 'healthy') {
      setSelectedChips(['None']);
      setCustomCondition('');
      return;
    }
    const parts = condStr.split(',').map(s => s.trim()).filter(Boolean);
    const matchedChips: string[] = [];
    const unmatchedParts: string[] = [];

    parts.forEach(p => {
      const matched = COMMON_DISEASES_AND_ALLERGIES.find(c => c.value.toLowerCase() === p.toLowerCase() || c.label.toLowerCase() === p.toLowerCase());
      if (matched) {
        matchedChips.push(matched.value);
      } else {
        unmatchedParts.push(p);
      }
    });

    setSelectedChips(matchedChips);
    setCustomCondition(unmatchedParts.join(', '));
  };

  const handleToggleChip = (val: string) => {
    if (val === 'None') {
      if (selectedChips.includes('None')) {
        setSelectedChips([]);
        setDiseasesAndAllergies(customCondition.trim());
      } else {
        setSelectedChips(['None']);
        setCustomCondition('');
        setDiseasesAndAllergies('None');
      }
      return;
    }

    let updatedChips = selectedChips.filter(c => c !== 'None');
    if (updatedChips.includes(val)) {
      updatedChips = updatedChips.filter(c => c !== val);
    } else {
      updatedChips.push(val);
    }

    setSelectedChips(updatedChips);
    const parts = [...updatedChips, ...(customCondition.trim() ? [customCondition.trim()] : [])];
    setDiseasesAndAllergies(parts.join(', '));
  };

  const handleCustomConditionChange = (text: string) => {
    setCustomCondition(text);
    let activeChips = selectedChips.filter(c => c !== 'None');
    if (text.trim() && selectedChips.includes('None')) {
      setSelectedChips([]);
      activeChips = [];
    }
    const parts = [...activeChips, ...(text.trim() ? [text.trim()] : [])];
    setDiseasesAndAllergies(parts.join(', '));
  };

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
      } catch { }

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
      const activeConditions = profile?.allergies || profile?.chronic_diseases || savedUser?.allergies || savedUser?.chronic_diseases || offlineProf?.allergies || offlineProf?.chronic_diseases || '';
      const activeAge = profile?.age || savedUser?.age || offlineProf?.age || '';
      const activePhone = profile?.phone || savedUser?.phone || offlineProf?.phone || '';
      const activeName = profile?.name || user?.user_metadata?.full_name || savedUser?.name || offlineProf?.name || 'Patient';

      setUserName(activeName);
      setBloodGroup(activeBlood);
      setGender(activeGender);
      setDiseasesAndAllergies(activeConditions);
      parseConditions(activeConditions);
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
        const incomingConditions = e.detail.diseases_and_allergies || e.detail.allergies || e.detail.chronic_diseases || '';
        if (incomingConditions !== undefined) {
          setDiseasesAndAllergies(incomingConditions);
          parseConditions(incomingConditions);
        }
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
        allergies: diseasesAndAllergies,
        chronic_diseases: diseasesAndAllergies,
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
        allergies: diseasesAndAllergies,
        chronic_diseases: diseasesAndAllergies,
        diseases_and_allergies: diseasesAndAllergies,
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
            allergies: diseasesAndAllergies,
            chronic_diseases: diseasesAndAllergies,
            diseases_and_allergies: diseasesAndAllergies,
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
              {t('healthModal.actionRequired', 'Action Required: Please configure your Blood Group, Gender & Existing Diseases & Allergies for accurate emergency triage & safe prescriptions.')}
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
            className="bg-white dark:bg-surface rounded-3xl max-w-lg w-full max-h-[88vh] overflow-y-auto overflow-x-hidden p-6 sm:p-7 shadow-2xl border border-surface-container-high relative font-body text-on-surface animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start justify-between mb-5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-400 flex items-center justify-center text-white shadow-lg shadow-red-500/20 shrink-0">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>vital_signs</span>
                </div>
                <div>
                  <h3 className="text-lg font-headline font-black text-on-surface tracking-tight">
                    {isNewUserSetup ? t('healthModal.newTitle', 'Complete Your Health Profile') : t('healthModal.editTitle', 'Edit Health & Vitals Identity')}
                  </h3>
                  <p className="text-xs text-tertiary font-medium mt-0.5">
                    {isNewUserSetup
                      ? t('healthModal.newSubtitle', 'Welcome to CuraTrack! Please select your blood group, gender & existing diseases & allergies for emergency triage.')
                      : t('healthModal.editSubtitle', 'Update your clinical demographics, existing diseases & allergies, and emergency identification data.')}
                  </p>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-xl text-tertiary hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                title={t('common.close', 'Close')}
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-900 text-xs font-bold flex items-center gap-2.5">
                <span className="material-symbols-outlined text-red-600 text-base">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-2xl text-teal-900 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
                <span className="material-symbols-outlined text-teal-600 text-base">check_circle</span>
                <span>{t('healthModal.savedSuccess', 'Health profile successfully saved!')}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5 relative z-10">
              {/* Blood Group */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-red-600">bloodtype</span>
                    {t('healthModal.selectBlood', 'Select Blood Group')}
                  </label>
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{t('common.required', 'REQUIRED')}</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                  {BLOOD_GROUPS.map((bg) => {
                    const isSelected = bloodGroup === bg;
                    return (
                      <button
                        type="button"
                        key={bg}
                        onClick={() => setBloodGroup(bg)}
                        className={`py-2.5 rounded-xl font-headline font-black text-xs transition-all flex flex-col items-center justify-center cursor-pointer border ${isSelected
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

              {/* Gender */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-primary">wc</span>
                    {t('healthModal.selectGender', 'Select Gender')}
                  </label>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{t('common.required', 'REQUIRED')}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GENDER_OPTIONS.map((opt) => {
                    const isSelected = gender.toLowerCase() === opt.value.toLowerCase();
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setGender(opt.value)}
                        className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${isSelected
                          ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.02]'
                          : 'bg-surface-container-low text-on-surface border-surface-container-high hover:border-primary/40 hover:bg-primary/5'
                          }`}
                      >
                        <span className="material-symbols-outlined text-sm">{opt.icon}</span>
                        <span className="truncate">{t(opt.labelKey, opt.label)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Existing Diseases & Allergies */}
              <div className="space-y-2 pt-2 border-t border-surface-container-high">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="block text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-amber-600">medical_services</span>
                      {t('healthModal.existingDiseasesAllergies', 'Existing Diseases & Allergies')}
                    </label>
                    <p className="text-[11px] text-tertiary mt-0.5">
                      {t('healthModal.existingDiseasesAllergiesSubtitle', 'Select any conditions or allergies you have or enter them below (Optional)')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {COMMON_DISEASES_AND_ALLERGIES.map((item) => {
                    const isSelected = selectedChips.includes(item.value);
                    return (
                      <button
                        type="button"
                        key={item.value}
                        onClick={() => handleToggleChip(item.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${isSelected
                          ? item.isNone
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-surface-container-low text-on-surface border-surface-container-high hover:border-amber-300 hover:bg-amber-50/40'
                          }`}
                      >
                        <span className="material-symbols-outlined text-xs">{item.icon}</span>
                        <span>{item.label}</span>
                        {isSelected && (
                          <span className="material-symbols-outlined text-xs">check</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-1.5">
                  <input
                    type="text"
                    placeholder={t('healthModal.otherDiseasesAllergiesPlaceholder', 'Or type other diseases / allergies (e.g. Diabetes, Penicillin, Asthma)...')}
                    value={customCondition}
                    onChange={(e) => handleCustomConditionChange(e.target.value)}
                    className="w-full px-3.5 py-2 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-amber-500 placeholder:text-tertiary/60"
                  />
                </div>
              </div>

              {/* Age & Emergency Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-surface-container-high">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider">{t('healthModal.ageYears', 'Age (Years)')}</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    placeholder="e.g. 28"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3.5 py-2 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider">{t('healthModal.emergencyPhone', 'Emergency Contact Phone')}</label>
                  <input
                    type="text"
                    placeholder="+91 98201 44521"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-surface-container-low rounded-xl text-xs font-bold text-on-surface border border-surface-container-high outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-tertiary hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  {t('healthModal.remindLater', 'Remind Me Later')}
                </button>

                <button
                  type="submit"
                  disabled={saving || !bloodGroup || !gender}
                  className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl shadow-md shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
