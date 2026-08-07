import React, { useState } from 'react';

export function BenefitsAndSchemesScreen({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('Overview'); // 'Overview' | 'Insurance' | 'Government'
  const [insuranceId, setInsuranceId] = useState('INS-[#008080]-98273');
  const [serviceType, setServiceType] = useState('Consultation');
  const [verificationResult, setVerificationResult] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  
  // Claim modal state
  const [activeClaimModal, setActiveClaimModal] = useState(null);
  const [claimsList, setClaimsList] = useState([
    {
      id: 'CLM-98149',
      title: 'Optima Secure Comprehensive',
      status: 'Processing',
      amount: '₹10,00,000',
      time: 'Just now'
    }
  ]);

  const handleVerifyEligibility = (e) => {
    e.preventDefault();
    setVerificationResult({
      status: 'Verified',
      service: serviceType,
      coveragePercent: '100%',
      coPay: '₹0 Co-pay',
      validTill: '31 Dec 2026'
    });
  };

  const handleAutoFillClaim = (schemeName, maxCover) => {
    setActiveClaimModal({
      schemeName,
      maxCover,
      claimId: `CLM-${Math.floor(10000 + Math.random() * 90000)}`,
      patientName: 'Sarah Jenkins',
      hospital: 'City Central Health Plaza'
    });
  };

  const handleSubmitClaim = (e) => {
    e.preventDefault();
    if (!activeClaimModal) return;
    const newClaim = {
      id: activeClaimModal.claimId,
      title: activeClaimModal.schemeName,
      status: 'Processing',
      amount: activeClaimModal.maxCover,
      time: 'Just now'
    };
    setClaimsList([newClaim, ...claimsList]);
    setToastMessage(`✓ Claim ${activeClaimModal.claimId} submitted successfully for ${activeClaimModal.schemeName}!`);
    setTimeout(() => setToastMessage(''), 4500);
    setActiveClaimModal(null);
  };

  const handleDeleteClaim = (id) => {
    setClaimsList(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="flex-1 p-5 bg-[#f4f7fb] flex flex-col gap-4 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-[#008080] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300 z-50">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="ml-2 text-white/80 hover:text-white">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-[#0b1c30] tracking-tight">Benefits & Schemes</h1>
        <p className="text-xs text-[#434654] font-medium leading-relaxed">
          Maximize your coverage with AI-matched healthcare schemes and seamless insurance claim processing.
        </p>

        {/* Category Tabs Switcher */}
        <div className="flex bg-[#e5eeff] p-1 rounded-2xl border border-[#c3c6d6]/40 mt-3">
          <button
            onClick={() => setActiveTab('Overview')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'Overview' ? 'bg-[#008080] text-white shadow-sm' : 'text-[#434654]'
            }`}
          >
            Overview & Eligibility
          </button>
          <button
            onClick={() => setActiveTab('Insurance')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'Insurance' ? 'bg-[#008080] text-white shadow-sm' : 'text-[#434654]'
            }`}
          >
            Insurance (3)
          </button>
          <button
            onClick={() => setActiveTab('Government')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'Government' ? 'bg-[#008080] text-white shadow-sm' : 'text-[#434654]'
            }`}
          >
            Government (3)
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & ELIGIBILITY CHECK (Image 1) */}
      {activeTab === 'Overview' && (
        <div className="flex flex-col gap-4">
          
          {/* Check Insurance Eligibility Box */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-3">
            <div>
              <h2 className="text-base font-extrabold text-[#0b1c30]">Check Insurance Eligibility</h2>
              <p className="text-xs text-[#434654]">Verify your coverage before requesting schemes or proceeding with services.</p>
            </div>

            <form onSubmit={handleVerifyEligibility} className="flex flex-col gap-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f0f4f8] border border-slate-300 rounded-2xl text-xs font-bold text-[#0b1c30] focus:outline-none focus:border-[#008080]"
                >
                  <option value="Consultation">Consultation Visit</option>
                  <option value="Hospitalization">Hospitalization (IPD)</option>
                  <option value="Diagnostics">Diagnostics & Labs</option>
                  <option value="Emergency Care">Emergency Care SOS</option>
                </select>

                <input
                  type="text"
                  value={insuranceId}
                  onChange={(e) => setInsuranceId(e.target.value)}
                  required
                  placeholder="Enter Insurance ID (e.g., INS-123)"
                  className="w-full px-3.5 py-2.5 bg-[#f0f4f8] border border-slate-300 rounded-2xl text-xs font-semibold text-[#0b1c30] focus:outline-none focus:border-[#008080]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-[#008080] text-white font-extrabold text-xs shadow hover:bg-[#006666] active:scale-95 transition-all"
              >
                Verify Coverage
              </button>
            </form>

            {/* Verification Result Banner */}
            {verificationResult && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5 flex items-center justify-between text-xs text-emerald-900 animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-xl text-emerald-600">verified</span>
                  <div>
                    <span className="font-extrabold block">Coverage Approved: {verificationResult.coveragePercent}</span>
                    <span className="text-[10px] text-emerald-800">{verificationResult.service} • {verificationResult.coPay}</span>
                  </div>
                </div>
                <span className="bg-emerald-200 text-emerald-900 font-extrabold text-[10px] px-2.5 py-1 rounded-full">
                  ACTIVE
                </span>
              </div>
            )}
          </div>

          {/* Claim Analytics Box */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-3">
            <h3 className="font-extrabold text-sm text-[#0b1c30]">Claim Analytics</h3>

            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-500">Total Claimed</span>
              <span className="text-2xl font-extrabold text-[#0b1c30] tracking-tight">₹10,00,000</span>
            </div>

            <div className="w-full bg-[#008080] h-2.5 rounded-full overflow-hidden"></div>

            <div className="flex items-center justify-between text-xs text-slate-600 font-semibold pt-1">
              <span>Annual Limit</span>
              <span className="font-extrabold text-[#0b1c30]">₹1,00,000</span>
            </div>

            {/* Active Claims Item List */}
            <div className="mt-2 pt-3 border-t border-slate-200 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                ACTIVE CLAIMS ({claimsList.length})
              </span>

              {claimsList.map((claim) => (
                <div key={claim.id} className="bg-[#f0f4f8] p-3 rounded-2xl flex items-center justify-between border border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#008080] flex items-center justify-center">
                      <span className="material-symbols-outlined text-base">assignment_turned_in</span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-[#0b1c30]">{claim.title}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {claim.time} • <span className="font-mono">{claim.id}</span> - <span className="font-bold">{claim.amount}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                      {claim.status}
                    </span>
                    <button 
                      onClick={() => handleDeleteClaim(claim.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Cancel Claim"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended AI Matched Banner */}
          <div className="bg-gradient-to-r from-[#008080] to-[#005f73] text-white rounded-3xl p-5 shadow-md flex flex-col gap-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="bg-white/20 text-white font-extrabold text-[10px] px-3 py-1 rounded-full backdrop-blur-md uppercase tracking-wider">
                BEST AI MATCH (94%)
              </span>
            </div>

            <div>
              <h3 className="text-lg font-extrabold leading-snug">
                Recommended: Optima Secure Comprehensive Cover
              </h3>
              <p className="text-xs text-blue-100 font-medium mt-1 leading-relaxed">
                Matches your age group and active lifestyle with 2X instant restore coverage and 0 co-pay for network consultations.
              </p>
            </div>

            <button
              onClick={() => handleAutoFillClaim('Optima Secure Comprehensive Cover', '₹10,00,000')}
              className="w-full py-3 rounded-2xl bg-white text-[#008080] font-extrabold text-xs shadow hover:bg-slate-50 active:scale-95 transition-all mt-1"
            >
              Select & Auto-fill Claim
            </button>
          </div>

        </div>
      )}

      {/* TAB 2: INSURANCE PLANS (Image 2) */}
      {(activeTab === 'Overview' || activeTab === 'Insurance') && (
        <div className="flex flex-col gap-4 mt-2">
          {activeTab === 'Insurance' && (
            <div className="flex items-center gap-2">
              <span className="bg-white px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-[#008080]">
                All Insurance Plans
              </span>
            </div>
          )}

          {/* Insurance Card 1 */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-2xl bg-[#dae2ff] text-[#003d9b] flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">shield_with_heart</span>
              </div>
              <div className="flex gap-1.5">
                <span className="bg-red-100 text-red-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                  TOP MATCH
                </span>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                  INSURANCE
                </span>
              </div>
            </div>

            <h3 className="font-extrabold text-base text-[#0b1c30]">Optima Secure Comprehensive Cover</h3>

            <div className="bg-[#f0f4f8] p-3 rounded-2xl text-xs">
              <span className="font-bold text-[#0b1c30] block mb-1">Why you qualify:</span>
              <p className="text-slate-600 font-medium text-[11px] leading-relaxed">
                Matches your age group and active lifestyle with 2X instant restore coverage and 0 co-pay for network consultations.
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">COVERAGE</span>
                <span className="font-extrabold text-sm text-[#008080]">Up to ₹10,00,000</span>
              </div>

              <button
                onClick={() => handleAutoFillClaim('Optima Secure Comprehensive Cover', '₹10,00,000')}
                className="px-4 py-2.5 rounded-2xl bg-[#008080] text-white font-extrabold text-xs shadow hover:bg-[#006666] active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>Auto-fill Claim</span>
                <span className="material-symbols-outlined text-sm">edit_note</span>
              </button>
            </div>
          </div>

          {/* Insurance Card 2 */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#006c49] flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">favorite</span>
              </div>
              <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                INSURANCE
              </span>
            </div>

            <h3 className="font-extrabold text-base text-[#0b1c30]">Star Cardiac & Vital Care Shield</h3>

            <div className="bg-[#f0f4f8] p-3 rounded-2xl text-xs">
              <span className="font-bold text-[#0b1c30] block mb-1">Why you qualify:</span>
              <p className="text-slate-600 font-medium text-[11px] leading-relaxed">
                Specialized cover for cardiovascular, hypertension, and annual health checkups with cashless claims at 14,000+ empanelled hospitals.
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">COVERAGE</span>
                <span className="font-extrabold text-sm text-[#008080]">Up to ₹7,50,000</span>
              </div>

              <button
                onClick={() => handleAutoFillClaim('Star Cardiac & Vital Care Shield', '₹7,50,000')}
                className="px-4 py-2.5 rounded-2xl bg-[#008080] text-white font-extrabold text-xs shadow hover:bg-[#006666] active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>Auto-fill Claim</span>
                <span className="material-symbols-outlined text-sm">edit_note</span>
              </button>
            </div>
          </div>

          {/* Insurance Card 3 */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">health_and_safety</span>
              </div>
              <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                INSURANCE
              </span>
            </div>

            <h3 className="font-extrabold text-base text-[#0b1c30]">Health Companion Super Top-up</h3>

            <div className="bg-[#f0f4f8] p-3 rounded-2xl text-xs">
              <span className="font-bold text-[#0b1c30] block mb-1">Why you qualify:</span>
              <p className="text-slate-600 font-medium text-[11px] leading-relaxed">
                High-deductible safety net covering hospitalizations above ₹3,00,000 with zero waiting period for pre-existing vitals history.
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">COVERAGE</span>
                <span className="font-extrabold text-sm text-[#008080]">Up to ₹15,00,000</span>
              </div>

              <button
                onClick={() => handleAutoFillClaim('Health Companion Super Top-up', '₹15,00,000')}
                className="px-4 py-2.5 rounded-2xl bg-[#008080] text-white font-extrabold text-xs shadow hover:bg-[#006666] active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>Auto-fill Claim</span>
                <span className="material-symbols-outlined text-sm">edit_note</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: GOVERNMENT SCHEMES (Image 3) */}
      {(activeTab === 'Overview' || activeTab === 'Government') && (
        <div className="flex flex-col gap-4 mt-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-[#008080]">account_balance</span>
            <h2 className="text-base font-extrabold text-[#0b1c30]">Government Schemes Available</h2>
          </div>

          {/* Govt Scheme 1 */}
          <div className="bg-white rounded-3xl p-5 border-2 border-[#008080]/30 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#008080] flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">verified_user</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase">
                  ⭐ BEST GOVERNMENT OPTION
                </span>
                <span className="bg-cyan-100 text-cyan-800 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                  GOVERNMENT SCHEME
                </span>
              </div>
            </div>

            <div>
              <h3 className="font-extrabold text-base text-[#0b1c30]">NPCDCS (National Programme for NCDs)</h3>
              <span className="text-xs text-slate-500 font-semibold">Government Health Programme</span>
            </div>

            {/* Match Bar */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-bold text-[#0b1c30]">
                <span>Eligibility Match</span>
                <span className="text-[#008080]">96%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-[#008080] h-full rounded-full" style={{ width: '96%' }}></div>
              </div>
            </div>

            <div className="bg-[#f0f4f8] p-3 rounded-2xl text-xs">
              <span className="font-bold text-[#0b1c30] block mb-1">Why you qualify:</span>
              <p className="text-slate-600 font-medium text-[11px] leading-relaxed">
                Your medical records indicate: hypertension, vitals tracking. You qualify for free diagnosis, medication, and follow-up under NPCDCS at district-level health facilities.
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="max-w-[65%]">
                <span className="text-xs font-bold text-[#008080] block leading-tight">
                  Free screening, treatment & medication for chronic conditions
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">Est. benefit: ₹50,000</span>
              </div>

              <button
                onClick={() => handleAutoFillClaim('NPCDCS Government Health Programme', '₹50,000')}
                className="px-5 py-2.5 rounded-2xl bg-[#008080] text-white font-extrabold text-xs shadow hover:bg-[#006666] active:scale-95 transition-all"
              >
                Apply Now
              </button>
            </div>
          </div>

          {/* Govt Scheme 2 */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">elderly</span>
              </div>
              <span className="bg-cyan-100 text-cyan-800 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                GOVERNMENT SCHEME
              </span>
            </div>

            <div>
              <h3 className="font-extrabold text-base text-[#0b1c30]">Rashtriya Vayoshri Yojana</h3>
              <span className="text-xs text-slate-500 font-semibold">Government Subsidy</span>
            </div>

            {/* Match Bar */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-bold text-[#0b1c30]">
                <span>Eligibility Match</span>
                <span className="text-[#008080]">90%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-[#008080] h-full rounded-full" style={{ width: '90%' }}></div>
              </div>
            </div>

            <div className="bg-[#f0f4f8] p-3 rounded-2xl text-xs">
              <span className="font-bold text-[#0b1c30] block mb-1">Why you qualify:</span>
              <p className="text-slate-600 font-medium text-[11px] leading-relaxed">
                Qualify for senior citizen healthcare benefits including free assistive living devices and subsidized specialist consultations.
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="max-w-[65%]">
                <span className="text-xs font-bold text-[#008080] block leading-tight">
                  Free assistive devices + ₹1,00,000 medical cover
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">Est. benefit: ₹1,00,000</span>
              </div>

              <button
                onClick={() => handleAutoFillClaim('Rashtriya Vayoshri Yojana', '₹1,00,000')}
                className="px-5 py-2.5 rounded-2xl bg-[#008080] text-white font-extrabold text-xs shadow hover:bg-[#006666] active:scale-95 transition-all"
              >
                Apply Now
              </button>
            </div>
          </div>

          {/* Govt Scheme 3 */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#003d9b] flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">local_hospital</span>
              </div>
              <span className="bg-cyan-100 text-cyan-800 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                GOVERNMENT SCHEME
              </span>
            </div>

            <div>
              <h3 className="font-extrabold text-base text-[#0b1c30]">Ayushman Bharat (PM-JAY)</h3>
              <span className="text-xs text-slate-500 font-semibold">National Health Authority</span>
            </div>

            {/* Match Bar */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-bold text-[#0b1c30]">
                <span>Eligibility Match</span>
                <span className="text-[#008080]">98%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-[#008080] h-full rounded-full" style={{ width: '98%' }}></div>
              </div>
            </div>

            <div className="bg-[#f0f4f8] p-3 rounded-2xl text-xs">
              <span className="font-bold text-[#0b1c30] block mb-1">Why you qualify:</span>
              <p className="text-slate-600 font-medium text-[11px] leading-relaxed">
                Qualify for cashless secondary and tertiary care hospitalization up to ₹5,00,000 per family per year across empaneled public & private hospitals.
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="max-w-[65%]">
                <span className="text-xs font-bold text-[#008080] block leading-tight">
                  ₹5,00,000 Family Hospitalization Cover
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">Est. benefit: ₹5,00,000</span>
              </div>

              <button
                onClick={() => handleAutoFillClaim('Ayushman Bharat (PM-JAY)', '₹5,00,000')}
                className="px-5 py-2.5 rounded-2xl bg-[#008080] text-white font-extrabold text-xs shadow hover:bg-[#006666] active:scale-95 transition-all"
              >
                Apply Now
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Auto-fill Claim & Application Modal */}
      {activeClaimModal && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-[100] modal-active-backdrop flex items-center justify-center p-4 select-none">
          <div className="bg-white w-[90%] max-w-[340px] rounded-3xl p-5 shadow-2xl border border-slate-200 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-1.5 text-[#008080]">
                <span className="material-symbols-outlined text-xl">auto_fix_high</span>
                <h3 className="font-extrabold text-sm text-[#0b1c30]">Auto-fill Claim Form</h3>
              </div>
              <button onClick={() => setActiveClaimModal(null)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="bg-[#f0f4f8] p-3 rounded-2xl border border-slate-200 mb-3 text-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Selected Scheme</span>
              <h4 className="font-extrabold text-xs text-[#0b1c30]">{activeClaimModal.schemeName}</h4>
              <p className="text-[10px] font-bold text-[#008080] mt-0.5">Cover Limit: {activeClaimModal.maxCover}</p>
            </div>

            <form onSubmit={handleSubmitClaim} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Claim ID (Auto-Generated)</label>
                <input
                  type="text"
                  value={activeClaimModal.claimId}
                  readOnly
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Patient Name</label>
                <input
                  type="text"
                  value={activeClaimModal.patientName}
                  readOnly
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Hospital / Clinic Facility</label>
                <input
                  type="text"
                  value={activeClaimModal.hospital}
                  readOnly
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveClaimModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#008080] text-white text-xs font-bold shadow hover:bg-[#006666] active:scale-95 transition-all"
                >
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
