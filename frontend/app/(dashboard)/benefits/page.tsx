'use client';
import { useState } from 'react';
import { API_BASE, apiFetch } from '@/lib/api';

export default function BenefitsPage() {
    const [selectedService, setSelectedService] = useState('consultation');
    const [insuranceId, setInsuranceId] = useState('');
    const [checkingEligibility, setCheckingEligibility] = useState(false);
    const [eligibilityResult, setEligibilityResult] = useState<any>(null);
    const [schemes, setSchemes] = useState<any[]>([]);
    const [loadingSchemes, setLoadingSchemes] = useState(false);
    const [submittingClaim, setSubmittingClaim] = useState<string | null>(null);
    const [govSchemes, setGovSchemes] = useState<any[]>([]);
    const [loadingGovSchemes, setLoadingGovSchemes] = useState(false);
    const [activeTab, setActiveTab] = useState("all");

    const fetchSchemes = async () => {
        setLoadingSchemes(true);
        try {
            const res = await fetch(`${API_BASE}/api/patient/PAT-123/insurance-schemes`, {
                method: 'POST'
            });
            const data = await res.json();
            setSchemes(data.availableSchemes || []);
        } catch (err) {
            console.error("Failed to fetch schemes", err);
        } finally {
            setLoadingSchemes(false);
        }
    };

    const fetchGovSchemes = async () => {
        setLoadingGovSchemes(true);
        try {
            const res = await fetch(`${API_BASE}/api/government-schemes/eligibility`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientId: 'PAT-123' })
            });
            const data = await res.json();
            setGovSchemes(data.eligibleSchemes || []);
        } catch (err) {
            console.error('Failed to fetch government schemes', err);
        } finally {
            setLoadingGovSchemes(false);
        }
    };

    const handleCheckEligibility = async () => {
        if (!insuranceId.trim()) {
            setEligibilityResult({ error: "Please enter an Insurance ID." });
            return;
        }

        setCheckingEligibility(true);
        setEligibilityResult(null);
        setSchemes([]);
        setGovSchemes([]);
        try {
            const res = await fetch(`${API_BASE}/api/insurance/eligibility`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientId: "PAT-123",
                    insuranceId: insuranceId,
                    service: selectedService
                })
            });
            const data = await res.json();
            
            if (!res.ok || data.status === "error") {
                setEligibilityResult({ error: data.detail || data.message || "Invalid Insurance ID." });
            } else {
                setEligibilityResult(data);
                // Trigger AI schemes if NOT fully covered
                if (data.coverageLevel !== "full") {
                    await Promise.all([fetchSchemes(), fetchGovSchemes()]);
                }
            }
        } catch (err) {
            setEligibilityResult({ error: "Network error occurred connecting to backend." });
        } finally {
            setCheckingEligibility(false);
        }
    };

    const handleClaim = async (scheme: any) => {
        setSubmittingClaim(scheme.id);
        try {
            const res = await fetch(`${API_BASE}/api/patient/PAT-123/claims`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schemeName: scheme.name,
                    recommendationReason: scheme.reason
                })
            });
            const data = await res.json();
            alert(`✅ ${data.message || 'Claim initiated successfully!'}`);
        } catch (err) {
            alert("❌ Failed to auto-fill claim. Please try again.");
        } finally {
            setSubmittingClaim(null);
        }
    };

    const bestScheme = schemes.length > 0 ? schemes.reduce((prev, current) => (prev.match_percentage > current.match_percentage) ? prev : current) : null;
    const bestGovScheme = govSchemes.length > 0 ? govSchemes[0] : null;

    return (
        <div className="p-8 max-w-7xl mx-auto w-full">
            {/* Page Title & Greeting */}
            <section className="mb-12">
                <h1 className="text-4xl font-extrabold tracking-tight text-on-surface mb-2">Benefits &amp; Schemes</h1>
                <p className="text-tertiary text-lg max-w-2xl">Maximize your coverage with AI-matched healthcare schemes and seamless insurance claim processing.</p>
            </section>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-12 gap-8">
                {/* Main Schemes Column */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    {/* Eligibility Checker */}
                    <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm border border-surface-container-high relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold mb-4">Check Insurance Eligibility</h3>
                            <p className="text-on-surface-variant text-sm mb-6">Verify your coverage before requesting schemes or proceeding with services.</p>
                            
                            <div className="flex flex-col md:flex-row gap-4 mb-4">
                                <select 
                                    className="px-4 py-3 rounded-xl border border-surface-container-high bg-white focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-1/3 text-on-surface"
                                    value={selectedService}
                                    onChange={(e) => setSelectedService(e.target.value)}
                                    disabled={checkingEligibility}
                                >
                                    <option value="consultation">Consultation</option>
                                    <option value="lab_test">Lab Test</option>
                                    <option value="surgery">Surgery</option>
                                </select>
                                <input 
                                    type="text"
                                    placeholder="Enter Insurance ID (e.g., INS-123)" 
                                    className="px-4 py-3 rounded-xl border border-surface-container-high bg-white focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-1/2 text-on-surface"
                                    value={insuranceId}
                                    onChange={(e) => setInsuranceId(e.target.value)}
                                    disabled={checkingEligibility}
                                />
                                <button 
                                    className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-opacity-90 transition-all disabled:opacity-50 min-w-[150px]"
                                    onClick={handleCheckEligibility}
                                    disabled={checkingEligibility || !insuranceId}
                                >
                                    {checkingEligibility ? "Checking..." : "Verify"}
                                </button>
                            </div>

                            {/* Eligibility Result Display */}
                            {eligibilityResult && (
                                <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {eligibilityResult.error ? (
                                        <div className="rounded-xl border border-error-container bg-error-container text-on-error-container p-4 flex items-start gap-4">
                                            <span className="material-symbols-outlined mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                                            <div>
                                                <h4 className="font-bold">Checking Failed</h4>
                                                <p className="text-sm mt-1">{eligibilityResult.error}</p>
                                            </div>
                                        </div>
                                    ) : eligibilityResult.coverageLevel === 'full' ? (
                                        <div className="rounded-xl border border-secondary bg-secondary-container text-secondary p-4 flex items-start gap-4">
                                            <span className="material-symbols-outlined mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                            <div>
                                                <h4 className="font-bold">Fully Covered</h4>
                                                <p className="text-sm mt-1">{eligibilityResult.message}</p>
                                                {eligibilityResult.details && (
                                                    <div className="mt-2 text-sm space-y-1 font-semibold">
                                                        <p>💰 Insurance Pays: ₹{eligibilityResult.details.insurancePays}</p>
                                                        <p>🧾 You Pay: ₹{eligibilityResult.details.youPay}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : eligibilityResult.coverageLevel === 'partial' ? (
                                        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="text-amber-600 text-lg">⚠️</div>
                                                <div>
                                                    <p className="font-semibold text-amber-800">Partially Covered</p>
                                                    <p className="text-sm text-amber-700 mt-1">{eligibilityResult.message}</p>
                                                    {eligibilityResult.details && (
                                                        <div className="mt-2 text-sm text-amber-800 space-y-1">
                                                            <p>💰 Insurance Pays: ₹{eligibilityResult.details.insurancePays}</p>
                                                            <p>🧾 You Pay: ₹{eligibilityResult.details.youPay}</p>
                                                        </div>
                                                    )}
                                                    {eligibilityResult.suggestion && (
                                                        <p className="text-sm mt-2 font-bold text-amber-900 bg-amber-200/50 p-2 rounded-lg border border-amber-300/50 inline-block">💡 {eligibilityResult.suggestion}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-error bg-error-container text-on-error-container p-4 flex items-start gap-4">
                                            <span className="material-symbols-outlined mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                                            <div>
                                                <h4 className="font-bold">Not Covered</h4>
                                                <p className="text-sm mt-1">{eligibilityResult.message}</p>
                                                {eligibilityResult.suggestion && (
                                                    <p className="text-sm mt-2 font-semibold opacity-90">{eligibilityResult.suggestion}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Recommendations Banner (Only show if we have an AI matched scheme) */}
                    {bestScheme && (
                        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary-container p-8 text-white shadow-xl animate-in slide-in-from-bottom-4">
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="max-w-md">
                                    <span className="bg-white/20 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur-md">
                                        Best AI Match ({bestScheme.match_percentage}%)
                                    </span>
                                    <h3 className="text-2xl font-bold mt-4 mb-2">Recommended: {bestScheme.name}</h3>
                                    <p className="text-primary-fixed/80 font-medium text-white/80">{bestScheme.reason}</p>
                                </div>
                                <button 
                                    className="px-8 py-4 bg-white text-primary font-bold rounded-2xl hover:bg-opacity-90 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                    onClick={() => handleClaim(bestScheme)}
                                    disabled={submittingClaim === bestScheme.id}
                                >
                                    {submittingClaim === bestScheme.id ? "Processing..." : "Select & Auto-fill Claim"}
                                </button>
                            </div>
                            <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                            <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                        </div>
                    )}

                    {/* Filter Tabs */}
                    <div className="flex gap-4 p-1 bg-surface-container-low rounded-2xl w-fit">
                        <button 
                            onClick={() => setActiveTab("all")}
                            className={`px-6 py-2.5 rounded-xl transition-all font-bold ${activeTab === "all" ? "bg-white shadow-sm text-primary" : "text-tertiary hover:text-primary"}`}
                        >
                            All Schemes
                        </button>
                        <button 
                            onClick={() => setActiveTab("insurance")}
                            className={`px-6 py-2.5 rounded-xl transition-all font-bold ${activeTab === "insurance" ? "bg-white shadow-sm text-primary" : "text-tertiary hover:text-primary"}`}
                        >
                            Insurance
                        </button>
                        <button 
                            onClick={() => setActiveTab("government")}
                            className={`px-6 py-2.5 rounded-xl transition-all font-bold ${activeTab === "government" ? "bg-white shadow-sm text-primary" : "text-tertiary hover:text-primary"}`}
                        >
                            Government
                        </button>
                    </div>

                    {/* Schemes Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {loadingSchemes && (
                            <div className="col-span-full py-12 flex justify-center items-center">
                                <div className="text-tertiary flex gap-3 items-center font-bold">
                                    <span className="material-symbols-outlined animate-spin">sync</span>
                                    AI is analyzing the best schemes for you...
                                </div>
                            </div>
                        )}
                        
                        {!loadingSchemes && schemes.length === 0 && !eligibilityResult && (
                            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-surface-container-high rounded-[2rem] text-tertiary bg-surface-container-lowest/50">
                                <span className="material-symbols-outlined text-4xl mb-4 opacity-50">health_and_safety</span>
                                <p className="font-semibold text-lg max-w-sm">Check your eligibility above to see AI recommended schemes and alternatives.</p>
                            </div>
                        )}

                        {!loadingSchemes && schemes.filter(scheme => {
                            if (activeTab === "all") return true;
                            if (activeTab === "insurance") return scheme.type === "insurance";
                            if (activeTab === "government") return scheme.type === "government";
                            return false;
                        }).map((scheme, idx) => (
                            <div key={scheme.id} className="bg-surface-container-lowest p-6 rounded-[2rem] hover:shadow-md transition-shadow group shadow-sm border border-surface-container-high relative overflow-hidden animate-in fade-in zoom-in" style={{ animationDelay: `${idx * 100}ms` }}>
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`w-14 h-14 flex items-center justify-center rounded-2xl ${scheme.type === 'government' ? 'bg-secondary-container text-secondary' : 'bg-tertiary-container text-tertiary'}`}>
                                        <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                            {scheme.type === 'government' ? 'account_balance' : 'health_and_safety'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {bestScheme?.id === scheme.id && (
                                            <span className="px-3 py-1 bg-error-container/80 text-on-error-container text-[10px] font-bold uppercase rounded-full">Top Match</span>
                                        )}
                                        <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full border ${scheme.type === 'government' ? 'border-secondary/30 text-secondary' : 'border-tertiary/30 text-tertiary'}`}>
                                            {scheme.type}
                                        </span>
                                    </div>
                                </div>
                                <h4 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{scheme.name}</h4>
                                <p className="text-on-surface-variant text-sm mb-6 leading-relaxed bg-surface-container-low p-3 rounded-xl border border-surface-container-high"><span className="font-bold block mb-1">Why you qualify:</span>{scheme.reason}</p>
                                <div className="flex items-center justify-between pt-4 border-t border-surface-container-low">
                                    <span className="text-primary font-black text-sm">{scheme.amount}</span>
                                    <button 
                                        className="flex items-center gap-2 text-primary font-bold text-sm hover:underline disabled:opacity-50"
                                        onClick={() => handleClaim(scheme)}
                                        disabled={submittingClaim === scheme.id}
                                    >
                                        {submittingClaim === scheme.id ? 'Filing...' : 'Auto-fill Claim'}
                                        {submittingClaim !== scheme.id && <span className="material-symbols-outlined text-sm">edit_note</span>}
                                    </button>
                                </div>
                                {bestScheme?.id === scheme.id && (
                                     <div className="absolute inset-0 border-2 border-primary/20 rounded-[2rem] pointer-events-none"></div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Government Schemes Section */}
                    {(loadingGovSchemes || govSchemes.length > 0 || (eligibilityResult && !eligibilityResult.error && eligibilityResult.coverageLevel !== 'full' && govSchemes.length === 0 && !loadingGovSchemes)) && (activeTab === "all" || activeTab === "government") && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
                                <h3 className="text-xl font-bold">Government Schemes Available</h3>
                            </div>

                            {loadingGovSchemes && (
                                <div className="py-10 flex justify-center items-center bg-surface-container-lowest rounded-[2rem] border border-surface-container-high">
                                    <div className="text-tertiary flex gap-3 items-center font-bold">
                                        <span className="material-symbols-outlined animate-spin">sync</span>
                                        Evaluating government scheme eligibility...
                                    </div>
                                </div>
                            )}

                            {!loadingGovSchemes && govSchemes.length === 0 && (
                                <div className="py-8 flex flex-col items-center justify-center text-center bg-surface-container-lowest rounded-[2rem] border border-surface-container-high text-tertiary">
                                    <span className="material-symbols-outlined text-3xl mb-3 opacity-40">search_off</span>
                                    <p className="font-semibold text-sm">No eligible government schemes found for your profile.</p>
                                </div>
                            )}

                            {!loadingGovSchemes && govSchemes.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {govSchemes.map((gs: any, idx: number) => (
                                        <div
                                            key={gs.id}
                                            className={`bg-surface-container-lowest p-6 rounded-[2rem] hover:shadow-md transition-shadow group shadow-sm border relative overflow-hidden ${
                                                bestGovScheme?.id === gs.id
                                                    ? 'border-secondary ring-2 ring-secondary/20'
                                                    : 'border-surface-container-high'
                                            }`}
                                            style={{ animationDelay: `${idx * 80}ms` }}
                                        >
                                            <div className="flex justify-between items-start mb-5">
                                                <div className="w-14 h-14 bg-secondary-container flex items-center justify-center rounded-2xl text-secondary">
                                                    <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    {bestGovScheme?.id === gs.id && (
                                                        <span className="px-3 py-1 bg-secondary text-white text-[10px] font-bold uppercase rounded-full flex items-center gap-1">
                                                            <span className="text-xs">⭐</span> Best Government Option
                                                        </span>
                                                    )}
                                                    <span className="px-3 py-1 bg-secondary-container text-secondary text-[10px] font-bold uppercase rounded-full">
                                                        Government Scheme
                                                    </span>
                                                </div>
                                            </div>

                                            <h4 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">{gs.schemeName}</h4>
                                            <p className="text-xs text-tertiary font-semibold mb-3">{gs.type}</p>

                                            {/* Eligibility percentage bar */}
                                            <div className="mb-4">
                                                <div className="flex justify-between text-xs font-bold mb-1">
                                                    <span className="text-on-surface-variant">Eligibility Match</span>
                                                    <span className="text-secondary">{gs.eligibilityPercentage}%</span>
                                                </div>
                                                <div className="w-full bg-surface-container-low h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-secondary h-full rounded-full transition-all duration-500"
                                                        style={{ width: `${gs.eligibilityPercentage}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <p className="text-on-surface-variant text-sm mb-4 leading-relaxed bg-surface-container-low p-3 rounded-xl border border-surface-container-high">
                                                <span className="font-bold block mb-1">Why you qualify:</span>
                                                {gs.recommendationReason}
                                            </p>

                                            <div className="flex items-center justify-between pt-4 border-t border-surface-container-low">
                                                <div>
                                                    <p className="text-primary font-black text-sm">{gs.coverage}</p>
                                                    <p className="text-[10px] text-tertiary mt-0.5">Est. benefit: ₹{gs.estimatedBenefit?.toLocaleString('en-IN')}</p>
                                                </div>
                                                <button
                                                    className="px-5 py-2.5 bg-secondary text-white font-bold text-xs rounded-xl hover:bg-secondary/90 transition-colors disabled:opacity-50 active:scale-95"
                                                    onClick={() => handleClaim({ id: gs.id, name: gs.schemeName, reason: gs.recommendationReason })}
                                                    disabled={submittingClaim === gs.id}
                                                >
                                                    {submittingClaim === gs.id ? 'Filing...' : 'Apply Now'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column: Claim Summary & Quick Actions */}
                <div className="col-span-12 lg:col-span-4 space-y-6 lg:sticky lg:top-24">
                    <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm border border-surface-container-high">
                        <h3 className="text-lg font-bold mb-6">Claim Analytics</h3>

                        <div className="flex justify-between items-end mb-2">
                            <span className="text-tertiary text-sm font-semibold">Total Claimed</span>
                            <span className="text-2xl font-black text-on-surface">$12,450</span>
                        </div>
                        <div className="w-full bg-surface-container-low h-3 rounded-full mb-6 overflow-hidden">
                            <div className="bg-primary h-full rounded-full w-[65%]"></div>
                        </div>

                        <div className="flex justify-between text-sm mb-8 pb-8 border-b border-surface-container-low">
                            <span className="text-tertiary">Annual Limit</span>
                            <span className="font-bold text-on-surface">$50,000</span>
                        </div>

                        <h4 className="text-sm font-bold text-tertiary uppercase tracking-wider mb-4">Pending Claims</h4>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-secondary">
                                        <span className="material-symbols-outlined text-sm">dentistry</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">Dental X-Ray</p>
                                        <p className="text-[10px] text-tertiary">Submitted 2 days ago</p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-secondary bg-secondary-container/50 px-2 py-1 rounded w-fit">Processing</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
