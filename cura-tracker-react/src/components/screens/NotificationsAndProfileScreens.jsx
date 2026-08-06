import React, { useState, useEffect } from 'react';

// 16. Notifications Screen Component
export function NotificationsScreen({ notifications, onMarkAllRead, onNavigate }) {
  return (
    <div className="flex-1 p-5 bg-[#f8f9ff] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0b1c30]">Notifications</h2>
          <p className="text-xs text-[#434654]">Real-time reminders & health updates</p>
        </div>
        <button
          onClick={onMarkAllRead}
          className="text-xs font-bold text-[#003d9b] hover:underline"
        >
          Mark all read
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`p-4 rounded-3xl border transition-all flex items-start gap-3.5 ${
              notif.read
                ? 'bg-white border-[#c3c6d6]/40 opacity-75'
                : 'bg-white border-blue-200 shadow-sm ring-1 ring-blue-500/20'
            }`}
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 ${
              notif.type === 'medication' ? 'bg-[#006c49]' :
              notif.type === 'appointment' ? 'bg-[#003d9b]' : 'bg-purple-600'
            }`}>
              <span className="material-symbols-outlined text-xl">
                {notif.type === 'medication' ? 'pill' : notif.type === 'appointment' ? 'event' : 'description'}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <h3 className="font-bold text-xs text-[#0b1c30] truncate">{notif.title}</h3>
                <span className="text-[10px] text-slate-400 font-medium">{notif.time}</span>
              </div>
              <p className="text-xs text-[#434654] font-medium leading-tight">{notif.message}</p>
            </div>
          </div>
        ))}
      </div>
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

  // Modal active states
  const [activeModal, setActiveModal] = useState(null); // 'medical_id' | 'insurance_card' | 'edit_insurance' | 'add_contact' | 'privacy'

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

      {/* Vertical Stack Layout for Insurance, Contacts & Settings */}
      <div className="flex flex-col gap-lg">

        
        {/* Left Column */}
        <div className="flex flex-col gap-lg">
          
          {/* Insurance Details */}
          <section className="bg-surface rounded-2xl p-lg shadow-sm border border-outline-variant">
            <div className="flex items-center justify-between mb-md">
              <h3 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary">health_and_safety</span>
                Insurance Details
              </h3>
              <button 
                onClick={() => {
                  setEditProvider(insurance.provider);
                  setEditPolicy(insurance.policyNumber);
                  setActiveModal('edit_insurance');
                }}
                className="text-primary font-label-lg text-label-lg font-bold hover:underline"
              >
                Edit
              </button>
            </div>

            <div className="bg-surface-container-low rounded-xl p-md border border-outline-variant mb-md relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary-fixed opacity-30 pointer-events-none"></div>
              <div className="relative z-10">
                <p className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider mb-1 font-bold">Provider</p>
                <p className="font-title-lg text-title-lg text-on-surface font-bold mb-md">{insurance.provider}</p>
                
                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider mb-1 font-bold">Policy Number</p>
                    <p className="font-body-lg text-body-lg text-on-surface font-mono tracking-widest font-bold">{insurance.policyNumber}</p>
                  </div>
                  <div className="bg-surface p-1.5 rounded-md shadow-sm">
                    <span className="material-symbols-outlined text-on-surface-variant">qr_code_2</span>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setActiveModal('insurance_card')}
              className="w-full py-3 bg-surface-container border border-outline-variant rounded-full text-primary font-title-lg text-title-lg font-bold hover:bg-surface-container-high transition-colors"
            >
              View Digital Card
            </button>
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

      {/* 2. Digital Insurance Card Modal */}
      {activeModal === 'insurance_card' && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-[100] modal-active-backdrop flex items-center justify-center p-4 select-none">
          <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white w-[90%] max-w-[320px] rounded-3xl p-5 shadow-2xl border border-blue-500/30 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-xs text-blue-200 tracking-wider">DIGITAL INSURANCE PASS</span>
              <button onClick={() => setActiveModal(null)} className="text-white/80 hover:text-white">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">Insurance Provider</p>
              <h3 className="text-lg font-extrabold text-white">{insurance.provider}</h3>
            </div>

            <div className="mb-4">
              <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">Policy ID Number</p>
              <p className="font-mono text-base font-bold tracking-widest text-emerald-400">{insurance.policyNumber}</p>
            </div>

            <div className="bg-white p-3 rounded-2xl flex items-center justify-center my-2">
              <span className="material-symbols-outlined text-slate-900 text-5xl">barcode_scanner</span>
            </div>

            <button 
              onClick={() => setActiveModal(null)}
              className="w-full mt-3 py-2.5 rounded-2xl bg-white text-slate-900 font-bold text-xs shadow hover:bg-slate-100 transition-all"
            >
              Close Insurance Card
            </button>
          </div>
        </div>
      )}

      {/* 3. Edit Insurance Modal */}
      {activeModal === 'edit_insurance' && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-[100] modal-active-backdrop flex items-center justify-center p-4 select-none">
          <div className="bg-white w-[90%] max-w-[320px] rounded-3xl p-5 shadow-2xl border border-slate-200 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm text-[#0b1c30]">Edit Insurance Information</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSaveInsurance} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Insurance Provider</label>
                <input
                  type="text"
                  value={editProvider}
                  onChange={(e) => setEditProvider(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#003d9b]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Policy ID Number</label>
                <input
                  type="text"
                  value={editPolicy}
                  onChange={(e) => setEditPolicy(e.target.value)}
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
                  Save Changes
                </button>
              </div>
            </form>
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

// 18. CuraTrack Clinical Provider Screen Component
export function ClinicalScreen({ onNavigate }) {
  return (
    <div className="flex-1 p-5 bg-[#f8f9ff] flex flex-col gap-4">
      <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex items-center gap-3 text-xs text-amber-900">
        <span className="material-symbols-outlined text-2xl text-amber-600">medical_information</span>
        <div>
          <span className="font-extrabold block">Clinical Mode Active</span>
          <span className="text-[11px] text-amber-700">Viewing electronic health records (EHR) & patient chart</span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-[#c3c6d6]/50 shadow-sm flex flex-col gap-3">
        <h3 className="font-bold text-sm text-[#0b1c30]">Patient Clinical Overview</h3>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl">
            <span className="text-slate-400 text-[10px] block font-semibold">Allergies</span>
            <span className="font-bold text-red-600">Penicillin (Severe)</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl">
            <span className="text-slate-400 text-[10px] block font-semibold">Active Rx</span>
            <span className="font-bold text-[#003d9b]">3 Prescriptions</span>
          </div>
        </div>

        <div className="mt-2">
          <label className="block text-xs font-semibold text-[#0b1c30] mb-1">Clinical Note Entry</label>
          <textarea
            rows="3"
            placeholder="Type clinical observation..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          ></textarea>
        </div>

        <button
          onClick={() => alert("Clinical note saved to FHIR EHR database")}
          className="w-full py-2.5 rounded-xl bg-amber-700 text-white font-bold text-xs hover:bg-amber-800 transition-all"
        >
          Save Clinical Note
        </button>
      </div>
    </div>
  );
}
