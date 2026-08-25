'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';

export type SupportedLanguage = 'en' | 'hi' | 'mr';

export interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, fallback?: string) => string;
}

export const DICTIONARY: Record<SupportedLanguage, Record<string, any>> = {
  en: {
    appName: 'CuraTrack',
    nationalCareTag: 'National Care Ecosystem',
    nav: {
      dashboard: 'My Health Dashboard',
      selfTriage: 'Emergency Self-Triage',
      telemedicine: 'Consult Doctor',
      records: 'My Medical Records',
      benefits: 'Gov Schemes & PMJAY',
      alerts: 'Health Alerts',
      profile: 'Medical ID & Passport',
      doctorQueue: 'Clinical OPD Queue',
      doctorTriage: 'Triage Alerts',
      doctorSchedule: 'Consultation Schedule',
      referrals: 'Referral Pipeline',
      drugChecker: 'Drug Safety',
      patientRecords: 'Patient Records',
      doctorProfile: 'Doctor Profile',
      fhwCatchment: 'ASHA Catchment Center',
      communityTriage: 'Community Triage',
      villageReferrals: 'Village Referrals',
      assistedTeleconsult: 'Assisted Teleconsult',
      outbreakAlerts: 'Outbreak Alerts',
      ashaProfile: 'ASHA Profile',
      facilityOps: 'Facility Operations',
      facilityArchive: 'Facility Archive',
      managerProfile: 'Manager Profile',
      districtAdmin: 'District Admin',
      facilityOversight: 'Facility Oversight',
      referralAudit: 'Referral Audit Track',
      catchmentMetrics: 'Catchment Metrics',
      adminProfile: 'Admin Profile',
      logout: 'Sign Out',
      activeRole: 'Active Role',
      switchRole: 'Switch Role'
    },
    topNav: {
      hello: 'Hello',
      user: 'User',
      notifications: 'Notifications',
      profile: 'Profile'
    },
    dashboard: {
      title: 'Personal Health Portal',
      subtitle: 'Longitudinal health passport, vitals monitoring & scheme benefits',
      quickActions: 'Quick Health Actions',
      emergencyTriage: 'Emergency Self-Triage',
      emergencyTriageDesc: 'Protocol-driven red-flag assessment & 108 ambulance dispatch',
      consultDoctor: 'Book Teleconsultation',
      consultDoctorDesc: 'Connect live with Sub-District Hospital medical officers',
      viewRecords: 'Health Records (EHR)',
      viewRecordsDesc: 'Diagnoses, prescriptions, and diagnostic lab reports',
      pmjayCard: 'PMJAY Ayushman Card',
      pmjayCardDesc: '₹5 Lakh free health cover at empaneled hospitals',
      vitalsOverview: 'Vitals & Activity Overview',
      heartRate: 'Heart Rate',
      bloodPressure: 'Blood Pressure',
      oxygenSaturation: 'Oxygen (SpO2)',
      bloodSugar: 'Blood Glucose',
      activePrescriptions: 'Active Medications',
      noPrescriptions: 'No active prescriptions on file.',
      upcomingAppointments: 'Upcoming Consultations',
      noAppointments: 'No upcoming appointments scheduled.'
    },
    triage: {
      title: 'Digital Triage & Red-Flag Assessment',
      subtitle: 'Protocol-driven emergency detection and clinical prioritization',
      dangerSignsTitle: 'Community Danger Signs Screening',
      dangerSignsSubtitle: 'Frontline protocol for immediate emergency escalation',
      severeBreathlessness: 'Severe Breathlessness / Inability to speak in full sentences',
      chestPain: 'Crushing Retrosternal Chest Pain radiating to left arm or jaw',
      alteredConsciousness: 'Altered Mental Status, Unconsciousness, or Seizures',
      severeBleeding: 'Active Severe Hemorrhage or Postpartum Bleeding',
      feverStiffNeck: 'High Fever (>39.5°C) with Neck Rigidity or Purple Rash',
      severeAbdominalPain: 'Acute Rigid Abdomen / Suspected Perforation or Ectopic Pregnancy',
      highRiskPregnancy: 'High-Risk Pregnancy (Preeclampsia BP > 160/100, Convulsions, Reduced FHR)',
      emergencyEscalateBtn: '🚨 Initiate 108 Emergency Evacuation',
      requestTeleconsultBtn: '📞 Connect Assisted Teleconsultation with MO',
      startClinicalAssessment: 'Begin Comprehensive Clinical Assessment',
      selfTriageTitle: 'Emergency Self-Triage Assessment',
      selfTriageSubtitle: 'Answer simple health questions to get instant emergency routing'
    },
    referrals: {
      title: 'Inter-Facility Referral Pipeline',
      subtitle: 'End-to-end tracking across Sub-Centres, PHCs, CHCs, and District Hospitals',
      incomingTitle: 'Incoming Referrals Queue',
      createReferral: 'Generate Referral Pass',
      allReferrals: 'All Active Referrals',
      acceptAction: 'Accept Referral',
      inTransitAction: 'Mark In Transit (108)',
      arrivedAction: 'Mark Patient Arrived',
      consultedAction: 'Start Consultation',
      completedAction: 'Complete & Discharge',
      emergencyDelayedBadge: '🔴 EMERGENCY REFERRAL DELAYED (SLA BREACH)',
      urgencyEmergency: 'EMERGENCY',
      urgencyUrgent: 'URGENT',
      urgencyRoutine: 'ROUTINE',
      filterUrgency: 'Filter by Urgency',
      filterStatus: 'Filter by Status',
      referralToken: 'Referral Token',
      patientName: 'Patient Name',
      referringFacility: 'Referring Facility',
      destinationFacility: 'Destination Facility',
      specialty: 'Specialty',
      clinicalReason: 'Clinical Reason',
      status: 'Status',
      actions: 'Actions',
      noReferrals: 'No referrals match the current filter criteria.'
    },
    fhw: {
      catchmentTitle: 'ASHA Catchment Population Center',
      catchmentSubtitle: 'Frontline maternal, child immunization, NCD & communicable disease management',
      registeredBeneficiaries: 'Registered High-Risk Beneficiaries',
      highRiskAlerts: 'High-Risk Vulnerability Alerts',
      followupTasks: 'Doctor-Assigned Field Follow-ups',
      followupSubtitle: 'Closed-loop home visits requested by hospital medical officers',
      recordVisit: 'Record Home Visit',
      markCompleted: 'Mark Task Completed',
      assistedTeleconsult: 'Initiate Assisted Teleconsultation',
      assignTask: 'Assign ASHA Follow-up Action',
      dangerSignsBtn: 'Danger Signs',
      teleconsultMO: 'Teleconsult MO',
      registerBeneficiary: 'Enroll Rural Beneficiary',
      allCategories: 'All Categories',
      maternalANC: 'Maternal ANC',
      childImmunization: 'Child Immunization',
      ncdChronic: 'NCD Chronic',
      tbCommunicable: 'TB / Communicable',
      allRisks: 'All Risk Levels',
      highRisk: 'High Risk (Urgent)',
      moderateRisk: 'Moderate Risk',
      lowRisk: 'Low Risk',
      homeVisitOutcome: 'Record Home Visit Outcome',
      clinicalOutcome: 'Clinical Outcome',
      observations: 'ASHA Field Observations & Visit Notes',
      submitTask: 'Submit & Close Task'
    },
    doctor: {
      workspaceTitle: 'Clinical OPD & Teleconsultation Workspace',
      dutyShift: 'On Duty (Morning Shift 08:00 - 14:00)',
      dutyRoster: 'Duty Roster',
      startTeleconsult: 'Start Teleconsult',
      patientsInQueue: 'Patients in OPD Queue',
      completedToday: 'Completed Today',
      edlPrescriptions: 'EDL Prescriptions',
      labOrdersPending: 'Lab Orders Pending',
      liveQueue: 'Live Outpatient Queue',
      selectPatientPrompt: 'Select patient to load clinical chart & encounter',
      searchPatient: 'Search patient name, token or complaint...',
      tabAll: 'ALL',
      tabWaiting: 'WAITING',
      tabEmergency: 'EMERGENCY',
      tabTeleconsult: 'TELECONSULT',
      tabReferrals: 'Inbound Referrals',
      tabCompleted: 'COMPLETED',
      soapNotesTitle: 'Clinical Encounter & SOAP Documentation',
      subjectiveObjective: 'Subjective Complaint & Objective Findings',
      diagnosis: 'Provisional Diagnosis',
      prescriptionsTitle: 'Essential Drug List (EDL) e-Prescription',
      submitEncounter: 'Submit Encounter & Order EDL Drugs',
      assignAshaFollowup: 'Assign ASHA Follow-up',
      referPatient: 'Refer Patient',
      patientRecord: 'Patient Record',
      launchTeleconsult: 'Launch Teleconsult',
      inpatientBeds: 'Inpatient Bed Availability',
      medicineStockAlerts: 'EDL Medicine Stock Alerts'
    },
    facility: {
      title: 'Facility Operations & Bed Matrix',
      subtitle: 'Real-time bed occupancy, EDL medicine inventory and lab operations',
      totalBeds: 'Total Inpatient Beds',
      occupiedBeds: 'Occupied Beds',
      availableBeds: 'Available Beds',
      occupancyRate: 'Occupancy Rate',
      edlStockOverview: 'Essential Medicines List (EDL) Stock',
      lowStockAlerts: 'Low Stock Alerts',
      orderMedicines: 'Order Drug Replenishment'
    },
    actions: {
      save: 'Save Changes',
      cancel: 'Cancel',
      submit: 'Submit',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      close: 'Close',
      accept: 'Accept',
      reject: 'Reject',
      confirm: 'Confirm',
      search: 'Search...',
      filter: 'Filter',
      reset: 'Reset Filters',
      refresh: 'Refresh',
      loading: 'Loading...'
    },
    common: {
      emergency: 'EMERGENCY',
      urgent: 'URGENT',
      routine: 'ROUTINE',
      active: 'Active',
      completed: 'Completed',
      pending: 'Pending',
      status: 'Status',
      actions: 'Actions',
      date: 'Date',
      time: 'Time',
      doctor: 'Doctor',
      patient: 'Patient',
      asha: 'ASHA Worker',
      facility: 'Facility',
      yes: 'Yes',
      no: 'No',
      success: 'Operation Successful',
      error: 'An error occurred'
    }
  },
  hi: {
    appName: 'क्यूराट्रैक (CuraTrack)',
    nationalCareTag: 'राष्ट्रीय ग्रामीण स्वास्थ्य प्रणाली',
    nav: {
      dashboard: 'मेरा स्वास्थ्य डैशबोर्ड',
      selfTriage: 'आपातकालीन स्व-जांच (Triage)',
      telemedicine: 'डॉक्टर से परामर्श (ई-संजीवनी)',
      records: 'मेरे स्वास्थ्य रिकॉर्ड (EHR)',
      benefits: 'सरकारी योजनाएं व पीएमजेएवाई',
      alerts: 'स्वास्थ्य व मौसमी अलर्ट',
      profile: 'मेडिकल आईडी व आभा पासपोर्ट',
      doctorQueue: 'ओपीडी रोगी कतार',
      doctorTriage: 'ट्राइएज आपातकालीन अलर्ट',
      doctorSchedule: 'परामर्श समय-सारणी',
      referrals: 'रेफरल प्रबंधन प्रणाली',
      drugChecker: 'दवा सुरक्षा जांच',
      patientRecords: 'रोगी स्वास्थ्य रिकॉर्ड',
      doctorProfile: 'डॉक्टर प्रोफ़ाइल',
      fhwCatchment: 'आशा / स्वास्थ्य कार्यकर्ता केंद्र',
      communityTriage: 'सामुदायिक ट्राइएज',
      villageReferrals: 'ग्रामीण रेफरल',
      assistedTeleconsult: 'सहायक टेली-परामर्श',
      outbreakAlerts: 'महामारी व मौसमी अलर्ट',
      ashaProfile: 'आशा कार्यकर्ता प्रोफ़ाइल',
      facilityOps: 'अस्पताल प्रबंधन व बेड',
      facilityArchive: 'अस्पताल अभिलेखागार',
      managerProfile: 'प्रबंधक प्रोफ़ाइल',
      districtAdmin: 'जिला प्रशासनिक डैशबोर्ड',
      facilityOversight: 'अस्पताल निगरानी',
      referralAudit: 'रेफरल ऑडिट ट्रैक',
      catchmentMetrics: 'कार्यक्षेत्र रिपोर्ट',
      adminProfile: 'प्रशासक प्रोफ़ाइल',
      logout: 'लॉग आउट',
      activeRole: 'सक्रिय भूमिका',
      switchRole: 'भूमिका बदलें'
    },
    topNav: {
      hello: 'नमस्ते',
      user: 'उपयोगकर्ता',
      notifications: 'सूचनाएं',
      profile: 'प्रोफ़ाइल'
    },
    dashboard: {
      title: 'व्यक्तिगत स्वास्थ्य पोर्टल',
      subtitle: 'दीर्घकालिक स्वास्थ्य रिकॉर्ड, विटल्स निगरानी एवं सरकारी योजना लाभ',
      quickActions: 'त्वरित स्वास्थ्य सेवाएं',
      emergencyTriage: 'आपातकालीन स्व-जांच',
      emergencyTriageDesc: 'प्रोटोकॉल-आधारित खतरा जांच एवं १०८ एम्बुलेंस प्रेषण',
      consultDoctor: 'टेली-परामर्श बुक करें',
      consultDoctorDesc: 'उप-जिला अस्पताल के चिकित्सा अधिकारी से सीधे जुड़ें',
      viewRecords: 'स्वास्थ्य रिकॉर्ड (EHR)',
      viewRecordsDesc: 'निदान, डॉक्टर पर्चे और प्रयोगशाला जांच रिपोर्ट',
      pmjayCard: 'आयुष्मान भारत (PMJAY)',
      pmjayCardDesc: 'सूचीबद्ध अस्पतालों में ₹5 लाख तक का निःशुल्क उपचार',
      vitalsOverview: 'शारीरिक मापदंड (Vitals) एवं गतिविधि',
      heartRate: 'हृदय गति (Heart Rate)',
      bloodPressure: 'रक्तचाप (Blood Pressure)',
      oxygenSaturation: 'ऑक्सीजन (SpO2)',
      bloodSugar: 'रक्त शर्करा (Blood Glucose)',
      activePrescriptions: 'सक्रिय दवाइयां',
      noPrescriptions: 'वर्तमान में कोई सक्रिय दवा दर्ज नहीं है।',
      upcomingAppointments: 'आगामी परामर्श',
      noAppointments: 'कोई आगामी परामर्श निर्धारित नहीं है।'
    },
    triage: {
      title: 'डिजिटल ट्राइएज एवं आपातकालीन जांच',
      subtitle: 'प्रोटोकॉल-आधारित आपातकालीन पहचान एवं प्राथमिकता निर्धारण',
      dangerSignsTitle: 'सामुदायिक खतरे के लक्षण (ASHA Danger Signs)',
      dangerSignsSubtitle: 'तत्काल आपातकालीन सहायता के लिए प्राथमिक जांच',
      severeBreathlessness: 'गंभीर सांस फूलना / बोलने में अत्यधिक कठिनाई',
      chestPain: 'सीने में असहनीय दर्द जो बाएं हाथ या जबड़े तक फैले',
      alteredConsciousness: 'बेहोशी, भ्रम या बार-बार दौरे पड़ना',
      severeBleeding: 'अत्यधिक रक्तस्राव या प्रसवोत्तर गंभीर रक्तस्राव',
      feverStiffNeck: 'तेज बुखार (>39.5°C) के साथ गर्दन में अकड़न',
      severeAbdominalPain: 'पेट में गंभीर असहनीय दर्द / आपातकालीन स्थिति',
      highRiskPregnancy: 'उच्च जोखिम गर्भावस्था (रक्तचाप > 160/100, सूजन, दौरे)',
      emergencyEscalateBtn: '🚨 108 एम्बुलेंस आपातकालीन प्रेषण',
      requestTeleconsultBtn: '📞 चिकित्सा अधिकारी से टेली-परामर्श जोड़ें',
      startClinicalAssessment: 'विस्तृत नैदानिक जांच प्रारंभ करें',
      selfTriageTitle: 'आपातकालीन स्व-मूल्यांकन जांच',
      selfTriageSubtitle: 'आपातकालीन सहायता के लिए सरल स्वास्थ्य प्रश्नों के उत्तर दें'
    },
    referrals: {
      title: 'इंटर-फैसिलिटी रेफरल प्रबंधन प्रणाली',
      subtitle: 'उप-केंद्र, प्राथमिक स्वास्थ्य केंद्र, सामुदायिक स्वास्थ्य केंद्र एवं जिला अस्पताल के बीच निर्बाध रेफरल ट्रैकिंग',
      incomingTitle: 'आने वाले रेफरल (Incoming Queue)',
      createReferral: 'नया रेफरल पास बनाएं',
      allReferrals: 'सभी सक्रिय रेफरल',
      acceptAction: 'रेफरल स्वीकार करें',
      inTransitAction: 'रवाना करें (108 एम्बुलेंस)',
      arrivedAction: 'रोगी अस्पताल पहुंचा',
      consultedAction: 'परामर्श शुरू करें',
      completedAction: 'उपचार पूर्ण / डिस्चार्ज',
      emergencyDelayedBadge: '🔴 आपातकालीन रेफरल में अत्यधिक देरी (SLA उल्लंघन)',
      urgencyEmergency: 'आपातकालीन (EMERGENCY)',
      urgencyUrgent: 'अति आवश्यक (URGENT)',
      urgencyRoutine: 'सामान्य (ROUTINE)',
      filterUrgency: 'आपातकालीनता अनुसार फ़िल्टर',
      filterStatus: 'स्थिति अनुसार फ़िल्टर',
      referralToken: 'रेफरल टोकन',
      patientName: 'रोगी का नाम',
      referringFacility: 'भेजने वाला अस्पताल',
      destinationFacility: 'गंतव्य अस्पताल',
      specialty: 'चिकित्सा विभाग',
      clinicalReason: 'रेफरल का कारण',
      status: 'स्थिति',
      actions: 'कार्रवाई',
      noReferrals: 'वर्तमान फ़िल्टर में कोई रेफरल उपलब्ध नहीं है।'
    },
    fhw: {
      catchmentTitle: 'आशा कार्यक्षेत्र लाभार्थी केंद्र',
      catchmentSubtitle: 'मातृ स्वास्थ्य, बाल टीकाकरण, असंचारी रोग एवं संक्रामक रोग प्रबंधन',
      registeredBeneficiaries: 'पंजीकृत उच्च-जोखिम लाभार्थी',
      highRiskAlerts: 'उच्च-जोखिम स्वास्थ्य चेतावनी',
      followupTasks: 'डॉक्टर द्वारा सौंपे गए फॉलो-अप कार्य',
      followupSubtitle: 'अस्पताल के डॉक्टरों द्वारा सौंपे गए गृह भेंट कार्य',
      recordVisit: 'गृह भेंट परिणाम दर्ज करें',
      markCompleted: 'कार्य पूर्ण चिह्नित करें',
      assistedTeleconsult: 'सहायक टेली-परामर्श शुरू करें',
      assignTask: 'आशा कार्यकर्ता को फॉलो-अप सौंपें',
      dangerSignsBtn: 'खतरे के लक्षण',
      teleconsultMO: 'डॉक्टर से संपर्क',
      registerBeneficiary: 'नया ग्रामीण लाभार्थी पंजीकृत करें',
      allCategories: 'सभी श्रेणियां',
      maternalANC: 'मातृ स्वास्थ्य (ANC)',
      childImmunization: 'बाल टीकाकरण',
      ncdChronic: 'दीर्घकालिक रोग (NCD)',
      tbCommunicable: 'टीबी / संक्रामक रोग',
      allRisks: 'सभी जोखिम स्तर',
      highRisk: 'उच्च जोखिम (तत्काल)',
      moderateRisk: 'मध्यम जोखिम',
      lowRisk: 'सामान्य जोखिम',
      homeVisitOutcome: 'गृह भेंट परिणाम दर्ज करें',
      clinicalOutcome: 'स्वास्थ्य परिणाम',
      observations: 'आशा कार्यकर्ता की टिप्पणियां एवं निरीक्षण',
      submitTask: 'जतन करें एवं कार्य पूर्ण करें'
    },
    doctor: {
      workspaceTitle: 'क्लिनिकल ओपीडी एवं टेली-परामर्श कार्यक्षेत्र',
      dutyShift: 'ड्यूटी पर (सुबह की पाली 08:00 - 14:00)',
      dutyRoster: 'ड्यूटी रोस्टर',
      startTeleconsult: 'टेली-परामर्श शुरू करें',
      patientsInQueue: 'ओपीडी कतार में मरीज',
      completedToday: 'आज पूर्ण हुए मरीज',
      edlPrescriptions: 'आवश्यक दवाइयां (EDL)',
      labOrdersPending: 'जांच आदेश लंबित',
      liveQueue: 'सक्रिय ओपीडी रोगी कतार',
      selectPatientPrompt: 'रोगी का विवरण एवं पर्चा खोलने के लिए चयन करें',
      searchPatient: 'रोगी का नाम, टोकन या बीमारी खोजें...',
      tabAll: 'सभी (ALL)',
      tabWaiting: 'प्रतीक्षारत (WAITING)',
      tabEmergency: 'आपातकालीन (EMERGENCY)',
      tabTeleconsult: 'टेली-परामर्श (TELECONSULT)',
      tabReferrals: 'आने वाले रेफरल',
      tabCompleted: 'पूर्ण (COMPLETED)',
      soapNotesTitle: 'नैदानिक मूल्यांकन एवं SOAP रिकॉर्ड',
      subjectiveObjective: 'रोगी की शिकायत एवं शारीरिक परीक्षण',
      diagnosis: 'संभावित निदान (Provisional Diagnosis)',
      prescriptionsTitle: 'आवश्यक दवा सूची (EDL) ई-पर्चा',
      submitEncounter: 'पर्चा सुरक्षित करें एवं दवा स्टॉक घटाएं',
      assignAshaFollowup: 'आशा कार्यकर्ता को फॉलो-अप सौंपें',
      referPatient: 'मरीज रेफर करें',
      patientRecord: 'स्वास्थ्य रिकॉर्ड देखें',
      launchTeleconsult: 'टेली-परामर्श शुरू करें',
      inpatientBeds: 'अस्पताल बेड उपलब्धता',
      medicineStockAlerts: 'आवश्यक दवा स्टॉक चेतावनी'
    },
    facility: {
      title: 'अस्पताल संचालन एवं बेड प्रबंधन',
      subtitle: 'रियल-टाइम बेड उपलब्धता, आवश्यक दवा सूची (EDL) एवं लैब संचालन',
      totalBeds: 'कुल बेड',
      occupiedBeds: 'भरे हुए बेड',
      availableBeds: 'उपलब्ध खाली बेड',
      occupancyRate: 'ऑक्यूपेंसी दर',
      edlStockOverview: 'आवश्यक दवा सूची (EDL) स्टॉक',
      lowStockAlerts: 'कम स्टॉक चेतावनी',
      orderMedicines: 'दवा पुनःआपूर्ति आदेश दें'
    },
    actions: {
      save: 'सुरक्षित करें',
      cancel: 'रद्द करें',
      submit: 'जमा करें',
      delete: 'हटाएं',
      edit: 'संपादित करें',
      view: 'देखें',
      close: 'बंद करें',
      accept: 'स्वीकार करें',
      reject: 'अस्वीकार करें',
      confirm: 'पुष्टि करें',
      search: 'खोजें...',
      filter: 'फ़िल्टर',
      reset: 'फ़िल्टर हटाएं',
      refresh: 'ताज़ा करें',
      loading: 'लोड हो रहा है...'
    },
    common: {
      emergency: 'आपातकालीन',
      urgent: 'अति आवश्यक',
      routine: 'सामान्य',
      active: 'सक्रिय',
      completed: 'पूर्ण',
      pending: 'लंबित',
      status: 'स्थिति',
      actions: 'कार्रवाई',
      date: 'दिनांक',
      time: 'समय',
      doctor: 'डॉक्टर',
      patient: 'रोगी',
      asha: 'आशा कार्यकर्ता',
      facility: 'अस्पताल',
      yes: 'हाँ',
      no: 'नहीं',
      success: 'सफलतापूर्वक संपन्न',
      error: 'त्रुटि उत्पन्न हुई'
    }
  },
  mr: {
    appName: 'क्युराट्रॅक (CuraTrack)',
    nationalCareTag: 'राष्ट्रीय सार्वजनिक आरोग्य परिसंस्था',
    nav: {
      dashboard: 'माझे आरोग्य डॅशबोर्ड',
      selfTriage: 'तातडीची स्व-तपासणी (Triage)',
      telemedicine: 'ई-संजीवनी टेली-सल्ला',
      records: 'माझ्या आरोग्य नोंदी (EHR)',
      benefits: 'शासकीय योजना व महात्मा फुले जन आरोग्य',
      alerts: 'साथरोग व हंगामी इशारे',
      profile: 'वैद्यकीय ओळख व आभा पासपोर्ट',
      doctorQueue: 'ओपीडी रुग्ण रांग',
      doctorTriage: 'ट्रायज तातडीच्या सूचना',
      doctorSchedule: 'तपासणी वेळापत्रक',
      referrals: 'रुग्ण रेफरल व्यवस्थापन',
      drugChecker: 'औषध सुरक्षा तपासणी',
      patientRecords: 'रुग्ण आरोग्य नोंदी',
      doctorProfile: 'डॉक्टर प्रोफाईल',
      fhwCatchment: 'आशा / आरोग्य सेविका केंद्र',
      communityTriage: 'समुदाय ट्रायज',
      villageReferrals: 'ग्रामीण रेफरल',
      assistedTeleconsult: 'सहाय्यक टेली-सल्ला',
      outbreakAlerts: 'साथरोग इशारे',
      ashaProfile: 'आशा सेविका प्रोफाईल',
      facilityOps: 'रुग्णालय व खाटांची माहिती',
      facilityArchive: 'रुग्णालय अभिलेखागार',
      managerProfile: 'व्यवस्थापक प्रोफाईल',
      districtAdmin: 'जिल्हा प्रशासकीय डॅशबोर्ड',
      facilityOversight: 'रुग्णालय देखरेख',
      referralAudit: 'रेफरल ऑडिट ट्रॅक',
      catchmentMetrics: 'कार्यक्षेत्र अहवाल',
      adminProfile: 'प्रशासक प्रोफाईल',
      logout: 'लॉग आउट',
      activeRole: 'सक्रिय भूमिका',
      switchRole: 'भूमिका बदला'
    },
    topNav: {
      hello: 'नमस्कार',
      user: 'वापरकर्ता',
      notifications: 'सूचना',
      profile: 'प्रोफाईल'
    },
    dashboard: {
      title: 'वैयक्तिक आरोग्य पोर्टल',
      subtitle: 'दीर्घकालीन आरोग्य नोंदी, शारीरिक मापदंड व शासकीय योजनांचे लाभ',
      quickActions: 'जलद आरोग्य सेवा',
      emergencyTriage: 'तातडीची स्व-तपासणी',
      emergencyTriageDesc: 'धोक्याची लक्षणे तपासणी व १०८ रुग्णवाहिका तात्काळ बोलवा',
      consultDoctor: 'डॉक्टरांचा सल्ला घ्या',
      consultDoctorDesc: 'उप-जिल्हा रुग्णालयाच्या वैद्यकीय अधिकाऱ्यांशी थेट जोडा',
      viewRecords: 'आरोग्य नोंदी (EHR)',
      viewRecordsDesc: 'निदान, डॉक्टरांची औषध चिठ्ठी व प्रयोगशाळा तपासणी अहवाल',
      pmjayCard: 'महात्मा फुले जन आरोग्य / PMJAY',
      pmjayCardDesc: 'मान्यताप्राप्त रुग्णालयांत ₹५ लाखांपर्यंत मोफत उपचार',
      vitalsOverview: 'शारीरिक मापदंड (Vitals) व हालचाली',
      heartRate: 'हृदयाचे ठोके (Heart Rate)',
      bloodPressure: 'रक्तदाब (Blood Pressure)',
      oxygenSaturation: 'ऑक्सिजन (SpO2)',
      bloodSugar: 'रक्त शर्करा (Blood Glucose)',
      activePrescriptions: 'सुरू असलेली औषधे',
      noPrescriptions: 'सध्या कोणतीही सक्रिय औषध नोंद नाही.',
      upcomingAppointments: 'नियोजित तपासण्या',
      noAppointments: 'कोणतीही नियोजित तपासणी नाही.'
    },
    triage: {
      title: 'डिजिटल ट्रायज व तात्काळ तपासणी',
      subtitle: 'प्रोटोकॉल-आधारित धोक्याची लक्षणे व रुग्ण वर्गीकरण',
      dangerSignsTitle: 'समुदाय धोक्याची लक्षणे (ASHA Danger Signs)',
      dangerSignsSubtitle: 'तातडीच्या उपचारांसाठी प्राथमिक तपासणी',
      severeBreathlessness: 'तीव्र श्वास घेण्यास त्रास / बोलता न येणे',
      chestPain: 'छातीत असह्य वेदना व डाव्या हाताकडे जाणारी कळ',
      alteredConsciousness: 'शुद्ध हरपणे, चक्कर किंवा फेफरे येणे',
      severeBleeding: 'अति रक्तस्राव किंवा बाळंतपणानंतरचा गंभीर रक्तस्राव',
      feverStiffNeck: 'तीव्र ताप (>39.5°C) व मान आखडणे',
      severeAbdominalPain: 'पोटात तीव्र कळा / तातडीची शस्त्रक्रिया शक्यता',
      highRiskPregnancy: 'अति-धोकादायक गरोदरपण (रक्तदाब > 160/100, पायावर सूज)',
      emergencyEscalateBtn: '🚨 १०८ रुग्णवाहिका तात्काळ बोलवा',
      requestTeleconsultBtn: '📞 वैद्यकीय अधिकाऱ्यांशी टेली-सल्ला जोडा',
      startClinicalAssessment: 'तपशीलवार वैद्यकीय तपासणी सुरू करा',
      selfTriageTitle: 'तातडीची स्व-तपासणी मूल्यांकन',
      selfTriageSubtitle: 'तातडीच्या मदतीसाठी साध्या आरोग्य प्रश्नांची उत्तरे द्या'
    },
    referrals: {
      title: 'आंतर-रुग्णालय रेफरल व्यवस्थापन यंत्रणा',
      subtitle: 'उप-केंद्र, प्राथमिक आरोग्य केंद्र, ग्रामीण रुग्णालय व जिल्हा रुग्णालय यांच्यात अखंड समन्वय',
      incomingTitle: 'दाखल होणारे रेफरल्स (Incoming Queue)',
      createReferral: 'नवीन रेफरल पास काढा',
      allReferrals: 'सर्व सक्रिय रेफरल्स',
      acceptAction: 'रेफरल स्वीकारा',
      inTransitAction: '१०८ रुग्णवाहिकेतून रवाना',
      arrivedAction: 'रुग्ण दाखल झाला',
      consultedAction: 'तपासणी सुरू करा',
      completedAction: 'उपचार पूर्ण / डिस्चार्ज',
      emergencyDelayedBadge: '🔴 आणीबाणी रेफरल विलंबित (SLA उल्लंघन)',
      urgencyEmergency: 'आणीबाणी (EMERGENCY)',
      urgencyUrgent: 'तातडीचे (URGENT)',
      urgencyRoutine: 'नेहमीचे (ROUTINE)',
      filterUrgency: 'तातडीनुसार फिल्टर',
      filterStatus: 'स्थितीनुसार फिल्टर',
      referralToken: 'रेफरल टोकन',
      patientName: 'रुग्णाचे नाव',
      referringFacility: 'पाठवणारे रुग्णालय',
      destinationFacility: 'गंतव्य रुग्णालय',
      specialty: 'वैद्यकीय विभाग',
      clinicalReason: 'रेफरलचे कारण',
      status: 'स्थिती',
      actions: 'कृती',
      noReferrals: 'सध्याच्या फिल्टरनुसार कोणतेही रेफरल्स उपलब्ध नाहीत.'
    },
    fhw: {
      catchmentTitle: 'आशा कार्यक्षेत्र लाभार्थी केंद्र',
      catchmentSubtitle: 'माता आरोग्य, बाल लसीकरण, असंसर्गजन्य रोग व संसर्गजन्य आजार नियंत्रण',
      registeredBeneficiaries: 'नोंदणीकृत अतिजोखमीचे लाभार्थी',
      highRiskAlerts: 'आरोग्य जोखीम सूचना',
      followupTasks: 'डॉक्टरांनी दिलेली फॉलो-अप कामे',
      followupSubtitle: 'रुग्णालयातील डॉक्टरांनी सुचवलेल्या गृहभेटी',
      recordVisit: 'गृहभेटीची नोंद करा',
      markCompleted: 'काम पूर्ण झाले',
      assistedTeleconsult: 'सहाय्यक टेली-सल्ला सुरू करा',
      assignTask: 'आशा सेविकेला फॉलो-अप द्या',
      dangerSignsBtn: 'धोक्याची लक्षणे',
      teleconsultMO: 'डॉक्टरांशी संपर्क',
      registerBeneficiary: 'नवीन ग्रामीण लाभार्थी नोंदवा',
      allCategories: 'सर्व श्रेणी',
      maternalANC: 'माता आरोग्य (ANC)',
      childImmunization: 'बाल लसीकरण',
      ncdChronic: 'दीर्घकालीन आजार (NCD)',
      tbCommunicable: 'टीबी / संसर्गजन्य रोग',
      allRisks: 'सर्व जोखीम स्तर',
      highRisk: 'अति जोखीम (तातडीने)',
      moderateRisk: 'मध्यम जोखीम',
      lowRisk: 'कमी जोखीम',
      homeVisitOutcome: 'गृहभेट तपासणी नोंदवा',
      clinicalOutcome: 'आरोग्य स्थिती',
      observations: 'आशा सेविकेची निरीक्षणे व नोंदी',
      submitTask: 'नोंद जतन करा व काम पूर्ण करा'
    },
    doctor: {
      workspaceTitle: 'क्लिनिकल ओपीडी व ई-संजीवनी कार्यक्षेत्र',
      dutyShift: 'ड्यूटीवर (सकाळची पाळी ०८:०० - १४:००)',
      dutyRoster: 'ड्यूटी रोस्टर',
      startTeleconsult: 'टेली-सल्ला सुरू करा',
      patientsInQueue: 'ओपीडी रांगेतील रुग्ण',
      completedToday: 'आज तपासलेले रुग्ण',
      edlPrescriptions: 'आवश्यक औषधे (EDL)',
      labOrdersPending: 'प्रयोगशाळा चाचण्या प्रलंबित',
      liveQueue: 'थेट ओपीडी रुग्ण रांग',
      selectPatientPrompt: 'रुग्णाची तपासणी व औषध चिठ्ठी उघडण्यासाठी निवडा',
      searchPatient: 'रुग्णाचे नाव, टोकन किंवा तक्रार शोधा...',
      tabAll: 'सर्व (ALL)',
      tabWaiting: 'प्रतीक्षेत (WAITING)',
      tabEmergency: 'आणीबाणी (EMERGENCY)',
      tabTeleconsult: 'टेली-सल्ला (TELECONSULT)',
      tabReferrals: 'दाखल होणारे रेफरल्स',
      tabCompleted: 'पूर्ण (COMPLETED)',
      soapNotesTitle: 'वैद्यकीय तपासणी व SOAP नोंदी',
      subjectiveObjective: 'रुग्णाची तक्रार व प्राथमिक तपासणी',
      diagnosis: 'संभाव्य निदान (Provisional Diagnosis)',
      prescriptionsTitle: 'आवश्यक औषध सूची (EDL) ई-प्रिस्क्रिप्शन',
      submitEncounter: 'तपासणी जतन करा व औषध साठा वजा करा',
      assignAshaFollowup: 'आशा सेविकेला फॉलो-अप द्या',
      referPatient: 'रुग्ण रेफर करा',
      patientRecord: 'आरोग्य नोंदी पहा',
      launchTeleconsult: 'टेली-सल्ला जोडा',
      inpatientBeds: 'रुग्णालय खाटांची उपलब्धता',
      medicineStockAlerts: 'औषध साठा इशारा'
    },
    facility: {
      title: 'रुग्णालय व्यवस्थापन व खाटांची माहिती',
      subtitle: 'खाटांची सद्यस्थिती, आवश्यक औषध साठा (EDL) व प्रयोगशाळा कामकाज',
      totalBeds: 'एकूण खाटा',
      occupiedBeds: 'भरलेल्या खाटा',
      availableBeds: 'उपलब्ध रिकाम्या खाटा',
      occupancyRate: 'खाटांचा वापर दर',
      edlStockOverview: 'आवश्यक औषध सूची (EDL) साठा',
      lowStockAlerts: 'कमी साठा इशारे',
      orderMedicines: 'नवीन औषध साठा मागवा'
    },
    actions: {
      save: 'जतन करा',
      cancel: 'रद्द करा',
      submit: 'सादर करा',
      delete: 'हटवा',
      edit: 'संपादित करा',
      view: 'पहा',
      close: 'बंद करा',
      accept: 'स्वीकारा',
      reject: 'नाकारा',
      confirm: 'पुष्टी करा',
      search: 'शोधा...',
      filter: 'फिल्टर',
      reset: 'फिल्टर काढा',
      refresh: 'ताजे करा',
      loading: 'लोड होत आहे...'
    },
    common: {
      emergency: 'आणीबाणी',
      urgent: 'तातडीचे',
      routine: 'नेहमीचे',
      active: 'सक्रिय',
      completed: 'पूर्ण',
      pending: 'प्रलंबित',
      status: 'स्थिती',
      actions: 'कृती',
      date: 'दिनांक',
      time: 'वेळ',
      doctor: 'डॉक्टर',
      patient: 'रुग्ण',
      asha: 'आशा सेविका',
      facility: 'रुग्णालय',
      yes: 'होय',
      no: 'नाही',
      success: 'यशस्वी झाले',
      error: 'त्रुटी आढळली'
    }
  }
};

