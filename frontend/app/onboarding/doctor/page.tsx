'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

export default function DoctorOnboardingPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string>('demo-doctor-001');
    const [activeStep, setActiveStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<'pending' | 'under_review' | 'verified' | 'rejected'>('pending');

    // Step 1: Personal Details
    const [personalDetails, setPersonalDetails] = useState({
        name: 'Dr. Sarah Jenkins',
        email: 'sarah.jenkins@hospital.org',
        phone: '+1 (555) 019-2831',
    });

    // Step 2: Professional Details
    const [profDetails, setProfDetails] = useState({
        reg_number: 'MED-00471-TX',
        qualification: 'MBBS, MD Cardiology',
        specialization: 'Cardiology',
        experience_years: 12,
        hospital_name: 'Metropolitan Health System',
        department: 'Cardiovascular Sciences',
    });

    // Step 3: Verification Documents
    const [documents, setDocuments] = useState({
        reg_cert: '',
        degree_cert: '',
        hospital_id: '',
    });

    // OCR Modal review state
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [extractedFields, setExtractedFields] = useState<any>({});

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                const docEmail = user.email || 'doctor@hospital.org';
                const docName = user.user_metadata?.name || 'Dr. Sarah Jenkins';
                setPersonalDetails(prev => ({ ...prev, email: docEmail, name: docName }));
            }
        };
        fetchUser();
    }, []);

    const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, docKey: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setScanning(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('doc_type', 'doctor_credential');

            const res = await fetch(`${API_BASE}/api/ocr/parse`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Document scan failed');

            const data = await res.json();
            setExtractedFields(data.extracted_data || {});
            setDocuments(prev => ({ ...prev, [docKey]: file.name }));
            setReviewModalOpen(true);
        } catch (err: any) {
            setError('Failed to scan document. Manual verification enabled.');
        } finally {
            setScanning(false);
        }
    };

    const confirmExtractedDoctorData = () => {
        setProfDetails(prev => ({
            ...prev,
            reg_number: extractedFields.reg_number || prev.reg_number,
            qualification: extractedFields.qualification || prev.qualification,
            hospital_name: extractedFields.hospital || prev.hospital_name,
        }));
        if (extractedFields.doctor_name) {
            setPersonalDetails(prev => ({ ...prev, name: extractedFields.doctor_name }));
        }
        setReviewModalOpen(false);
    };

    const handleSubmitDoctorOnboarding = async () => {
        setLoading(true);
        setError(null);

        try {
            const payload = {
                user_id: userId,
                personal_details: personalDetails,
                professional_details: profDetails,
                verification_documents: documents,
            };

            const res = await fetch(`${API_BASE}/api/onboarding/doctor`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Submission failed');

            setVerificationStatus('pending');
            setActiveStep(4);
        } catch (err: any) {
            setError(err.message || 'Verification submission error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface flex flex-col justify-between p-4 lg:p-8">
            {/* Header */}
            <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                        <span className="material-symbols-outlined">stethoscope</span>
                    </div>
                    <div>
                        <h1 className="font-headline font-bold text-xl text-on-surface">Doctor Verification & Onboarding</h1>
                        <p className="text-xs text-tertiary">Clinical credentialing portal for medical practitioners.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {[1, 2, 3, 4].map((stepNum) => (
                        <div
                            key={stepNum}
                            onClick={() => setActiveStep(stepNum)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all ${
                                activeStep === stepNum ? 'bg-blue-600 text-white shadow-md' : 'bg-surface-container text-tertiary'
                            }`}
                        >
                            <span>Step {stepNum}</span>
                        </div>
                    ))}
                </div>
            </header>

            {error && (
                <div className="max-w-5xl mx-auto w-full bg-error-container text-on-error-container p-4 rounded-2xl mb-4 text-sm font-semibold">
                    ⚠️ {error}
                </div>
            )}

            <main className="max-w-5xl mx-auto w-full bg-white rounded-3xl shadow-xl p-6 lg:p-10 my-4 flex-1">
                {/* STEP 1: Personal Details */}
                {activeStep === 1 && (
                    <div className="space-y-6">
                        <div>
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Step 1 of 4</span>
                            <h2 className="font-headline text-2xl font-bold text-on-surface mt-1">Practitioner Personal Details</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Full Legal Name (with title)</label>
                                <input
                                    type="text"
                                    value={personalDetails.name}
                                    onChange={(e) => setPersonalDetails({ ...personalDetails, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold border border-transparent focus:border-blue-600 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Official Medical Email</label>
                                <input
                                    type="email"
                                    value={personalDetails.email}
                                    onChange={(e) => setPersonalDetails({ ...personalDetails, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold border border-transparent focus:border-blue-600 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Contact Phone</label>
                                <input
                                    type="tel"
                                    value={personalDetails.phone}
                                    onChange={(e) => setPersonalDetails({ ...personalDetails, phone: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold border border-transparent focus:border-blue-600 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-surface-container">
                            <button onClick={() => setActiveStep(2)} className="px-6 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl">Next: Professional Details →</button>
                        </div>
                    </div>
                )}

                {/* STEP 2: Professional Details */}
                {activeStep === 2 && (
                    <div className="space-y-6">
                        <div>
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Step 2 of 4</span>
                            <h2 className="font-headline text-2xl font-bold text-on-surface mt-1">Professional & Medical Qualifications</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Medical Registration Number</label>
                                <input
                                    type="text"
                                    value={profDetails.reg_number}
                                    onChange={(e) => setProfDetails({ ...profDetails, reg_number: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold border border-transparent focus:border-blue-600 outline-none"
                                    placeholder="MED-00471-TX"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Medical Qualification</label>
                                <input
                                    type="text"
                                    value={profDetails.qualification}
                                    onChange={(e) => setProfDetails({ ...profDetails, qualification: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold border border-transparent focus:border-blue-600 outline-none"
                                    placeholder="MBBS, MD Cardiology"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Primary Specialization</label>
                                <input
                                    type="text"
                                    value={profDetails.specialization}
                                    onChange={(e) => setProfDetails({ ...profDetails, specialization: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold border border-transparent focus:border-blue-600 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Years of Clinical Experience</label>
                                <input
                                    type="number"
                                    value={profDetails.experience_years}
                                    onChange={(e) => setProfDetails({ ...profDetails, experience_years: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold border border-transparent focus:border-blue-600 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Affiliated Hospital / Practice</label>
                                <input
                                    type="text"
                                    value={profDetails.hospital_name}
                                    onChange={(e) => setProfDetails({ ...profDetails, hospital_name: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold border border-transparent focus:border-blue-600 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-tertiary mb-1">Department</label>
                                <input
                                    type="text"
                                    value={profDetails.department}
                                    onChange={(e) => setProfDetails({ ...profDetails, department: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm font-semibold border border-transparent focus:border-blue-600 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-surface-container">
                            <button onClick={() => setActiveStep(1)} className="px-5 py-2.5 text-xs font-bold text-tertiary">Back</button>
                            <button onClick={() => setActiveStep(3)} className="px-6 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl">Next: Document Upload & OCR →</button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Upload Documents */}
                {activeStep === 3 && (
                    <div className="space-y-6">
                        <div>
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Step 3 of 4</span>
                            <h2 className="font-headline text-2xl font-bold text-on-surface mt-1">Upload Verification Documents</h2>
                            <p className="text-sm text-tertiary">Upload your registration certificate or degree. OCR will extract credentials for automated review.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-5 border border-surface-container rounded-2xl text-center space-y-3 bg-surface-container-low">
                                <span className="material-symbols-outlined text-3xl text-blue-600">verified</span>
                                <h4 className="font-bold text-sm text-on-surface">Medical Registration Cert</h4>
                                <input type="file" accept="image/*,.pdf" onChange={(e) => handleDocUpload(e, 'reg_cert')} className="hidden" id="reg-cert" />
                                <label htmlFor="reg-cert" className="inline-block px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer">
                                    {documents.reg_cert ? `✓ ${documents.reg_cert.slice(0, 15)}...` : 'Upload & OCR'}
                                </label>
                            </div>

                            <div className="p-5 border border-surface-container rounded-2xl text-center space-y-3 bg-surface-container-low">
                                <span className="material-symbols-outlined text-3xl text-blue-600">school</span>
                                <h4 className="font-bold text-sm text-on-surface">Degree Certificate</h4>
                                <input type="file" accept="image/*,.pdf" onChange={(e) => handleDocUpload(e, 'degree_cert')} className="hidden" id="degree-cert" />
                                <label htmlFor="degree-cert" className="inline-block px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer">
                                    {documents.degree_cert ? `✓ ${documents.degree_cert.slice(0, 15)}...` : 'Upload & OCR'}
                                </label>
                            </div>

                            <div className="p-5 border border-surface-container rounded-2xl text-center space-y-3 bg-surface-container-low">
                                <span className="material-symbols-outlined text-3xl text-blue-600">badge</span>
                                <h4 className="font-bold text-sm text-on-surface">Hospital / Institutional ID</h4>
                                <input type="file" accept="image/*,.pdf" onChange={(e) => handleDocUpload(e, 'hospital_id')} className="hidden" id="hosp-id" />
                                <label htmlFor="hosp-id" className="inline-block px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer">
                                    {documents.hospital_id ? `✓ ${documents.hospital_id.slice(0, 15)}...` : 'Upload & OCR'}
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-surface-container">
                            <button onClick={() => setActiveStep(2)} className="px-5 py-2.5 text-xs font-bold text-tertiary">Back</button>
                            <button onClick={handleSubmitDoctorOnboarding} disabled={loading} className="px-8 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg">
                                {loading ? 'Submitting Application...' : 'Submit Verification Application'}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 4: Verification Status */}
                {activeStep === 4 && (
                    <div className="text-center py-10 space-y-6 max-w-lg mx-auto">
                        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 flex items-center justify-center text-amber-600 animate-pulse">
                            <span className="material-symbols-outlined text-4xl">pending_actions</span>
                        </div>
                        <div>
                            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase tracking-widest">Status: Pending Verification</span>
                            <h2 className="font-headline text-3xl font-bold text-on-surface mt-3">Application Under Review</h2>
                            <p className="text-sm text-tertiary mt-2">
                                Your medical registration and credentials have been submitted to the CuraTrack Administrator team.
                            </p>
                        </div>

                        <div className="bg-surface-container-low p-4 rounded-2xl text-left text-xs space-y-2 text-tertiary border border-surface-container">
                            <p className="font-bold text-on-surface text-sm">🔒 Restricted Clinical Access Notice</p>
                            <p>Until your medical registration is verified by an administrator, the following clinical features are restricted:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Scanning Patient Passport QR Codes</li>
                                <li>Accessing Full Electronic Health Records</li>
                                <li>Issuing Certified E-Prescriptions</li>
                            </ul>
                        </div>

                        <button onClick={() => router.push('/doctor')} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl text-sm">
                            Go to Doctor Portal (Restricted Mode)
                        </button>
                    </div>
                )}
            </main>

            {/* OCR Review Modal */}
            {reviewModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
                        <h3 className="font-headline font-bold text-lg text-on-surface">Extracted Credential Details</h3>
                        <div className="bg-surface-container-low p-4 rounded-xl text-xs space-y-2 max-h-48 overflow-y-auto">
                            {Object.entries(extractedFields).map(([k, v]) => (
                                <div key={k}>
                                    <span className="font-bold text-tertiary uppercase">{k.replace('_', ' ')}:</span>
                                    <input
                                        type="text"
                                        value={String(v)}
                                        onChange={(e) => setExtractedFields({ ...extractedFields, [k]: e.target.value })}
                                        className="w-full mt-1 px-3 py-1.5 bg-white rounded border border-surface-container font-semibold"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setReviewModalOpen(false)} className="px-4 py-2 text-xs font-bold text-tertiary">Cancel</button>
                            <button onClick={confirmExtractedDoctorData} className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl">Confirm & Apply</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
