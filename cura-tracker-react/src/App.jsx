import React, { useState } from 'react';
import MobileShell from './components/MobileShell';
import { 
  SplashScreen, 
  WelcomeScreen, 
  LoginScreen, 
  RegisterScreen, 
  ForgotPasswordScreen 
} from './components/screens/AuthScreens';
import { HomeDashboardScreen } from './components/screens/HomeDashboardScreen';
import { AppointmentsScreen, BookAppointmentScreen } from './components/screens/AppointmentsScreens';
import { MedicationsScreen } from './components/screens/MedicationsScreen';
import { 
  MedicalRecordsScreen, 
  MedicalRecordsEmptyScreen, 
  RecordDetailsScreen, 
  UploadSuccessScreen 
} from './components/screens/MedicalRecordsScreens';
import { EmergencySOSScreen, HealthReportsScreen } from './components/screens/EmergencyAndVitalsScreens';
import { 
  NotificationsScreen, 
  UserProfileScreen 
} from './components/screens/NotificationsAndProfileScreens';
import { BenefitsAndSchemesScreen } from './components/screens/BenefitsAndSchemesScreens';

import { 
  initialUserData, 
  initialVitals, 
  initialAppointments, 
  initialMedications, 
  initialMedicalRecords, 
  initialNotifications 
} from './data/mockData';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home_dashboard');
  const [userProfile, setUserProfile] = useState(initialUserData);
  const [vitals, setVitals] = useState(initialVitals);
  const [appointments, setAppointments] = useState(initialAppointments);
  const [medications, setMedications] = useState(initialMedications);
  const [records, setRecords] = useState(initialMedicalRecords);
  const [selectedRecord, setSelectedRecord] = useState(initialMedicalRecords[0]);
  const [notifications, setNotifications] = useState(initialNotifications);

  // App handlers
  const handleToggleMedication = (id) => {
    setMedications(prev => prev.map(m => m.id === id ? { ...m, taken: !m.taken } : m));
  };

  const handleAddMedication = (newMed) => {
    setMedications(prev => [newMed, ...prev]);
  };

  const handleBookAppointment = (newApt) => {
    setAppointments(prev => [newApt, ...prev]);
  };

  const handleCancelAppointment = (id) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  const handleRescheduleAppointment = (id, newDate, newTime) => {
    setAppointments(prev => prev.map(a => 
      a.id === id ? { ...a, date: newDate, time: newTime } : a
    ));
  };

  const handleAddRecord = (newRec) => {
    setRecords(prev => [newRec, ...prev]);
    setSelectedRecord(newRec);
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const renderActiveScreen = () => {
    switch (currentScreen) {
      // 1. Splash Screen
      case 'splash_screen':
        return <SplashScreen onNext={() => setCurrentScreen('welcome_screen')} />;

      // 2. Welcome Screen
      case 'welcome_screen':
        return <WelcomeScreen onNavigate={setCurrentScreen} />;

      // 3. Login Screen
      case 'login_screen_updated':
        return <LoginScreen onNavigate={setCurrentScreen} onLogin={() => setCurrentScreen('home_dashboard')} />;

      // 4. Register Screen
      case 'register_screen':
        return <RegisterScreen onNavigate={setCurrentScreen} onRegister={() => setCurrentScreen('home_dashboard')} />;

      // 5. Forgot Password Screen
      case 'forgot_password_screen':
        return <ForgotPasswordScreen onNavigate={setCurrentScreen} />;

      // 6. Home Dashboard
      case 'home_dashboard':
        return (
          <HomeDashboardScreen
            userProfile={userProfile}
            vitals={vitals}
            appointments={appointments}
            medications={medications}
            onNavigate={setCurrentScreen}
          />
        );

      // 7. Appointments List
      case 'appointments':
        return (
          <AppointmentsScreen
            appointments={appointments}
            onNavigate={setCurrentScreen}
            onCancelAppointment={handleCancelAppointment}
            onRescheduleAppointment={handleRescheduleAppointment}
            onBook={handleBookAppointment}
          />
        );


      // 8. Book Appointment
      case 'book_appointment':
        return (
          <BookAppointmentScreen
            onBook={handleBookAppointment}
            onNavigate={setCurrentScreen}
          />
        );

      // 9. Medications Rx Tracker
      case 'medications':
        return (
          <MedicationsScreen
            medications={medications}
            onToggleMedication={handleToggleMedication}
            onAddMedication={handleAddMedication}
          />
        );

      // 10. Medical Records List
      case 'medical_records':
        return (
          <MedicalRecordsScreen
            records={records}
            onAddRecord={handleAddRecord}
            onNavigate={setCurrentScreen}
            onSelectRecord={setSelectedRecord}
          />
        );

      // 11. Medical Records Empty State
      case 'medical_records_empty':
        return <MedicalRecordsEmptyScreen onNavigate={setCurrentScreen} />;

      // 12. Record Details View
      case 'record_details':
        return <RecordDetailsScreen record={selectedRecord} onNavigate={setCurrentScreen} />;

      // 13. Upload Success Modal Screen
      case 'upload_success':
        return <UploadSuccessScreen onNavigate={setCurrentScreen} />;

      // 14. Emergency SOS Response
      case 'emergency_sos':
        return <EmergencySOSScreen userProfile={userProfile} onNavigate={setCurrentScreen} />;

      // 15. Health Reports & Analytics
      case 'health_reports':
        return <HealthReportsScreen vitals={vitals} onNavigate={setCurrentScreen} />;

      // 16. Notifications Center
      case 'notifications_updated':
        return (
          <NotificationsScreen
            notifications={notifications}
            onMarkAllRead={handleMarkAllRead}
            onNavigate={setCurrentScreen}
          />
        );

      // 17. User Profile & Settings
      case 'user_profile':
        return (
          <UserProfileScreen
            userProfile={userProfile}
            onLogout={() => setCurrentScreen('welcome_screen')}
            onNavigate={setCurrentScreen}
          />
        );

      // 18. Benefits & Schemes
      case 'benefits_schemes':
        return <BenefitsAndSchemesScreen onNavigate={setCurrentScreen} />;
      default:
        return (
          <HomeDashboardScreen
            userProfile={userProfile}
            vitals={vitals}
            appointments={appointments}
            medications={medications}
            onNavigate={setCurrentScreen}
          />
        );
    }
  };

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  return (
    <MobileShell
      currentScreen={currentScreen}
      setCurrentScreen={setCurrentScreen}
      notificationsCount={unreadNotifsCount}
      userProfile={userProfile}
    >
      {renderActiveScreen()}
    </MobileShell>
  );
}