const I18nContext = createContext<I18nContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('en');
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('curatrack_language') as SupportedLanguage;
      if (saved === 'hi' || saved === 'mr' || saved === 'en') {
        setLanguageState(saved);
      }
    } catch {}
    setIsHydrated(true);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'curatrack_language' && e.newValue) {
        const val = e.newValue as SupportedLanguage;
        if (val === 'hi' || val === 'mr' || val === 'en') {
          setLanguageState(val);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('curatrack_language', lang);
      window.dispatchEvent(new Event('curatrack_language_change'));
    } catch {}
  };

  const t = useMemo(() => {
    return (path: string, fallback?: string): string => {
      if (!path) return fallback || '';
      
      const keys = path.split('.');
      
      // 1. Try current language
      let curr: any = DICTIONARY[language];
      for (const k of keys) {
        if (curr && typeof curr === 'object' && k in curr) {
          curr = curr[k];
        } else {
          curr = undefined;
          break;
        }
      }
      if (typeof curr === 'string') return curr;

      // 2. Fallback to English
      if (language !== 'en') {
        let eng: any = DICTIONARY.en;
        for (const k of keys) {
          if (eng && typeof eng === 'object' && k in eng) {
            eng = eng[k];
          } else {
            eng = undefined;
            break;
          }
        }
        if (typeof eng === 'string') return eng;
      }

      // 3. Fallback parameter or last segment
      if (fallback) return fallback;
      return keys[keys.length - 1] || path;
    };
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
