'use client';

import React, { useState } from 'react';
import MobileShell from './MobileShell';
import { 
  SplashScreen, 
  WelcomeScreen, 
  LoginScreen, 
  RegisterScreen, 
  ForgotPasswordScreen 
} from './screens/AuthScreens';
import { HomeDashboardScreen } from './screens/HomeDashboardScreen';
import { AppointmentsScreen, BookAppointmentScreen } from './screens/AppointmentsScreens';
import { MedicationsScreen } from './screens/MedicationsScreen';
import { 
  MedicalRecordsScreen, 
  MedicalRecordsEmptyScreen, 
  RecordDetailsScreen, 
  UploadSuccessScreen 
} from './screens/MedicalRecordsScreens';
import { EmergencySOSScreen, HealthReportsScreen } from './screens/EmergencyAndVitalsScreens';
import { 
  NotificationsScreen, 
  UserProfileScreen 
} from './screens/NotificationsAndProfileScreens';
import { BenefitsAndSchemesScreen } from './screens/BenefitsAndSchemesScreens';

import { 
  initialUserData, 
  initialVitals, 
  initialAppointments, 
  initialMedications, 
  initialMedicalRecords, 
  initialNotifications 
} from '@/lib/mockData';

export default function AppSuiteWrapper() {
  const [currentScreen, setCurrentScreen] = useState('home_dashboard');
  const [userProfile, setUserProfile] = useState(initialUserData);
  const [vitals, setVitals] = useState(initialVitals);
  const [appointments, setAppointments] = useState(initialAppointments);
  const [medications, setMedications] = useState(initialMedications);
  const [records, setRecords] = useState(initialMedicalRecords);
  const [selectedRecord, setSelectedRecord] = useState(initialMedicalRecords[0]);
  const [notifications, setNotifications] = useState(initialNotifications);

  const handleToggleMedication = (id: any) => {
    setMedications(prev => prev.map(m => m.id === id ? { ...m, taken: !m.taken } : m));
  };

  const handleAddMedication = (newMed: any) => {
    setMedications(prev => [newMed, ...prev]);
  };

  const handleBookAppointment = (newApt: any) => {
    setAppointments(prev => [newApt, ...prev]);
  };

  const handleCancelAppointment = (id: any) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  const handleRescheduleAppointment = (id: any, newDate: any, newTime: any) => {
    setAppointments(prev => prev.map(a => 
      a.id === id ? { ...a, date: newDate, time: newTime } : a
    ));
  };

  const handleAddRecord = (newRec: any) => {
    setRecords(prev => [newRec, ...prev]);
    setSelectedRecord(newRec);
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'splash_screen':
        return <SplashScreen onNext={() => setCurrentScreen('welcome_screen')} />;
      case 'welcome_screen':
        return <WelcomeScreen onNavigate={setCurrentScreen} />;
      case 'login_screen_updated':
        return <LoginScreen onNavigate={setCurrentScreen} onLogin={() => setCurrentScreen('home_dashboard')} />;
      case 'register_screen':
        return <RegisterScreen onNavigate={setCurrentScreen} onRegister={() => setCurrentScreen('home_dashboard')} />;
      case 'forgot_password_screen':
        return <ForgotPasswordScreen onNavigate={setCurrentScreen} />;
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
      case 'book_appointment':
        return (
          <BookAppointmentScreen
            onBook={handleBookAppointment}
            onNavigate={setCurrentScreen}
          />
        );
      case 'medications':
        return (
          <MedicationsScreen
            medications={medications}
            onToggleMedication={handleToggleMedication}
            onAddMedication={handleAddMedication}
          />
        );
      case 'medical_records':
        return (
          <MedicalRecordsScreen
            records={records}
            onAddRecord={handleAddRecord}
            onNavigate={setCurrentScreen}
            onSelectRecord={setSelectedRecord}
          />
        );
      case 'medical_records_empty':
        return <MedicalRecordsEmptyScreen onNavigate={setCurrentScreen} />;
      case 'record_details':
        return <RecordDetailsScreen record={selectedRecord} onNavigate={setCurrentScreen} />;
      case 'upload_success':
        return <UploadSuccessScreen onNavigate={setCurrentScreen} />;
      case 'emergency_sos':
        return <EmergencySOSScreen userProfile={userProfile} onNavigate={setCurrentScreen} />;
      case 'health_reports':
        return <HealthReportsScreen vitals={vitals} onNavigate={setCurrentScreen} />;
      case 'notifications_updated':
        return (
          <NotificationsScreen
            notifications={notifications}
            onMarkAllRead={handleMarkAllRead}
            onNavigate={setCurrentScreen}
          />
        );
      case 'user_profile':
        return (
          <UserProfileScreen
            userProfile={userProfile}
            onLogout={() => setCurrentScreen('welcome_screen')}
            onNavigate={setCurrentScreen}
          />
        );
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
    <div className="w-full flex justify-center py-6 bg-slate-100 min-h-screen">
      <MobileShell
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
        notificationsCount={unreadNotifsCount}
        userProfile={userProfile}
      >
        {renderActiveScreen()}
      </MobileShell>
    </div>
  );
}
