import React, { useState, useEffect } from 'react';
import { CuraTrackLogoIcon, CuraTrackBrandHeader } from './CuraTrackLogo';
import { 
  Smartphone, 
  Maximize2, 
  Minimize2, 
  Wifi, 
  Battery, 
  Signal, 
  Bell, 
  ArrowLeft, 
  ShieldAlert,
  Home,
  Calendar,
  Pill,
  FileText,
  User
} from 'lucide-react';

export default function MobileShell({ 
  children, 
  currentScreen, 
  setCurrentScreen, 
  notificationsCount = 2,
  userProfile 
}) {
  const [isDeviceFrame, setIsDeviceFrame] = useState(true);
  const [currentTime, setCurrentTime] = useState("09:41");

  // Lock background scroll when entering details in any modal dialog
  useEffect(() => {
    const preventScroll = (e) => {
      if (document.querySelector('.modal-active-backdrop')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const container = document.querySelector('.custom-scrollbar');
    if (container) {
      container.addEventListener('wheel', preventScroll, { passive: false });
      container.addEventListener('touchmove', preventScroll, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', preventScroll);
        container.removeEventListener('touchmove', preventScroll);
      }
    };
  }, []);


  // Bottom Navigation Items
  const navItems = [
    { id: 'home_dashboard', label: 'Home', icon: 'home' },
    { id: 'appointments', label: 'Appointments', icon: 'calendar_month' },
    { id: 'medications', label: 'Meds', icon: 'pill' },
    { id: 'medical_records', label: 'Records', icon: 'folder_shared' },
    { id: 'user_profile', label: 'Profile', icon: 'person' },
  ];

  // Top header title based on active screen
  const getHeaderTitle = () => {
    switch (currentScreen) {
      case 'home_dashboard': return 'CuraTrack';
      case 'appointments': return 'Appointments';
      case 'book_appointment': return 'Book Appointment';
      case 'medications': return 'Daily Medications';
      case 'medical_records': return 'Medical Records';
      case 'medical_records_empty': return 'Medical Records';
      case 'record_details': return 'Record Details';
      case 'upload_success': return 'Record Uploaded';
      case 'emergency_sos': return 'Emergency SOS';
      case 'health_reports': return 'Health Vitals & Reports';
      case 'notifications_updated': return 'Notifications';
      case 'user_profile': return 'Profile & Settings';
      case 'curatrack_clinical': return 'Clinical Provider Mode';
      default: return 'CuraTrack';
    }
  };

  const isAuthScreen = [
    'splash_screen',
    'welcome_screen',
    'login_screen_updated',
    'register_screen',
    'forgot_password_screen'
  ].includes(currentScreen);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-0 md:p-6 transition-all duration-300">
      
      {/* Top Desktop Controls Bar */}
      <header className="w-full max-w-5xl mb-4 px-4 py-3 bg-slate-900/90 border border-slate-800 rounded-2xl backdrop-blur flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <CuraTrackBrandHeader showSubtitle={true} subtitleText="Health Management Suite" />
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            Android Frontend
          </span>
        </div>

        {/* Navigation Selector Quick Jump */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400 px-2 font-medium">Quick Jump:</span>
          <select 
            value={currentScreen} 
            onChange={(e) => setCurrentScreen(e.target.value)}
            className="bg-slate-900 text-blue-400 border border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500 font-medium"
          >
            <optgroup label="Auth & Onboarding">
              <option value="splash_screen">1. Splash Screen</option>
              <option value="welcome_screen">2. Welcome Screen</option>
              <option value="login_screen_updated">3. Login Screen</option>
              <option value="register_screen">4. Register Screen</option>
              <option value="forgot_password_screen">5. Forgot Password</option>
            </optgroup>
            <optgroup label="Main App Features">
              <option value="home_dashboard">6. Home Dashboard</option>
              <option value="appointments">7. Appointments</option>
              <option value="book_appointment">8. Book Appointment</option>
              <option value="medications">9. Medications</option>
              <option value="health_reports">10. Health Vitals & Reports</option>
              <option value="medical_records">11. Medical Records</option>
              <option value="medical_records_empty">12. Medical Records (Empty)</option>
              <option value="record_details">13. Record Details</option>
              <option value="upload_success">14. Upload Success Modal</option>
            </optgroup>
            <optgroup label="Emergency & Utility">
              <option value="emergency_sos">15. Emergency SOS</option>
              <option value="notifications_updated">16. Notifications</option>
              <option value="user_profile">17. User Profile</option>
              <option value="curatrack_clinical">18. Clinical Provider Mode</option>
            </optgroup>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentScreen('emergency_sos')}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 active:scale-95 transition-all"
          >
            <ShieldAlert className="w-4 h-4 animate-pulse" />
            <span className="hidden sm:inline">Emergency SOS</span>
          </button>

          <button 
            onClick={() => setIsDeviceFrame(!isDeviceFrame)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95 transition-all"
            title={isDeviceFrame ? "Expand Fullscreen Mode" : "Wrap in Android Device Frame"}
          >
            {isDeviceFrame ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isDeviceFrame ? "Fullscreen View" : "Device View"}</span>
          </button>
        </div>
      </header>

      {/* Main Viewport Container */}
      <div className={`transition-all duration-300 ${
        isDeviceFrame 
          ? "w-[412px] h-[870px] max-w-full rounded-[48px] border-[10px] border-slate-800 bg-[#f8f9ff] shadow-2xl relative flex flex-col overflow-hidden ring-1 ring-slate-700/50" 
          : "w-full max-w-4xl h-[85vh] rounded-3xl bg-[#f8f9ff] shadow-2xl relative flex flex-col overflow-hidden border border-slate-800"
      }`}>

        {/* Android Native Status Bar */}
        <div className="w-full bg-[#f8f9ff] text-[#0b1c30] px-6 pt-3 pb-1 flex items-center justify-between select-none text-xs font-medium z-50">
          <span className="font-semibold text-slate-900 tracking-tight">{currentTime}</span>
          <div className="flex items-center gap-2 text-slate-700">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <div className="flex items-center gap-0.5">
              <span className="text-[10px]">98%</span>
              <Battery className="w-4 h-4 fill-slate-700" />
            </div>
          </div>
        </div>

        {/* Camera Punchhole Notch (Only visible in Phone frame mode) */}
        {isDeviceFrame && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-slate-900 rounded-full z-50 ring-2 ring-slate-800/80"></div>
        )}

        {/* Top Android Header (Hidden on Auth Screens) */}
        {!isAuthScreen && (
          <div className="bg-[#f8f9ff] text-[#003d9b] px-5 py-3 flex items-center justify-between border-b border-slate-200/60 sticky top-0 z-40">
            <div className="flex items-center gap-3">
              {currentScreen !== 'home_dashboard' && (
                <button 
                  onClick={() => setCurrentScreen('home_dashboard')}
                  className="p-1.5 rounded-full hover:bg-slate-200/60 active:scale-95 text-[#003d9b] transition-all"
                  aria-label="Go Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              {currentScreen === 'home_dashboard' && (
                <img 
                  src={userProfile?.avatar} 
                  alt={userProfile?.name} 
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/20"
                />
              )}
              <h2 className="font-bold text-lg text-[#003d9b] tracking-tight">{getHeaderTitle()}</h2>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentScreen('notifications_updated')}
                className="relative p-2 rounded-full hover:bg-slate-200/60 text-[#003d9b] transition-all active:scale-95"
                title="Notifications"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                {notificationsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full ring-2 ring-white animate-pulse"></span>
                )}
              </button>

              <button 
                onClick={() => setCurrentScreen('emergency_sos')}
                className="p-2 rounded-full hover:bg-red-100 text-red-600 transition-all active:scale-95"
                title="Emergency SOS"
              >
                <span className="material-symbols-outlined text-[22px]">emergency_home</span>
              </button>
            </div>
          </div>
        )}

        {/* Screen Content Window */}
        <div className="flex-1 overflow-y-auto custom-scrollbar text-[#0b1c30] bg-[#f8f9ff] flex flex-col relative">
          {children}
        </div>


        {/* Android Bottom Navigation Bar (Hidden on Auth Screens) */}
        {!isAuthScreen && (
          <div className="bg-white border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-between z-40 shadow-lg w-full">
            {navItems.map((item) => {
              const isActive = currentScreen === item.id || 
                (item.id === 'appointments' && ['book_appointment'].includes(currentScreen)) ||
                (item.id === 'medical_records' && ['record_details', 'medical_records_empty', 'upload_success'].includes(currentScreen));

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentScreen(item.id)}
                  className={`flex-1 flex flex-col items-center justify-center py-0.5 px-0.5 min-w-0 rounded-xl transition-all active:scale-95 ${
                    isActive 
                      ? 'text-[#003d9b] font-bold' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <div className={`px-2.5 py-0.5 rounded-full flex items-center justify-center transition-all ${
                    isActive ? 'bg-[#dae2ff] text-[#003d9b]' : ''
                  }`}>
                    <span className={`material-symbols-outlined text-[20px] ${isActive ? 'fill' : ''}`}>
                      {item.icon}
                    </span>
                  </div>
                  <span className="text-[10px] mt-0.5 tracking-tight font-medium truncate w-full text-center">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Android Home Navigation Bar indicator */}
        <div className="bg-white py-1 flex justify-center items-center shrink-0">
          <div className="w-28 h-1 bg-slate-300 rounded-full"></div>
        </div>


      </div>
    </div>
  );
}
