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


// 15. Health Reports Screen Component (Exact template match to health_reports/code.html)
export function HealthReportsScreen({ vitals, onNavigate }) {
  return (
    <div className="bg-background text-on-background font-body-md flex-1 flex flex-col p-margin-mobile">
      <div className="mb-lg">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background mb-xs">Vitals Overview</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Your latest health metrics and historical trends.</p>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 gap-lg">
        
        {/* Primary Metric: Blood Pressure */}
        <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-lg flex flex-col justify-between">
          <div className="flex justify-between items-start mb-md">
            <div className="flex items-center gap-xs text-primary">
              <span className="material-symbols-outlined">favorite</span>
              <h2 className="font-title-lg text-title-lg text-on-surface">Blood Pressure</h2>
            </div>
            <span className="bg-secondary-container text-on-secondary-container font-label-lg text-label-lg px-3 py-1 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">trending_down</span>
              Optimal
            </span>
          </div>

          <div className="flex flex-col gap-sm mb-lg">
            <div>
              <div className="flex items-baseline gap-xs">
                <span className="text-5xl font-headline-lg font-bold text-on-background tracking-tighter">
                  {vitals?.bloodPressure || '118/76'}
                </span>
                <span className="text-outline text-xl font-normal">mmHg</span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">Last reading 2 hrs ago</p>
            </div>

            {/* SVG Chart */}
            <div className="w-full h-24 bg-surface-container-low rounded-lg relative overflow-hidden flex items-end pt-2">
              <svg className="w-full h-full text-primary" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path d="M0,80 Q10,70 20,85 T40,60 T60,75 T80,50 T100,65 L100,100 L0,100 Z" fill="currentColor" fillOpacity="0.15"></path>
                <path d="M0,80 Q10,70 20,85 T40,60 T60,75 T80,50 T100,65" fill="none" stroke="currentColor" strokeWidth="2.5"></path>
                <circle cx="100" cy="65" fill="currentColor" r="4"></circle>
              </svg>
            </div>
          </div>

          <div className="flex gap-sm">
            <button 
              onClick={() => alert("Log reading feature...")}
              className="bg-primary text-on-primary font-label-lg text-label-lg px-4 py-2 rounded-full hover:bg-on-primary-fixed-variant transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Log Reading
            </button>
            <button 
              onClick={() => alert("Showing history...")}
              className="border border-outline text-on-surface font-label-lg text-label-lg px-4 py-2 rounded-full hover:bg-surface-container transition-colors"
            >
              History
            </button>
          </div>
        </div>

        {/* Heart Rate & Blood Sugar Grid */}
        <div className="grid grid-cols-2 gap-md">
          {/* Heart Rate */}
          <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-md flex flex-col justify-between">
            <div className="flex justify-between items-start mb-xs">
              <div className="flex items-center gap-xs text-error">
                <span className="material-symbols-outlined fill">ecg</span>
                <h2 className="font-title-lg text-title-lg text-on-background">Heart Rate</h2>
              </div>
            </div>
            <div className="my-sm text-center">
              <span className="text-4xl font-headline-lg font-bold text-on-background">{vitals?.heartRate || 72}</span>
              <span className="font-body-md text-body-md text-on-surface-variant ml-1">bpm</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-on-surface-variant font-body-md">Resting avg</span>
              <span className="font-title-lg text-title-lg font-bold">68 bpm</span>
            </div>
          </div>

          {/* Blood Sugar */}
          <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-md flex flex-col justify-between">
            <div className="flex justify-between items-start mb-xs">
              <div className="flex items-center gap-xs text-secondary">
                <span className="material-symbols-outlined">water_drop</span>
                <h2 className="font-title-lg text-title-lg text-on-background">Blood Sugar</h2>
              </div>
            </div>
            <div className="my-sm text-center">
              <span className="text-4xl font-headline-lg font-bold text-on-background">95</span>
              <span className="font-body-md text-body-md text-on-surface-variant ml-1">mg/dL</span>
            </div>
            <div className="w-full bg-surface-container-high rounded-full h-2 mt-auto">
              <div className="bg-secondary h-2 rounded-full" style={{ width: '45%' }}></div>
            </div>
            <div className="flex justify-between text-xs text-on-surface-variant mt-1 font-label-lg">
              <span>70</span>
              <span>140</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
