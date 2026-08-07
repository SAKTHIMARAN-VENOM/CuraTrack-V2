import React, { useState, useEffect } from 'react';

// 16. Notifications & Seasonal Health Alerts Screen Component (Matching Reference Template)
export function NotificationsScreen({ notifications, onMarkAllRead, onNavigate }) {
  const [activeTab, setActiveTab] = useState('Alerts'); // 'Alerts' | 'News'
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showWhoGuidelines, setShowWhoGuidelines] = useState(null);

  const seasonalOutbreaks = [
    {
      id: 'dengue',
      title: 'Dengue Fever Epidemic Watch',
      subtitle: 'August Seasonal Outbreak • High Precaution',
      risk: 'HIGH RISK',
      riskColor: 'bg-red-100 text-red-700 border-red-200',
      icon: 'bug_report',
      iconBg: 'bg-red-100 text-red-600',
      description: 'August is peak transmission month for Dengue virus across flooded districts.',
      symptoms: 'High fever (104°F), severe joint/muscle pain, skin rash, bleeding gums',
      precautions: 'Clear water from cooler trays, plant pots, and discarded tires every 3 days'
    },
    {
      id: 'malaria',
      title: 'Malaria (Plasmodium Falciparum)',
      subtitle: 'August Seasonal Outbreak • High Precaution',
      risk: 'HIGH RISK',
      riskColor: 'bg-red-100 text-red-700 border-red-200',
      icon: 'water_drop',
      iconBg: 'bg-red-100 text-red-600',
      description: 'Anopheles mosquito count reaches maximum annual density in August.',
      symptoms: 'Cyclic fever with chills, shivering, nausea, severe anemia, weakness',
      precautions: 'Use pyrethroid-treated bed nets, avoid outdoor stays after dusk'
    },
    {
      id: 'eye_flu',
      title: 'Viral Conjunctivitis (Monsoon Eye Flu)',
      subtitle: 'August Seasonal Outbreak • Moderate Precaution',
      risk: 'MODERATE RISK',
      riskColor: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: 'visibility_off',
      iconBg: 'bg-amber-100 text-amber-700',
      description: 'Monsoon high humidity accelerates adenoviral ocular infection spread.',
      symptoms: 'Severe eye redness, grittiness, pus discharge, eyelid swelling',
      precautions: 'Do not touch or rub eyes, use personal face towels, wash hands frequently'
    }
  ];

  const healthNews = [
    {
      id: 'news-1',
      title: 'Bhopal Memorial Hospital And Research Centre Shuts Pathology Labs, X-Ray Facilities',
      summary: 'The hospital said the claim regarding the discontinuation of X-ray services was baseless. No decision has been taken to terminate facilities.',
      date: 'Aug 6, 2026',
      image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'news-2',
      title: 'State Health Department Issues Vector Control Guidelines for Peak Monsoon',
      summary: 'Specialized fever clinics established across 45 districts with free rapid diagnostic kits for Dengue and Chikungunya testing.',
      date: 'Aug 6, 2026',
      image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'news-3',
      title: 'Monsoon Wellness & Preventive Care Guidelines 2026',
      summary: 'Read expert advice on essential nutritional intake, hydration benchmarks, and immunity boosters during seasonal humidity surges.',
      date: 'Aug 5, 2026',
      image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&auto=format&fit=crop&q=80'
    }
  ];

  return (
    <div className="flex-1 p-5 bg-[#f4f7fb] flex flex-col gap-4 relative">

      {/* Badges Row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="bg-amber-100 text-amber-900 font-extrabold text-[11px] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-amber-200">
          <span>📅</span>
          <span>AUGUST SEASONAL ALERTS (PEAK MONSOON)</span>
        </span>
        <span className="bg-red-100 text-red-700 font-extrabold text-[11px] px-3 py-1.5 rounded-full shadow-sm border border-red-200">
          3 Active Alerts
        </span>
      </div>

      {/* Screen Title & Subtitle */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#0b1c30] tracking-tight">Seasonal Health Alerts</h1>
        <p className="text-xs text-[#434654] font-medium mt-0.5">
          Regional disease outbreak forecasts and health precautions for August
        </p>
      </div>

      {/* Tabs Switcher: Alerts vs News */}
      <div className="flex bg-[#e5eeff] p-1 rounded-2xl border border-[#c3c6d6]/40">
        <button
          onClick={() => setActiveTab('Alerts')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'Alerts' ? 'bg-[#008080] text-white shadow-sm' : 'text-[#434654]'
          }`}
        >
          Regional Alerts (3)
        </button>
        <button
          onClick={() => setActiveTab('News')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'News' ? 'bg-[#008080] text-white shadow-sm' : 'text-[#434654]'
          }`}
        >
          Global Health News (3)
        </button>
      </div>

      {/* 1. REGIONAL ALERTS TAB */}
      {activeTab === 'Alerts' && (
        <div className="flex flex-col gap-4">
          
          {/* Main Monsoon Outbreak Banner (Image 1 top box) */}
          <div className="bg-amber-50/80 border-2 border-amber-200/80 rounded-3xl p-4 shadow-sm flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">thunderstorm</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-extrabold text-xs text-amber-950">
                  August Seasonal Disease Outbreak Alert (Peak Monsoon)
                </h3>
                <span className="bg-amber-200 text-amber-900 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase">
                  ACTIVE MONTH
                </span>
              </div>
              <p className="text-[11px] text-amber-900/90 font-medium leading-relaxed">
                Increased seasonal risk of <span className="font-bold">Dengue Fever Epidemic Watch</span>, <span className="font-bold">Malaria (Plasmodium Falciparum)</span>, <span className="font-bold">Viral Conjunctivitis (Monsoon Eye Flu)</span> detected for August. Review active precautionary measures below.
              </p>
            </div>
          </div>

          {/* Outbreak Watch Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Outbreak Count Card */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  AUGUST OUTBREAKS
                </span>
                <span className="text-3xl font-extrabold text-[#0b1c30]">3</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">bug_report</span>
              </div>
            </div>

            {/* Outbreak Status Quick Pills */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between gap-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[11px] text-[#0b1c30]">Dengue Epidemic Watch</span>
                <span className="bg-red-100 text-red-700 text-[9px] font-bold px-2 py-0.5 rounded-full">HIGH</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[11px] text-[#0b1c30]">Malaria (Plasmodium)</span>
                <span className="bg-red-100 text-red-700 text-[9px] font-bold px-2 py-0.5 rounded-full">HIGH</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[11px] text-[#0b1c30]">Viral Conjunctivitis</span>
                <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full">MODERATE</span>
              </div>
            </div>

          </div>

          {/* Detailed Seasonal Outbreak Cards List */}
          <div className="flex flex-col gap-4">
            {seasonalOutbreaks.map((outbreak) => (
              <div 
                key={outbreak.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl ${outbreak.iconBg} flex items-center justify-center shrink-0`}>
                      <span className="material-symbols-outlined text-2xl">{outbreak.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-[#0b1c30]">{outbreak.title}</h3>
                      <p className="text-[11px] text-slate-500 font-semibold">{outbreak.subtitle}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${outbreak.riskColor}`}>
                    {outbreak.risk}
                  </span>
                </div>

                <p className="text-xs text-[#434654] font-medium leading-normal">
                  {outbreak.description}
                </p>

                {/* Callout Symptoms & Precautions Box */}
                <div className="bg-[#f0f4f8] p-3.5 rounded-2xl flex flex-col gap-2 border border-slate-200/60">
                  <div>
                    <span className="text-[10px] font-extrabold text-red-600 uppercase tracking-wider block mb-0.5">
                      KEY SYMPTOMS:
                    </span>
                    <p className="text-xs font-semibold text-[#0b1c30]">{outbreak.symptoms}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-[#008080] uppercase tracking-wider block mb-0.5">
                      RECOMMENDED PRECAUTIONS:
                    </span>
                    <p className="text-xs font-semibold text-[#0b1c30]">{outbreak.precautions}</p>
                  </div>
                </div>

                {/* Button */}
                <button
                  onClick={() => setShowWhoGuidelines(outbreak)}
                  className="w-fit px-4 py-2 rounded-xl bg-[#e0f2fe] text-[#0284c7] font-bold text-xs hover:bg-sky-100 transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">verified</span>
                  <span>WHO Guidelines</span>
                </button>

              </div>
            ))}
          </div>

        </div>
      )}

      {/* 2. GLOBAL HEALTH NEWS TAB (Image 3) */}
      {activeTab === 'News' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-xl text-[#008080]">newspaper</span>
            <h2 className="text-base font-extrabold text-[#0b1c30]">Global Health News</h2>
          </div>

          {healthNews.map((news) => (
            <div 
              key={news.id} 
              className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-4 hover:shadow-md transition-shadow"
            >
              <img 
                src={news.image} 
                alt={news.title} 
                className="w-full sm:w-28 h-28 rounded-2xl object-cover shrink-0"
              />
              <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                <div>
                  <h3 className="font-extrabold text-sm text-[#0b1c30] leading-snug line-clamp-2 mb-1">
                    {news.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                    {news.summary}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-xs">
                  <span className="text-[11px] font-bold text-slate-400">{news.date}</span>
                  <button 
                    onClick={() => setSelectedArticle(news)}
                    className="font-extrabold text-[#008080] hover:text-[#006666] flex items-center gap-1"
                  >
                    <span>Read More</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WHO Guidelines Modal */}
      {showWhoGuidelines && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-[100] modal-active-backdrop flex items-center justify-center p-4 select-none">
          <div className="bg-white w-[90%] max-w-[340px] rounded-3xl p-5 shadow-2xl border border-slate-200 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-[#008080]">
                <span className="material-symbols-outlined text-xl">verified</span>
                <h3 className="font-extrabold text-sm text-[#0b1c30]">WHO Protocol Guidelines</h3>
              </div>
              <button onClick={() => setShowWhoGuidelines(null)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="bg-[#f0f4f8] p-3 rounded-2xl text-xs">
              <h4 className="font-extrabold text-[#0b1c30] mb-1">{showWhoGuidelines.title}</h4>
              <p className="text-slate-600 font-medium text-[11px] leading-relaxed">
                Standard WHO Clinical Protocol for vector control and early symptom intervention:
              </p>
              <ul className="list-disc pl-4 mt-2 font-medium text-[11px] text-slate-700 flex flex-col gap-1">
                <li>Maintain immediate hydration with oral rehydration salts (ORS).</li>
                <li>Monitor body temperature twice daily during peak infection windows.</li>
                <li>Seek emergency medical care if platelet counts drop below critical thresholds.</li>
              </ul>
            </div>

            <button
              onClick={() => setShowWhoGuidelines(null)}
              className="w-full py-2.5 rounded-2xl bg-[#008080] text-white font-extrabold text-xs shadow hover:bg-[#006666]"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Article Modal */}
      {selectedArticle && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-[100] modal-active-backdrop flex items-center justify-center p-4 select-none">
          <div className="bg-white w-[90%] max-w-[340px] rounded-3xl p-5 shadow-2xl border border-slate-200 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-[#008080] uppercase tracking-wider">Health News</span>
              <button onClick={() => setSelectedArticle(null)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <img src={selectedArticle.image} alt={selectedArticle.title} className="w-full h-32 rounded-2xl object-cover" />
            <h3 className="font-extrabold text-sm text-[#0b1c30] leading-snug">{selectedArticle.title}</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">{selectedArticle.summary}</p>
            <span className="text-[10px] font-bold text-slate-400">{selectedArticle.date}</span>

            <button
              onClick={() => setSelectedArticle(null)}
              className="w-full py-2.5 rounded-2xl bg-[#008080] text-white font-extrabold text-xs shadow hover:bg-[#006666]"
            >
              Close Article
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// 17. User Profile Screen Component (Full Template & Interactive Features)
export function UserProfileScreen({ userProfile, onLogout, onNavigate }) {
  // State for interactive features
  const [insurance, setInsurance] = useState({
    provider: "BlueCross Horizon Health",
    policyNumber: "BCH-98273-001"
  });

  const [emergencyContacts, setEmergencyContacts] = useState([
    { id: 1, name: "Michael Johnson", relation: "Spouse", phone: "(555) 123-4567", initials: "MJ" },
    { id: 2, name: "Alice Johnson", relation: "Mother", phone: "(555) 987-6543", initials: "AJ" }
  ]);

  const [settings, setSettings] = useState({
    darkTheme: false,
    notificationsEnabled: true,
    language: "English (US)"
  });

  // Google Fit & Smartwatch sync state
  const [googleFitConnected, setGoogleFitConnected] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleConnectGoogleFit = () => {
    setGoogleFitConnected(true);
    setToastMessage('✓ Google Fit connected! Smartwatch vitals & daily steps synced.');
    setTimeout(() => setToastMessage(''), 4000);
    setActiveModal(null);
  };

  const handleDisconnectGoogleFit = () => {
    setGoogleFitConnected(false);
    setToastMessage('Google Fit disconnected.');
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Modal active states
  const [activeModal, setActiveModal] = useState(null); // 'medical_id' | 'google_fit' | 'add_contact' | 'privacy'

  // Disable scroll down when entering details in any modal
  useEffect(() => {
    const scrollContainer = document.querySelector('.custom-scrollbar');
    if (scrollContainer) {
      if (activeModal) {
        scrollContainer.scrollTop = 0;
        scrollContainer.style.overflow = 'hidden';
      } else {
        scrollContainer.style.overflow = 'auto';
      }
    }
    return () => {
      if (scrollContainer) scrollContainer.style.overflow = 'auto';
    };
  }, [activeModal]);



  // Edit Insurance form state
  const [editProvider, setEditProvider] = useState(insurance.provider);
  const [editPolicy, setEditPolicy] = useState(insurance.policyNumber);

  // New Contact form state
  const [newContactName, setNewContactName] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('Spouse');
  const [newContactPhone, setNewContactPhone] = useState('');

  const handleSaveInsurance = (e) => {
    e.preventDefault();
    setInsurance({ provider: editProvider, policyNumber: editPolicy });
    setActiveModal(null);
  };

  const handleAddContact = (e) => {
    e.preventDefault();
    if (!newContactName || !newContactPhone) return;
    const initials = newContactName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    setEmergencyContacts([
      ...emergencyContacts,
      {
        id: Date.now(),
        name: newContactName,
        relation: newContactRelation,
        phone: newContactPhone,
        initials
      }
    ]);
    setNewContactName('');
    setNewContactPhone('');
    setActiveModal(null);
  };

  const toggleDarkTheme = () => {
    setSettings(prev => ({ ...prev, darkTheme: !prev.darkTheme }));
  };

  return (
    <div className="bg-background text-on-background font-body-lg flex-1 flex flex-col p-margin-mobile gap-lg pb-10">

      {/* Profile Header Stack */}
      <section className="flex flex-col gap-md">

        {/* Main Profile Info */}
        <div className="bg-surface rounded-2xl p-lg shadow-sm border border-outline-variant flex flex-col sm:flex-row items-center sm:items-start gap-lg text-center sm:text-left">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-surface-container-high flex-shrink-0 border-4 border-surface shadow-md">
            <img
              className="w-full h-full object-cover"
              alt={userProfile?.name}
              src={userProfile?.avatar}
            />
          </div>

          <div className="flex flex-col justify-center h-full">
            <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold mb-xs">
              {userProfile?.name || "Sarah Johnson"}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-md font-medium">
              DOB: 12/05/1985 (38y) • Female
            </p>
            <div className="flex flex-wrap gap-xs justify-center sm:justify-start">
              <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full font-label-lg text-label-lg font-bold">
                ★ Premium Member
              </span>
              <span className="bg-surface-variant text-on-surface-variant px-3 py-1 rounded-full font-label-lg text-label-lg font-semibold">
                ✓ ID Verified
              </span>
            </div>
          </div>
        </div>

        {/* Medical ID Shortcut Card */}
        <div
          onClick={() => setActiveModal('medical_id')}
          className="bg-primary rounded-2xl p-lg shadow-sm text-on-primary flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:bg-primary-container transition-colors min-h-[140px]"
        >
          <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-[120px] fill">medical_information</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-sm relative z-10">
              <span className="font-title-lg text-title-lg font-bold text-white">Medical ID</span>
              <span className="material-symbols-outlined text-white">qr_code_scanner</span>
            </div>
            <p className="font-body-md text-body-md text-blue-100 opacity-90 relative z-10">
              Quick emergency responder access.
            </p>
          </div>

          <div className="mt-lg flex items-center justify-between relative z-10">
            <span className="font-label-lg text-label-lg uppercase tracking-wider text-white font-bold">Tap to open</span>
            <span className="material-symbols-outlined text-white group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </div>
        </div>

      </section>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-[#008080] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300 z-50">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="ml-2 text-white/80 hover:text-white">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Vertical Stack Layout for Insurance, Contacts & Settings */}
      <div className="flex flex-col gap-lg">

        {/* Left Column */}
        <div className="flex flex-col gap-lg">

          {/* Google Fit & Smartwatch Integration Section */}
          <section className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#ea4335]/10 text-[#ea4335] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl">watch</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#0b1c30]">Google Fit & Smartwatch</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Sync vitals, heart rate & steps</p>
                </div>
              </div>

              {googleFitConnected ? (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  CONNECTED
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full">
                  NOT CONNECTED
                </span>
              )}
            </div>

            <p className="text-xs text-[#434654] font-medium leading-relaxed">
              Connect your Google Fit account or wearable smartwatch to auto-sync daily steps, heart rate ECG, and SpO2 oxygen levels.
            </p>

            {/* Supported Devices Badge Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">Google Fit</span>
              <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">Wear OS</span>
              <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">Galaxy Watch</span>
              <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">Fitbit</span>
              <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">Apple Health</span>
            </div>

            {/* Connection Actions */}
            {googleFitConnected ? (
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleDisconnectGoogleFit}
                  className="flex-1 py-2.5 rounded-2xl bg-red-50 text-red-600 border border-red-200 font-bold text-xs hover:bg-red-100 transition-all"
                >
                  Disconnect
                </button>
                <button
                  onClick={() => {
                    setToastMessage('✓ Smartwatch data refreshed! (Steps & Vitals up to date)');
                    setTimeout(() => setToastMessage(''), 3000);
                  }}
                  className="flex-1 py-2.5 rounded-2xl bg-[#008080] text-white font-extrabold text-xs shadow hover:bg-[#006666] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">sync</span>
                  <span>Sync Vitals Now</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveModal('google_fit')}
                className="w-full py-3 rounded-2xl bg-[#008080] text-white font-extrabold text-xs shadow-md hover:bg-[#006666] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">favorite</span>
                <span>Connect Google Fit & Smartwatch</span>
              </button>
            )}
          </section>

          {/* Emergency Contacts */}
          <section className="bg-surface rounded-2xl p-lg shadow-sm border border-outline-variant">
            <div className="flex items-center justify-between mb-md">
              <h3 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-xs">
                <span className="material-symbols-outlined text-error">emergency</span>
                Emergency Contacts
              </h3>
              <button
                onClick={() => setActiveModal('add_contact')}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary hover:bg-surface-container-high transition-colors"
                title="Add Emergency Contact"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
            </div>

            <ul className="flex flex-col gap-sm">
              {emergencyContacts.map((contact) => (
                <li key={contact.id} className="flex items-center justify-between p-sm rounded-xl hover:bg-surface-container-lowest transition-colors border border-slate-200">
                  <div className="flex items-center gap-md">
                    <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary font-title-lg text-title-lg font-bold">
                      {contact.initials}
                    </div>
                    <div>
                      <p className="font-body-md text-body-md font-bold text-on-surface">{contact.name}</p>
                      <p className="font-label-lg text-label-lg text-on-surface-variant">{contact.relation} • {contact.phone}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => alert(`Calling ${contact.name}...`)}
                    className="p-2 rounded-full hover:bg-blue-50 text-primary transition-all"
                  >
                    <span className="material-symbols-outlined text-lg">call</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-lg">

          {/* App Settings */}
          <section className="bg-surface rounded-2xl p-lg shadow-sm border border-outline-variant flex flex-col justify-between h-full">
            <div>
              <h3 className="font-title-lg text-title-lg text-on-surface font-bold mb-md flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary">settings</span>
                App Settings
              </h3>

              <div className="flex flex-col gap-sm">

                {/* Privacy & Security */}
                <div
                  onClick={() => setActiveModal('privacy')}
                  className="flex items-center justify-between p-md rounded-xl hover:bg-surface-container-low transition-colors group cursor-pointer border border-transparent hover:border-outline-variant"
                >
                  <div className="flex items-center gap-md text-on-surface">
                    <span className="material-symbols-outlined text-on-surface-variant">shield_lock</span>
                    <span className="font-body-lg text-body-lg font-medium">Privacy & Security</span>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
                </div>

                {/* Notifications */}
                <div className="flex items-center justify-between p-md rounded-xl hover:bg-surface-container-low transition-colors border border-transparent">
                  <div className="flex items-center gap-md text-on-surface">
                    <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
                    <span className="font-body-lg text-body-lg font-medium">Notifications</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notificationsEnabled}
                      onChange={() => setSettings(prev => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-variant rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Dark Theme Switch */}
                <div className="flex items-center justify-between p-md rounded-xl border border-transparent">
                  <div className="flex items-center gap-md text-on-surface">
                    <span className="material-symbols-outlined text-on-surface-variant">dark_mode</span>
                    <span className="font-body-lg text-body-lg font-medium">Dark Theme</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.darkTheme}
                      onChange={toggleDarkTheme}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-variant rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Language Selection */}
                <div className="flex items-center justify-between p-md rounded-xl hover:bg-surface-container-low transition-colors group border border-transparent hover:border-outline-variant">
                  <div className="flex items-center gap-md text-on-surface">
                    <span className="material-symbols-outlined text-on-surface-variant">language</span>
                    <div className="flex flex-col">
                      <span className="font-body-lg text-body-lg font-medium">Language</span>
                      <span className="font-label-lg text-label-lg text-on-surface-variant font-bold">{settings.language}</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
                </div>

              </div>
            </div>

            {/* Logout Action */}
            <div className="mt-lg pt-lg border-t border-outline-variant">
              <button
                onClick={onLogout}
                className="w-full py-3 flex items-center justify-center gap-sm text-error font-title-lg text-title-lg font-bold hover:bg-error-container rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">logout</span>
                Logout Account
              </button>
            </div>
          </section>

        </div>

      </div>

      {/* --- MODALS FOR INTERACTIVE FEATURES --- */}

      {/* 1. Medical ID Modal (Patient Emergency QR Code Pass) */}
      {activeModal === 'medical_id' && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-[100] modal-active-backdrop flex items-center justify-center p-4 select-none">
          <div className="bg-white w-[90%] max-w-[320px] rounded-3xl p-5 shadow-2xl border border-slate-200 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">


            {/* Header */}
            <div className="w-full flex justify-between items-center mb-3">
              <div className="flex items-center gap-1.5 text-[#003d9b]">
                <span className="material-symbols-outlined fill text-2xl text-red-600">medical_information</span>
                <h3 className="font-bold text-sm text-[#0b1c30]">Emergency Medical ID</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Patient Bar */}
            <div className="w-full bg-[#f8f9ff] p-3 rounded-2xl border border-slate-200 flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <img
                  src={userProfile?.avatar}
                  alt={userProfile?.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/20"
                />
                <div className="text-left">
                  <h4 className="font-extrabold text-xs text-[#0b1c30]">{userProfile?.name || "Sarah Jenkins"}</h4>
                  <span className="text-[10px] text-slate-500 font-medium">ID: CT-89234-MED</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-extrabold border border-red-200">
                {userProfile?.bloodGroup || 'O+'}
              </span>
            </div>

            {/* Prominent Emergency Scannable QR Code */}
            <div className="w-full bg-white p-3 rounded-2xl border-2 border-[#003d9b]/30 shadow-inner flex flex-col items-center justify-center my-1 relative group">
              <svg className="w-40 h-40 text-[#003d9b]" viewBox="0 0 100 100" fill="currentColor">
                <rect x="0" y="0" width="100" height="100" fill="#ffffff" />

                {/* Finder Patterns */}
                <rect x="5" y="5" width="25" height="25" fill="#003d9b" />
                <rect x="9" y="9" width="17" height="17" fill="#ffffff" />
                <rect x="13" y="13" width="9" height="9" fill="#003d9b" />

                <rect x="70" y="5" width="25" height="25" fill="#003d9b" />
                <rect x="74" y="9" width="17" height="17" fill="#ffffff" />
                <rect x="78" y="13" width="9" height="9" fill="#003d9b" />

                <rect x="5" y="70" width="25" height="25" fill="#003d9b" />
                <rect x="9" y="74" width="17" height="17" fill="#ffffff" />
                <rect x="13" y="78" width="9" height="9" fill="#003d9b" />

                {/* Data Modules */}
                <rect x="35" y="5" width="5" height="15" fill="#003d9b" />
                <rect x="45" y="10" width="10" height="5" fill="#003d9b" />
                <rect x="60" y="5" width="5" height="20" fill="#003d9b" />

                <rect x="5" y="35" width="15" height="5" fill="#003d9b" />
                <rect x="25" y="35" width="10" height="10" fill="#003d9b" />
                <rect x="40" y="30" width="20" height="5" fill="#003d9b" />
                <rect x="65" y="35" width="10" height="10" fill="#003d9b" />
                <rect x="80" y="35" width="15" height="5" fill="#003d9b" />

                <rect x="35" y="45" width="10" height="10" fill="#003d9b" />
                <rect x="50" y="40" width="5" height="20" fill="#003d9b" />
                <rect x="60" y="50" width="15" height="5" fill="#003d9b" />

                <rect x="35" y="60" width="5" height="15" fill="#003d9b" />
                <rect x="45" y="65" width="15" height="10" fill="#003d9b" />
                <rect x="65" y="60" width="10" height="5" fill="#003d9b" />
                <rect x="80" y="65" width="15" height="15" fill="#003d9b" />

                <rect x="35" y="80" width="15" height="15" fill="#003d9b" />
                <rect x="55" y="85" width="10" height="5" fill="#003d9b" />
                <rect x="70" y="80" width="10" height="15" fill="#003d9b" />

                {/* Medical Cross Center Emblem */}
                <circle cx="50" cy="50" r="11" fill="#ffffff" />
                <circle cx="50" cy="50" r="9" fill="#ba1a1a" />
                <path d="M50 44 v12 M44 50 h12" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
              </svg>

              <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-[#003d9b]">
                <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                <span>SCAN FOR EMERGENCY MEDICAL PROFILE</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 font-medium my-2">
              Encrypted FHIR Health Pass • Scannable by First Responders & Paramedics
            </p>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-2xl bg-[#003d9b] text-white font-bold text-xs shadow hover:bg-[#0052cc] active:scale-95 transition-all"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}



      {/* 5. Google Fit Sync Modal */}
      {activeModal === 'google_fit' && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-[100] modal-active-backdrop flex items-center justify-center p-4 select-none">
          <div className="bg-white w-[90%] max-w-[340px] rounded-3xl p-5 shadow-2xl border border-slate-200 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">favorite</span>
                </div>
                <h3 className="font-extrabold text-sm text-[#0b1c30]">Google Fit Integration</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="bg-[#f0f4f8] p-3.5 rounded-2xl flex flex-col gap-2 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                PERMISSIONS TO SYNC WITH CURATRACK
              </span>
              <ul className="text-xs font-semibold text-[#0b1c30] flex flex-col gap-1.5">
                <li className="flex items-center gap-2 text-emerald-700">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>Daily Step Count & Distance Walked</span>
                </li>
                <li className="flex items-center gap-2 text-emerald-700">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>Heart Rate Vitals & ECG Waveform</span>
                </li>
                <li className="flex items-center gap-2 text-emerald-700">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>Blood Oxygen Levels (SpO2 %)</span>
                </li>
                <li className="flex items-center gap-2 text-emerald-700">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>Sleep Cycles & Calorie Burn</span>
                </li>
              </ul>
            </div>

            <p className="text-[11px] text-slate-500 font-medium leading-tight">
              By connecting, CuraTrack will automatically read smartwatch sensor logs to maintain your real-time Vitals & Health Reports.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConnectGoogleFit}
                className="flex-1 py-2.5 rounded-xl bg-[#008080] text-white text-xs font-bold shadow hover:bg-[#006666] active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Allow & Connect</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Add Emergency Contact Modal */}
      {activeModal === 'add_contact' && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-[100] modal-active-backdrop flex items-center justify-center p-4 select-none">
          <div className="bg-white w-[90%] max-w-[320px] rounded-3xl p-5 shadow-2xl border border-slate-200 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm text-[#0b1c30]">Add Emergency Contact</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleAddContact} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Contact Full Name</label>
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="e.g. David Johnson"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#003d9b]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Relationship</label>
                <select
                  value={newContactRelation}
                  onChange={(e) => setNewContactRelation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#003d9b]"
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Child">Child</option>
                  <option value="Friend / Physician">Friend / Physician</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#003d9b]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#003d9b] text-white text-xs font-bold shadow hover:bg-[#0052cc] transition-all"
                >
                  Add Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Privacy & Security Modal */}
      {activeModal === 'privacy' && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-[100] modal-active-backdrop flex items-center justify-center p-4 select-none">
          <div className="bg-white w-[90%] max-w-[320px] rounded-3xl p-5 shadow-2xl border border-slate-200 text-xs flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-sm text-[#0b1c30]">Privacy & Encryption</h3>
                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed mb-3">
                CuraTrack uses AES-256 bit encryption and FHIR-compliant protocol standards for all medical record storage and transmission.
              </p>
              <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-2xl border border-emerald-200 font-bold flex items-center gap-2 mb-3 text-[11px]">
                <span className="material-symbols-outlined text-lg text-emerald-600">verified</span>
                <span>HIPAA Compliant Data Node</span>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-2xl bg-[#003d9b] text-white font-bold text-xs shadow hover:bg-[#0052cc] transition-all"
            >
              Understand & Close
            </button>
          </div>
        </div>
      )}


    </div>
  );
}

