import React, { useState, useEffect } from 'react';

// 14. Emergency SOS Screen Component (Exact template match to emergency_sos/code.html)
export function EmergencySOSScreen({ userProfile, onNavigate }) {
  const [countdown, setCountdown] = useState(9);
  const [isCounting, setIsCounting] = useState(true);
  const [dispatched, setDispatched] = useState(false);

  useEffect(() => {
    let timer;
    if (isCounting && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (isCounting && countdown === 0) {
      setDispatched(true);
      setIsCounting(false);
    }
    return () => clearTimeout(timer);
  }, [isCounting, countdown]);

  const handleStartSOS = () => {
    setIsCounting(true);
    setCountdown(9);
    setDispatched(false);
  };

  const handleCancelSOS = () => {
    setIsCounting(false);
    setCountdown(9);
    setDispatched(false);
  };

  return (
    <div className="bg-surface text-on-surface flex-1 flex flex-col items-center justify-start overflow-y-auto p-margin-mobile">
      
      {/* Header Bar */}
      <header className="w-full flex justify-between items-center h-16 z-50 mb-sm">
        <div className="font-headline-sm text-headline-sm font-bold text-error flex items-center gap-2">
          <span className="material-symbols-outlined fill text-error">emergency</span>
          Emergency SOS
        </div>
        {onNavigate && (
          <button 
            onClick={() => onNavigate('home_dashboard')} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </header>

      <main className="w-full flex-grow flex flex-col gap-lg">
        {/* Hero SOS Button & Countdown Section */}
        <section className="flex flex-col items-center justify-center py-lg text-center">
          <div className="relative mb-lg">
            <div className="absolute inset-0 bg-error rounded-full animate-ping opacity-30"></div>
            <button 
              onClick={isCounting ? handleCancelSOS : handleStartSOS}
              className="relative w-44 h-44 md:w-48 md:h-48 rounded-full bg-error text-on-error flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined fill text-headline-lg text-5xl">call</span>
              <span className="font-headline-md text-headline-md mt-xs font-bold">SOS</span>
            </button>
          </div>

          {!dispatched ? (
            <div className="bg-error-container text-on-error-container rounded-xl p-md w-full border border-error/20 flex flex-col items-center gap-xs shadow-sm">
              <span className="font-title-lg text-title-lg">Auto-calling 911 in</span>
              <div className="font-headline-lg text-headline-lg font-bold">
                00:0{countdown}
              </div>
              <button 
                onClick={handleCancelSOS}
                className="font-label-lg text-label-lg text-error underline mt-xs hover:opacity-80"
              >
                Cancel Emergency Dispatch
              </button>
            </div>
          ) : (
            <div className="bg-emerald-100 text-emerald-900 rounded-xl p-md w-full border border-emerald-300 flex flex-col items-center gap-xs shadow-sm">
              <span className="material-symbols-outlined text-4xl text-emerald-700">task_alt</span>
              <span className="font-title-lg text-title-lg font-bold">Emergency Responders Dispatched</span>
              <p className="font-body-md text-xs text-emerald-800 text-center">
                Paramedics & emergency contacts have received your live GPS coordinates.
              </p>
              <button 
                onClick={handleStartSOS}
                className="font-label-lg text-xs text-emerald-900 underline mt-xs font-bold"
              >
                Reset Emergency State
              </button>
            </div>
          )}
        </section>

        {/* Medical ID Bento */}
        <section className="grid grid-cols-2 gap-md">
          <div className="col-span-2">
            <h2 className="font-title-lg text-title-lg text-on-surface mb-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">medical_information</span>
              Medical ID
            </h2>
          </div>
          <div className="bg-surface-container-low rounded-xl p-md shadow-sm border border-outline-variant/30 flex flex-col gap-xs">
            <span className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider">Blood Group</span>
            <span className="font-headline-sm text-headline-sm font-bold text-error">{userProfile?.bloodGroup || "O+"}</span>
          </div>
          <div className="bg-surface-container-low rounded-xl p-md shadow-sm border border-outline-variant/30 flex flex-col gap-xs">
            <span className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider">Allergies</span>
            <span className="font-body-md text-body-md font-semibold text-on-surface">Penicillin</span>
          </div>
          <div className="col-span-2 bg-surface-container-low rounded-xl p-md shadow-sm border border-outline-variant/30 flex flex-col gap-xs">
            <span className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider">Current Meds</span>
            <span className="font-body-md text-body-md font-semibold text-on-surface">Lisinopril 10mg, Amoxicillin 500mg</span>
          </div>
        </section>

        {/* Emergency Contacts */}
        <section className="flex flex-col gap-sm pb-xl">
          <h2 className="font-title-lg text-title-lg text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">contacts</span>
            Emergency Contacts
          </h2>
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 divide-y divide-outline-variant/20">
            {/* Contact 1 */}
            <div className="p-md flex items-center justify-between hover:bg-surface-container-low transition-colors rounded-t-xl">
              <div className="flex items-center gap-md">
                <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-headline-sm text-headline-sm font-bold">
                  SJ
                </div>
                <div className="flex flex-col">
                  <span className="font-title-lg text-title-lg text-on-surface">Sarah Johnson</span>
                  <span className="font-body-md text-body-md text-on-surface-variant">Spouse • 555-0102</span>
                </div>
              </div>
              <button 
                onClick={() => alert("Calling Sarah Johnson (Spouse)...")}
                className="w-12 h-12 rounded-full bg-primary-container text-on-primary flex items-center justify-center active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined fill text-white">call</span>
              </button>
            </div>
            {/* Contact 2 */}
            <div className="p-md flex items-center justify-between hover:bg-surface-container-low transition-colors rounded-b-xl">
              <div className="flex items-center gap-md">
                <div className="w-12 h-12 rounded-full bg-tertiary-container text-on-tertiary flex items-center justify-center font-headline-sm text-headline-sm font-bold">
                  MJ
                </div>
                <div className="flex flex-col">
                  <span className="font-title-lg text-title-lg text-on-surface">Michael Johnson</span>
                  <span className="font-body-md text-body-md text-on-surface-variant">Brother • 555-0199</span>
                </div>
              </div>
              <button 
                onClick={() => alert("Calling Michael Johnson (Brother)...")}
                className="w-12 h-12 rounded-full bg-primary-container text-on-primary flex items-center justify-center active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined fill text-white">call</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}


// 15. Health Reports Screen Component
export function HealthReportsScreen({ vitals, onNavigate }) {
  return (
    <div className="bg-background text-on-background font-body-md flex-1 flex flex-col p-margin-mobile">
      <div className="mb-lg">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background mb-xs">Vitals Overview</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Your latest health metrics and historical trends.</p>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 gap-lg">
        
        {/* Primary Metric: Daily Steps Calculated */}
        <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-lg flex flex-col justify-between">
          <div className="flex justify-between items-start mb-md">
            <div className="flex items-center gap-xs text-[#006c49]">
              <span className="material-symbols-outlined fill text-2xl">directions_walk</span>
              <h2 className="font-title-lg text-title-lg text-on-surface">Daily Steps Calculated</h2>
            </div>
            <span className="bg-emerald-100 text-emerald-800 font-label-lg text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">bolt</span>
              64% Goal Achieved
            </span>
          </div>

          <div className="flex flex-col gap-sm">
            <div>
              <div className="flex items-baseline gap-xs">
                <span className="text-5xl font-headline-lg font-bold text-on-background tracking-tighter">
                  {vitals?.steps?.toLocaleString() || '6,420'}
                </span>
                <span className="text-outline text-xl font-normal">/ 10,000 steps</span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                ~2.8 miles walked • 195 kcal burned today
              </p>
            </div>

            {/* Steps Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3.5 mt-2 overflow-hidden p-0.5 border border-slate-200">
              <div className="bg-[#006c49] h-full rounded-full transition-all duration-500" style={{ width: '64.2%' }}></div>
            </div>
            <div className="flex justify-between text-xs text-on-surface-variant mt-1 font-semibold">
              <span>0 steps</span>
              <span className="text-[#006c49] font-bold">3,580 steps remaining</span>
              <span>10,000 goal</span>
            </div>
          </div>
        </div>

        {/* Heart Rate & Oxygen Level (SpO2) Grid */}
        <div className="grid grid-cols-1 gap-md">
          {/* Heart Rate Card with ECG Graph */}
          <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-lg flex flex-col justify-between">
            <div className="flex justify-between items-start mb-xs">
              <div className="flex items-center gap-xs text-red-600">
                <span className="material-symbols-outlined fill">ecg</span>
                <h2 className="font-title-lg text-title-lg text-on-background">Heart Rate</h2>
              </div>
              <span className="bg-red-100 text-red-700 font-label-lg text-xs px-2.5 py-0.5 rounded-full font-bold">
                Normal Resting
              </span>
            </div>

            <div className="my-sm">
              <div className="flex items-baseline gap-xs">
                <span className="text-4xl font-headline-lg font-bold text-on-background">{vitals?.heartRate || 72}</span>
                <span className="font-body-md text-body-md text-on-surface-variant">bpm</span>
              </div>
              <p className="font-body-md text-xs text-on-surface-variant mt-1">Resting avg: 68 bpm</p>
            </div>

            {/* Heart Rate SVG Graph */}
            <div className="w-full h-24 bg-red-50/50 rounded-xl relative overflow-hidden flex items-end pt-2 border border-red-100 mt-2">
              <svg className="w-full h-full text-red-500" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path d="M0,75 L15,75 L20,40 L25,90 L30,20 L35,80 L40,75 L55,75 L60,35 L65,85 L70,25 L75,80 L80,75 L100,75 L100,100 L0,100 Z" fill="currentColor" fillOpacity="0.12"></path>
                <path d="M0,75 L15,75 L20,40 L25,90 L30,20 L35,80 L40,75 L55,75 L60,35 L65,85 L70,25 L75,80 L80,75 L100,75" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <circle cx="80" cy="75" fill="currentColor" r="4"></circle>
              </svg>
            </div>
          </div>

          {/* Oxygen Level (SpO2) Card */}
          <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-lg flex flex-col justify-between">
            <div className="flex justify-between items-start mb-xs">
              <div className="flex items-center gap-xs text-sky-600">
                <span className="material-symbols-outlined">pulmonology</span>
                <h2 className="font-title-lg text-title-lg text-on-background">Oxygen (SpO2)</h2>
              </div>
              <span className="bg-sky-100 text-sky-700 font-label-lg text-xs px-2.5 py-0.5 rounded-full font-bold">
                Excellent
              </span>
            </div>

            <div className="my-sm">
              <div className="flex items-baseline gap-xs">
                <span className="text-4xl font-headline-lg font-bold text-on-background">{vitals?.spo2 || 98}%</span>
              </div>
              <p className="font-body-md text-xs text-on-surface-variant mt-1">Normal Range: 95% - 100%</p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 mt-3 overflow-hidden p-0.5 border border-slate-200">
              <div className="bg-sky-500 h-full rounded-full transition-all duration-500" style={{ width: `${vitals?.spo2 || 98}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-on-surface-variant mt-2 font-semibold">
              <span>90%</span>
              <span className="text-emerald-600 font-bold">98% (Optimal)</span>
              <span>100%</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
