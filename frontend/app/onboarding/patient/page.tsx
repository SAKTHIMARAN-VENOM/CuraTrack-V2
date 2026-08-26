'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n';

export default function PatientOnboardingPage() {
    const { t } = useI18n();
    const router = useRouter();
    const [userId, setUserId] = useState<string>('demo-patient-001');
    const [activeStep, setActiveStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Section status tracking
    const [stepStatuses, setStepStatuses] = useState<Record<number, 'Completed' | 'Incomplete' | 'Skipped'>>({
        1: 'Incomplete',
        2: 'Incomplete',
        3: 'Incomplete',
        4: 'Incomplete',
        5: 'Incomplete',
    });

    // Step 1: Personal Info
    const [personalMode, setPersonalMode] = useState<'manual' | 'scan'>('manual');
    const [personalInfo, setPersonalInfo] = useState({
        name: '',
        dob: '',
        gender: 'Male',
        address: '',
    });

    // Step 2: Medical Info
    const [medicalMode, setMedicalMode] = useState<'manual' | 'scan'>('manual');
    const [medicalInfo, setMedicalInfo] = useState({
        blood_group: '',
        allergies: '',
        chronic_diseases: '',
        current_medications: '',
    });

    // Step 3: Insurance
    const [insuranceMode, setInsuranceMode] = useState<'manual' | 'scan'>('manual');
    const [insuranceInfo, setInsuranceInfo] = useState({
        provider: '',
        policy_number: '',
        expiry: '',
        coverage: '',
    });

    // Step 4: Emergency Contact
    const [emergencyContact, setEmergencyContact] = useState({
        name: '',
        relationship: 'Spouse',
        phone: '',
    });

    // Step 5: Government Schemes
    const [govtSchemes, setGovtSchemes] = useState({
        occupation: 'Private Service',
        annual_income_range: '₹2,50,000 – ₹5,00,000',
        state: 'Tamil Nadu',
        family_size: '4',
    });

    // OCR Modal review state
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [scannedDocType, setScannedDocType] = useState<string>('');
    const [rawOcrText, setRawOcrText] = useState<string>('');
    const [extractedFields, setExtractedFields] = useState<any>({});

    const [existingDataFound, setExistingDataFound] = useState<boolean>(false);

    useEffect(() => {
        const fetchUserAndProfile = async () => {
            const supabase = createClient();
            let currentUserId = 'demo-patient-001';

            // Check Supabase session
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    currentUserId = user.id;
                    setUserId(user.id);
                    if (user.user_metadata?.name || user.user_metadata?.full_name) {
                        setPersonalInfo(prev => ({ ...prev, name: user.user_metadata.name || user.user_metadata.full_name }));
                    }
                }
            } catch {}

            // Check localStorage
            try {
                const rawAuth = localStorage.getItem('curatrack_auth_user');
                if (rawAuth) {
                    const parsed = JSON.parse(rawAuth);
                    if (parsed.id) {
                        currentUserId = parsed.id;
                        setUserId(parsed.id);
                    }
                    if (parsed.name) {
                        setPersonalInfo(prev => ({ ...prev, name: prev.name || parsed.name }));
                    }
                    if (parsed.blood_group || parsed.bloodType) {
                        setMedicalInfo(prev => ({ ...prev, blood_group: parsed.blood_group || parsed.bloodType }));
                    }
                    if (parsed.allergies) {
                        setMedicalInfo(prev => ({ ...prev, allergies: Array.isArray(parsed.allergies) ? parsed.allergies.join(', ') : parsed.allergies }));
                    }
                }
            } catch {}

            // Query existing profile in Supabase
            if (currentUserId) {
                try {
                    const { data: prof } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', currentUserId)
                        .maybeSingle();

                    if (prof) {
                        setExistingDataFound(true);
                        setPersonalInfo(prev => ({
                            name: prof.name || prev.name,
                            dob: prof.dob || (prof.age ? String(prof.age) : prev.dob),
                            gender: prof.gender || prev.gender,
                            address: prev.address
                        }));
                        setMedicalInfo(prev => ({
                            blood_group: prof.blood_group || prev.blood_group,
                            allergies: Array.isArray(prof.allergies) ? prof.allergies.join(', ') : (prof.allergies || prev.allergies),
                            chronic_diseases: Array.isArray(prof.chronic_diseases) ? prof.chronic_diseases.join(', ') : (prof.chronic_diseases || prev.chronic_diseases),
                            current_medications: prev.current_medications
                        }));
                    }

                    const { data: patProf } = await supabase
                        .from('patient_profile')
                        .select('*')
                        .eq('patient_id', currentUserId)
                        .maybeSingle();

                    if (patProf) {
                        setExistingDataFound(true);
                        if (patProf.address) setPersonalInfo(prev => ({ ...prev, address: patProf.address }));
                        if (patProf.emergency_contact) {
                            setEmergencyContact(prev => ({
                                name: patProf.emergency_contact.name || prev.name,
                                relationship: patProf.emergency_contact.relationship || prev.relationship,
                                phone: patProf.emergency_contact.phone || prev.phone
                            }));
                        }
                        if (patProf.state) setGovtSchemes(prev => ({ ...prev, state: patProf.state }));
                        if (patProf.occupation) setGovtSchemes(prev => ({ ...prev, occupation: patProf.occupation }));
                        if (patProf.income_band) setGovtSchemes(prev => ({ ...prev, annual_income_range: patProf.income_band }));
                    }
                } catch (e) {
                    console.warn('Profile hydration failed:', e);
                }
            }
        };
        fetchUserAndProfile();
    }, []);

    const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setScanning(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('doc_type', docType);

            const res = await fetch(`${API_BASE}/api/ocr/parse`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                throw new Error('OCR parsing failed');
            }

            const data = await res.json();
            setScannedDocType(docType);
            setRawOcrText(data.raw_text || '');
            setExtractedFields(data.extracted_data || {});
            setReviewModalOpen(true);
        } catch (err: any) {
            setError('Failed to scan document. Please try manual entry.');
        } finally {
            setScanning(false);
        }
    };

    const confirmExtractedData = () => {
        if (scannedDocType === 'govt_id') {
            setPersonalInfo({
                name: extractedFields.name || personalInfo.name,
                dob: extractedFields.dob || personalInfo.dob,
                gender: extractedFields.gender || personalInfo.gender,
                address: extractedFields.address || personalInfo.address,
            });
            setStepStatuses(prev => ({ ...prev, 1: 'Completed' }));
        } else if (scannedDocType === 'medical_report') {
            setMedicalInfo({
                blood_group: extractedFields.blood_group || medicalInfo.blood_group,
                allergies: Array.isArray(extractedFields.allergies) ? extractedFields.allergies.join(', ') : (extractedFields.allergies || medicalInfo.allergies),
                chronic_diseases: Array.isArray(extractedFields.chronic_diseases) ? extractedFields.chronic_diseases.join(', ') : (extractedFields.chronic_diseases || medicalInfo.chronic_diseases),
                current_medications: Array.isArray(extractedFields.current_medications) 
                    ? extractedFields.current_medications.map((m: any) => `${m.name} ${m.dosage}`).join(', ') 
                    : (extractedFields.current_medications || medicalInfo.current_medications),
            });
            setStepStatuses(prev => ({ ...prev, 2: 'Completed' }));
        } else if (scannedDocType === 'insurance_card') {
            setInsuranceInfo({
                provider: extractedFields.provider || insuranceInfo.provider,
                policy_number: extractedFields.policy_number || insuranceInfo.policy_number,
                expiry: extractedFields.expiry || insuranceInfo.expiry,
                coverage: extractedFields.coverage || insuranceInfo.coverage,
            });
            setStepStatuses(prev => ({ ...prev, 3: 'Completed' }));
        }
        setReviewModalOpen(false);
    };

    const handleSaveStep = (stepNumber: number, isSkip = false) => {
        setStepStatuses(prev => ({
            ...prev,
            [stepNumber]: isSkip ? 'Skipped' : 'Completed',
        }));
        if (stepNumber < 5) {
            setActiveStep(stepNumber + 1);
        }
    };

    const handleSubmitOnboarding = async () => {
        setLoading(true);
        setError(null);

        try {
            const payload = {
                user_id: userId,
                personal_info: personalInfo,
                medical_info: medicalInfo,
                insurance_info: insuranceInfo,
                emergency_contact: emergencyContact,
                government_schemes: govtSchemes,
            };

            // Update local auth user storage
            try {
                const currentRaw = localStorage.getItem('curatrack_auth_user');
                const currentUser = currentRaw ? JSON.parse(currentRaw) : {};
                const updatedUser = {
                    ...currentUser,
                    id: userId,
                    name: personalInfo.name || currentUser.name || 'Citizen Patient',
                    dob: personalInfo.dob,
                    age: personalInfo.dob || currentUser.age,
                    gender: personalInfo.gender,
                    blood_group: medicalInfo.blood_group,
                    allergies: medicalInfo.allergies,
                    chronic_diseases: medicalInfo.chronic_diseases,
                    emergency_contact: emergencyContact,
                    address: personalInfo.address,
                    role: 'patient',
                    profile_completed: true,
                };
                localStorage.setItem('curatrack_auth_user', JSON.stringify(updatedUser));
            } catch {}

            // Direct Supabase sync if client available
            try {
                const supabase = createClient();
                await supabase.from('profiles').upsert({
                    id: userId,
                    name: personalInfo.name,
                    role: 'patient',
                    gender: personalInfo.gender,
                    blood_group: medicalInfo.blood_group,
                    allergies: medicalInfo.allergies,
                    chronic_diseases: medicalInfo.chronic_diseases,
                    profile_completed: true,
                });
            } catch (e) {
                console.warn('Direct Supabase profile upsert skipped:', e);
            }

            const res = await fetch(`${API_BASE}/api/onboarding/patient`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                console.warn('Backend onboarding API returned non-200, continuing with local profile');
            }

            sessionStorage.removeItem('curatrack_new_patient_signup');
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Submission error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface flex flex-col justify-between p-4 lg:p-8">
            {/* Header */}
            <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl primary-gradient flex items-center justify-center text-white">
                        <span className="material-symbols-outlined">health_and_safety</span>
                    </div>
                    <div>
                        <h1 className="font-headline font-bold text-xl text-on-surface">Patient First-Time Onboarding</h1>
                        <p className="text-xs text-tertiary">Set up your medical profile once to access seamless care.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((stepNum) => (
                        <div
                            key={stepNum}
                            onClick={() => setActiveStep(stepNum)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all ${
                                activeStep === stepNum
                                    ? 'bg-primary text-white shadow-md'
                                    : stepStatuses[stepNum] === 'Completed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : stepStatuses[stepNum] === 'Skipped'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-surface-container text-tertiary'
                            }`}
                        >
                            <span>Step {stepNum}</span>
                            {stepStatuses[stepNum] === 'Completed' && <span className="material-symbols-outlined text-sm">check_circle</span>}
                        </div>
                    ))}
                </div>
            </header>

            {/* Error banner */}
            {error && (
                <div className="max-w-5xl mx-auto w-full bg-error-container text-on-error-container p-4 rounded-2xl mb-4 flex items-center justify-between text-sm font-semibold">
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError(null)} className="text-xs underline">Dismiss</button>
                </div>
            )}

            {/* Existing data connected banner */}
            {existingDataFound && (
                <div className="max-w-5xl mx-auto w-full bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl mb-3 flex items-center gap-3 text-xs font-bold shadow-xs animate-in fade-in">
                    <span className="material-symbols-outlined text-emerald-600 text-base">verified_user</span>
                    <span>Existing patient profile data detected and connected! Please verify or update your personal details and allergies below.</span>
                </div>
            )}

            {/* Main Step Card */}
            <main className="max-w-5xl mx-auto w-full bg-white rounded-3xl shadow-xl p-6 lg:p-10 my-4 flex-1">
                {/* STEP 1: Personal Information */}
                {activeStep === 1 && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-xs font-bold text-primary uppercase tracking-widest">Step 1 of 5</span>
                                <h2 className="font-headline text-2xl font-bold text-on-surface mt-1">Personal Information</h2>
                                <p className="text-sm text-tertiary">Choose your preferred entry method: manual entry or government ID document scan.</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                stepStatuses[1] === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-container text-tertiary'
                            }`}>
                                Status: {stepStatuses[1]}
                            </span>
                        </div>

                        {/* Hybrid mode selector */}
                        <div className="flex gap-4 p-1.5 bg-surface-container-low rounded-2xl w-fit">
                            <button
                                onClick={() => setPersonalMode('manual')}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                    personalMode === 'manual' ? 'bg-primary text-white shadow-sm' : 'text-tertiary hover:bg-surface-container'
                                }`}
                            >
                                <span className="material-symbols-outlined text-base">edit</span> ✍ Fill Manually
                            </button>
                            <button
                                onClick={() => setPersonalMode('scan')}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                    personalMode === 'scan' ? 'bg-primary text-white shadow-sm' : 'text-tertiary hover:bg-surface-container'
                                }`}
                            >
                                <span className="material-symbols-outlined text-base">photo_camera</span> 📷 Scan Aadhaar / Govt ID
                            </button>
                        </div>

                        {personalMode === 'scan' && (
                            <div className="border-2 border-dashed border-primary/30 rounded-2xl p-8 text-center bg-primary-container/10 space-y-3">
                                <span className="material-symbols-outlined text-4xl text-primary animate-bounce">document_scanner</span>
                                <h3 className="font-bold text-on-surface">Upload Govt ID / Aadhaar Card</h3>
                                <p className="text-xs text-tertiary max-w-md mx-auto">OCR will extract Name, Date of Birth, Gender, and Address for your review.</p>
                                <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={(e) => handleDocumentUpload(e, 'govt_id')}
                                    className="hidden"
                                    id="govt-id-input"
                                />
                                <label htmlFor="govt-id-input" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-primary/90 transition-colors">
                                    {scanning ? 'Scanning Document...' : 'Select Document Image / PDF'}
                                </label>
                            </div>
                        )}

                        {/* Input form */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={personalInfo.name}
                                    onChange={(e) => setPersonalInfo({ ...personalInfo, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold text-on-surface border border-transparent focus:border-primary focus:bg-white transition-all outline-none"
                                    placeholder="Jane Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Date of Birth</label>
                                <input
                                    type="date"
                                    value={personalInfo.dob}
                                    onChange={(e) => setPersonalInfo({ ...personalInfo, dob: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold text-on-surface border border-transparent focus:border-primary focus:bg-white transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Gender</label>
                                <select
                                    value={personalInfo.gender}
                                    onChange={(e) => setPersonalInfo({ ...personalInfo, gender: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold text-on-surface border border-transparent focus:border-primary focus:bg-white transition-all outline-none"
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Residential Address</label>
                                <input
                                    type="text"
                                    value={personalInfo.address}
                                    onChange={(e) => setPersonalInfo({ ...personalInfo, address: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold text-on-surface border border-transparent focus:border-primary focus:bg-white transition-all outline-none"
                                    placeholder="123 Health St, Metro District"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-surface-container">
                            <button onClick={() => handleSaveStep(1, true)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-tertiary hover:bg-surface-container">Skip Section</button>
                            <button onClick={() => handleSaveStep(1, false)} className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90">Save & Continue →</button>
                        </div>
                    </div>
                )}

                {/* STEP 2: Medical Information */}
                {activeStep === 2 && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-xs font-bold text-primary uppercase tracking-widest">Step 2 of 5</span>
                                <h2 className="font-headline text-2xl font-bold text-on-surface mt-1">Medical Information</h2>
                                <p className="text-sm text-tertiary">Enter details manually or upload a prescription/medical report for automated extraction.</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                stepStatuses[2] === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-container text-tertiary'
                            }`}>
                                Status: {stepStatuses[2]}
                            </span>
                        </div>

                        <div className="flex gap-4 p-1.5 bg-surface-container-low rounded-2xl w-fit">
                            <button
                                onClick={() => setMedicalMode('manual')}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                    medicalMode === 'manual' ? 'bg-primary text-white shadow-sm' : 'text-tertiary hover:bg-surface-container'
                                }`}
                            >
                                <span className="material-symbols-outlined text-base">edit</span> ✍ Manual
                            </button>
                            <button
                                onClick={() => setMedicalMode('scan')}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                    medicalMode === 'scan' ? 'bg-primary text-white shadow-sm' : 'text-tertiary hover:bg-surface-container'
                                }`}
                            >
                                <span className="material-symbols-outlined text-base">description</span> 📄 Upload Prescription / Report
                            </button>
                        </div>

                        {medicalMode === 'scan' && (
                            <div className="border-2 border-dashed border-primary/30 rounded-2xl p-8 text-center bg-primary-container/10 space-y-3">
                                <span className="material-symbols-outlined text-4xl text-primary animate-bounce">upload_file</span>
                                <h3 className="font-bold text-on-surface">Upload Prescription / Lab Report</h3>
                                <p className="text-xs text-tertiary max-w-md mx-auto">OCR extracts Blood Group, Allergies, Chronic Diseases, and Active Medications.</p>
                                <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={(e) => handleDocumentUpload(e, 'medical_report')}
                                    className="hidden"
                                    id="medical-report-input"
                                />
                                <label htmlFor="medical-report-input" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-primary/90 transition-colors">
                                    {scanning ? 'Analyzing Document...' : 'Select Prescription / Report'}
                                </label>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Blood Group</label>
                                <select
                                    value={medicalInfo.blood_group}
                                    onChange={(e) => setMedicalInfo({ ...medicalInfo, blood_group: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold text-on-surface border border-transparent focus:border-primary focus:bg-white transition-all outline-none"
                                >
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Known Allergies</label>
                                <input
                                    type="text"
                                    value={medicalInfo.allergies}
                                    onChange={(e) => setMedicalInfo({ ...medicalInfo, allergies: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold text-on-surface border border-transparent focus:border-primary focus:bg-white transition-all outline-none"
                                    placeholder="Penicillin, Peanuts, Latex"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Chronic Diseases / Conditions</label>
                                <input
                                    type="text"
                                    value={medicalInfo.chronic_diseases}
                                    onChange={(e) => setMedicalInfo({ ...medicalInfo, chronic_diseases: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold text-on-surface border border-transparent focus:border-primary focus:bg-white transition-all outline-none"
                                    placeholder="Hypertension, Asthma"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Current Medications</label>
                                <input
                                    type="text"
                                    value={medicalInfo.current_medications}
                                    onChange={(e) => setMedicalInfo({ ...medicalInfo, current_medications: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold text-on-surface border border-transparent focus:border-primary focus:bg-white transition-all outline-none"
                                    placeholder="Lisinopril 10mg daily"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-surface-container">
                            <button onClick={() => handleSaveStep(2, true)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-tertiary hover:bg-surface-container">Skip Section</button>
                            <button onClick={() => handleSaveStep(2, false)} className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90">Save & Continue →</button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Insurance */}
                {activeStep === 3 && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-xs font-bold text-primary uppercase tracking-widest">Step 3 of 5</span>
                                <h2 className="font-headline text-2xl font-bold text-on-surface mt-1">Health Insurance</h2>
                                <p className="text-sm text-tertiary">Provide insurance policy details manually or scan your health card.</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                stepStatuses[3] === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-container text-tertiary'
                            }`}>
                                Status: {stepStatuses[3]}
                            </span>
                        </div>

                        <div className="flex gap-4 p-1.5 bg-surface-container-low rounded-2xl w-fit">
                            <button
                                onClick={() => setInsuranceMode('manual')}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                    insuranceMode === 'manual' ? 'bg-primary text-white shadow-sm' : 'text-tertiary hover:bg-surface-container'
                                }`}
                            >
                                <span className="material-symbols-outlined text-base">edit</span> ✍ Manual
                            </button>
                            <button
                                onClick={() => setInsuranceMode('scan')}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                    insuranceMode === 'scan' ? 'bg-primary text-white shadow-sm' : 'text-tertiary hover:bg-surface-container'
                                }`}
                            >
                                <span className="material-symbols-outlined text-base">badge</span> 📷 Scan Insurance Card
                            </button>
                        </div>

                        {insuranceMode === 'scan' && (
                            <div className="border-2 border-dashed border-primary/30 rounded-2xl p-8 text-center bg-primary-container/10 space-y-3">
                                <span className="material-symbols-outlined text-4xl text-primary animate-bounce">credit_card</span>
                                <h3 className="font-bold text-on-surface">Upload Insurance Card Image</h3>
                                <p className="text-xs text-tertiary max-w-md mx-auto">OCR extracts Provider, Policy Number, Expiry Date, and Coverage Tier.</p>
                                <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={(e) => handleDocumentUpload(e, 'insurance_card')}
                                    className="hidden"
                                    id="insurance-card-input"
                                />
                                <label htmlFor="insurance-card-input" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-primary/90 transition-colors">
                                    {scanning ? 'Extracting Insurance...' : 'Select Insurance Card'}
                                </label>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Insurance Provider</label>
                                <input
                                    type="text"
                                    value={insuranceInfo.provider}
                                    onChange={(e) => setInsuranceInfo({ ...insuranceInfo, provider: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold text-on-surface border border-transparent focus:border-primary focus:bg-white transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Policy / Member ID</label>
                                <input
                                    type="text"
                                    value={insuranceInfo.policy_number}
                                    onChange={(e) => setInsuranceInfo({ ...insuranceInfo, policy_number: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold text-on-surface border border-transparent focus:border-primary focus:bg-white transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Expiration Date</label>
                                <input
                                    type="date"
                                    value={insuranceInfo.expiry}
                                    onChange={(e) => setInsuranceInfo({ ...insuranceInfo, expiry: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold text-on-surface border border-transparent focus:border-primary focus:bg-white transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Coverage Scope</label>
                                <input
                                    type="text"
                                    value={insuranceInfo.coverage}
                                    onChange={(e) => setInsuranceInfo({ ...insuranceInfo, coverage: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold text-on-surface border border-transparent focus:border-primary focus:bg-white transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-surface-container">
                            <button onClick={() => handleSaveStep(3, true)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-tertiary hover:bg-surface-container">Skip Section</button>
                            <button onClick={() => handleSaveStep(3, false)} className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90">Save & Continue →</button>
                        </div>
                    </div>
                )}

                {/* STEP 4: Emergency Contact */}
                {activeStep === 4 && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-xs font-bold text-primary uppercase tracking-widest">Step 4 of 5</span>
                                <h2 className="font-headline text-2xl font-bold text-on-surface mt-1">Emergency Contact</h2>
                                <p className="text-sm text-tertiary">Add a trusted primary emergency contact for urgent clinical access.</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                stepStatuses[4] === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-container text-tertiary'
                            }`}>
                                Status: {stepStatuses[4]}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Contact Name</label>
                                <input
                                    type="text"
                                    value={emergencyContact.name}
                                    onChange={(e) => setEmergencyContact({ ...emergencyContact, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold text-on-surface border border-transparent focus:border-primary focus:bg-white transition-all outline-none"
                                    placeholder="Robert Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Relationship</label>
                                <select
                                    value={emergencyContact.relationship}
                                    onChange={(e) => setEmergencyContact({ ...emergencyContact, relationship: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold text-on-surface border border-transparent focus:border-primary focus:bg-white transition-all outline-none"
                                >
                                    <option value="Spouse">Spouse</option>
                                    <option value="Parent">Parent</option>
                                    <option value="Child">Child</option>
                                    <option value="Sibling">Sibling</option>

                                    <option value="Friend">Friend</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    value={emergencyContact.phone}
                                    onChange={(e) => setEmergencyContact({ ...emergencyContact, phone: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold text-on-surface border border-transparent focus:border-primary focus:bg-white transition-all outline-none"
                                    placeholder="+1 (555) 019-2831"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-surface-container">
                            <button onClick={() => handleSaveStep(4, true)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-tertiary hover:bg-surface-container">Skip Section</button>
                            <button onClick={() => handleSaveStep(4, false)} className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90">Save & Continue →</button>
                        </div>
                    </div>
                )}

                {/* STEP 5: Government Schemes */}
                {activeStep === 5 && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-xs font-bold text-primary uppercase tracking-widest">Step 5 of 5</span>
                                <h2 className="font-headline text-2xl font-bold text-on-surface mt-1">Government Healthcare Schemes</h2>
                                <p className="text-sm text-tertiary">Demographic info to recommend eligible subsidies and public healthcare programs.</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                stepStatuses[5] === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-container text-tertiary'
                            }`}>
                                Status: {stepStatuses[5]}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Occupation</label>
                                <input
                                    type="text"
                                    value={govtSchemes.occupation}
                                    onChange={(e) => setGovtSchemes({ ...govtSchemes, occupation: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold text-on-surface border border-transparent focus:border-primary focus:bg-white transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Annual Income Range</label>
                                <select
                                    value={govtSchemes.annual_income_range}
                                    onChange={(e) => setGovtSchemes({ ...govtSchemes, annual_income_range: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold text-on-surface border border-transparent focus:border-primary focus:bg-white transition-all outline-none"
                                >
                                    <option value="< ₹1,00,000">&lt; ₹1,00,000</option>
                                    <option value="₹1,00,000 – ₹2,50,000">₹1,00,000 – ₹2,50,000</option>
                                    <option value="₹2,50,000 – ₹5,00,000">₹2,50,000 – ₹5,00,000</option>
                                    <option value="> ₹5,00,000">&gt; ₹5,00,000</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">State / Union Territory</label>
                                <input
                                    type="text"
                                    value={govtSchemes.state}
                                    onChange={(e) => setGovtSchemes({ ...govtSchemes, state: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold text-on-surface border border-transparent focus:border-primary focus:bg-white transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Family Members (Optional)</label>
                                <input
                                    type="number"
                                    value={govtSchemes.family_size}
                                    onChange={(e) => setGovtSchemes({ ...govtSchemes, family_size: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold text-on-surface border border-transparent focus:border-primary focus:bg-white transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-surface-container">
                            <button onClick={() => handleSaveStep(5, true)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-tertiary hover:bg-surface-container">Skip</button>
                            <button
                                onClick={handleSubmitOnboarding}
                                disabled={loading}
                                className="px-8 py-3 primary-gradient text-white text-sm font-bold rounded-xl shadow-lg hover:opacity-90 transition-opacity"
                            >
                                {loading ? 'Completing Onboarding...' : '✓ Finish & Go to Dashboard'}
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* OCR Extracted Review Modal */}
            {reviewModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 lg:p-8 max-w-lg w-full space-y-6 shadow-2xl animate-fade-in">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined">verified</span>
                            </div>
                            <div>
                                <h3 className="font-headline font-bold text-lg text-on-surface">Review OCR Extracted Data</h3>
                                <p className="text-xs text-tertiary">Verify and edit information before saving into your medical profile.</p>
                            </div>
                        </div>

                        <div className="bg-surface-container-low p-4 rounded-2xl max-h-60 overflow-y-auto space-y-3">
                            {Object.entries(extractedFields).map(([key, val]) => (
                                <div key={key} className="text-xs">
                                    <span className="font-bold text-tertiary uppercase tracking-wider block">{key.replace('_', ' ')}</span>
                                    <input
                                        type="text"
                                        value={typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                        onChange={(e) => setExtractedFields({ ...extractedFields, [key]: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 bg-white rounded-lg font-semibold text-on-surface border border-surface-container"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button onClick={() => setReviewModalOpen(false)} className="px-4 py-2 text-xs font-bold text-tertiary">Cancel</button>
                            <button onClick={confirmExtractedData} className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl">Confirm & Populate Form</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
