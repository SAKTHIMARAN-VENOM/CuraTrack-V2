/**
 * CuraTrack Multilingual Localization Engine
 * Supports: English ('en'), Hindi ('hi'), Marathi ('mr')
 */

export type SupportedLanguage = 'en' | 'hi' | 'mr';

export interface TranslationDictionary {
  appName: string;
  nationalCareTag: string;
  nav: {
    dashboard: string;
    doctorQueue: string;
    telemedicine: string;
    records: string;
    referrals: string;
    fhwCatchment: string;
    facilityOps: string;
    benefits: string;
    alerts: string;
    triage: string;
    offlineHub: string;
    logout: string;
  };
  triage: {
    title: string;
    subtitle: string;
    dangerSignsTitle: string;
    dangerSignsSubtitle: string;
    severeBreathlessness: string;
    chestPain: string;
    alteredConsciousness: string;
    severeBleeding: string;
    feverStiffNeck: string;
    severeAbdominalPain: string;
    highRiskPregnancy: string;
    emergencyEscalateBtn: string;
    requestTeleconsultBtn: string;
    startClinicalAssessment: string;
  };
  referrals: {
    title: string;
    incomingTitle: string;
    createReferral: string;
    acceptAction: string;
    inTransitAction: string;
    arrivedAction: string;
    consultedAction: string;
    completedAction: string;
    emergencyDelayedBadge: string;
    urgencyEmergency: string;
    urgencyUrgent: string;
    urgencyRoutine: string;
  };
  fhw: {
    catchmentTitle: string;
    registeredBeneficiaries: string;
    highRiskAlerts: string;
    followupTasks: string;
    recordVisit: string;
    markCompleted: string;
    assistedTeleconsult: string;
    assignTask: string;
  };
  common: {
    search: string;
    filter: string;
    status: string;
    actions: string;
    save: string;
    cancel: string;
    loading: string;
    offlineMode: string;
    onlineMode: string;
    success: string;
    error: string;
  };
}

export const translations: Record<SupportedLanguage, TranslationDictionary> = {
  en: {
    appName: 'CuraTrack',
    nationalCareTag: 'National Care Ecosystem',
    nav: {
      dashboard: 'Dashboard',
      doctorQueue: 'Clinical OPD Queue',
      telemedicine: 'Teleconsultation',
      records: 'Patient Health Records',
      referrals: 'Referral Pipeline',
      fhwCatchment: 'ASHA Catchment Portal',
      facilityOps: 'Facility Operations',
      benefits: 'Benefits & PMJAY',
      alerts: 'Outbreak Alerts',
      triage: 'Digital Triage',
      offlineHub: 'Offline BLE Hub',
      logout: 'Sign Out'
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
      startClinicalAssessment: 'Begin Comprehensive Clinical Assessment'
    },
    referrals: {
      title: 'Inter-Facility Referral Pipeline',
      incomingTitle: 'Incoming Referrals Queue',
      createReferral: 'Generate Referral Pass',
      acceptAction: 'Accept Referral',
      inTransitAction: 'Mark In Transit (108)',
      arrivedAction: 'Mark Patient Arrived',
      consultedAction: 'Start Consultation',
      completedAction: 'Complete & Discharge',
      emergencyDelayedBadge: '🔴 EMERGENCY REFERRAL DELAYED (SLA BREACH)',
      urgencyEmergency: 'EMERGENCY',
      urgencyUrgent: 'URGENT',
      urgencyRoutine: 'ROUTINE'
    },
    fhw: {
      catchmentTitle: 'ASHA Catchment Population Center',
      registeredBeneficiaries: 'Registered High-Risk Beneficiaries',
      highRiskAlerts: 'High-Risk Vulnerability Alerts',
      followupTasks: 'Assigned Follow-up Tasks',
      recordVisit: 'Record Home Visit',
      markCompleted: 'Mark Task Completed',
      assistedTeleconsult: 'Initiate Assisted Teleconsultation',
      assignTask: 'Assign ASHA Follow-up Action'
    },
    common: {
      search: 'Search...',
      filter: 'Filter',
      status: 'Status',
      actions: 'Actions',
      save: 'Save Changes',
      cancel: 'Cancel',
      loading: 'Loading...',
      offlineMode: 'Offline Mode Active',
      onlineMode: 'Connected to Cloud',
      success: 'Operation Successful',
      error: 'An error occurred'
    }
  },
  hi: {
    appName: 'क्यूराट्रैक (CuraTrack)',
    nationalCareTag: 'राष्ट्रीय ग्रामीण स्वास्थ्य प्रणाली',
    nav: {
      dashboard: 'डैशबोर्ड',
      doctorQueue: 'ओपीडी रोगी कतार',
      telemedicine: 'टेली-परामर्श (ई-संजीवनी)',
      records: 'स्वास्थ्य रिकॉर्ड (EHR)',
      referrals: 'रेफरल प्रबंधन',
      fhwCatchment: 'आशा / स्वास्थ्य कार्यकर्ता पोर्टल',
      facilityOps: 'अस्पताल प्रबंधन व बेड',
      benefits: 'सरकारी योजनाएं व पीएमजेएवाई',
      alerts: 'महामारी व मौसमी अलर्ट',
      triage: 'डिजिटल ट्राइएज व खतरा जांच',
      offlineHub: 'ऑफलाइन ब्लूटूथ हब',
      logout: 'लॉग आउट'
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
      startClinicalAssessment: 'विस्तृत नैदानिक जांच प्रारंभ करें'
    },
    referrals: {
      title: 'इंटर-फैसिलिटी रेफरल प्रणाली',
      incomingTitle: 'आने वाले रेफरल (Incoming Queue)',
      createReferral: 'नया रेफरल पास बनाएं',
      acceptAction: 'रेफरल स्वीकार करें',
      inTransitAction: 'रवाना करें (108 एम्बुलेंस)',
      arrivedAction: 'रोगी अस्पताल पहुंचा',
      consultedAction: 'परामर्श शुरू करें',
      completedAction: 'उपचार पूर्ण / डिस्चार्ज',
      emergencyDelayedBadge: '🔴 आपातकालीन रेफरल में अत्यधिक देरी (SLA उल्लंघन)',
      urgencyEmergency: 'आपातकालीन (EMERGENCY)',
      urgencyUrgent: 'अति आवश्यक (URGENT)',
      urgencyRoutine: 'सामान्य (ROUTINE)'
    },
    fhw: {
      catchmentTitle: 'आशा कार्यक्षेत्र लाभार्थी केंद्र',
      registeredBeneficiaries: 'पंजीकृत उच्च-जोखिम लाभार्थी',
      highRiskAlerts: 'उच्च-जोखिम स्वास्थ्य चेतावनी',
      followupTasks: 'सौंपे गए फॉलो-अप कार्य',
      recordVisit: 'गृह भेंट परिणाम दर्ज करें',
      markCompleted: 'कार्य पूर्ण चिह्नित करें',
      assistedTeleconsult: 'सहायक टेली-परामर्श शुरू करें',
      assignTask: 'आशा कार्यकर्ता को फॉलो-अप सौंपें'
    },
    common: {
      search: 'खोजें...',
      filter: 'फ़िल्टर',
      status: 'स्थिति',
      actions: 'कार्रवाई',
      save: 'सुरक्षित करें',
      cancel: 'रद्द करें',
      loading: 'लोड हो रहा है...',
      offlineMode: 'ऑफलाइन मोड सक्रिय',
      onlineMode: 'क्लाउड से जुड़ा हुआ',
      success: 'सफलतापूर्वक संपन्न',
      error: 'त्रुटि उत्पन्न हुई'
    }
  },
  mr: {
    appName: 'क्युराट्रॅक (CuraTrack)',
    nationalCareTag: 'राष्ट्रीय सार्वजनिक आरोग्य परिसंस्था',
    nav: {
      dashboard: 'डॅशबोर्ड',
      doctorQueue: 'ओपीडी रुग्ण रांग',
      telemedicine: 'ई-संजीवनी टेली-सल्ला',
      records: 'आरोग्य नोंदी (EHR)',
      referrals: 'रुग्ण रेफरल व्यवस्थापन',
      fhwCatchment: 'आशा / आरोग्य सेविका केंद्र',
      facilityOps: 'रुग्णालय व खाटांची माहिती',
      benefits: 'शासकीय योजना व महात्मा फुले जन आरोग्य',
      alerts: 'साथरोग व हंगामी इशारे',
      triage: 'डिजिटल ट्रायज व तपासणी',
      offlineHub: 'ऑफलाइन ब्लूटूथ ट्रान्सफर',
      logout: 'लॉग आउट'
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
      startClinicalAssessment: 'तपशीलवार वैद्यकीय तपासणी सुरू करा'
    },
    referrals: {
      title: 'आंतर-रुग्णालय रेफरल यंत्रणा',
      incomingTitle: 'दाखल होणारे रेफरल्स (Incoming Queue)',
      createReferral: 'नवीन रेफरल पास काढा',
      acceptAction: 'रेफरल स्वीकारा',
      inTransitAction: '१०८ रुग्णवाहिकेतून रवाना',
      arrivedAction: 'रुग्ण दाखल झाला',
      consultedAction: 'तपासणी सुरू करा',
      completedAction: 'उपचार पूर्ण / डिस्चार्ज',
      emergencyDelayedBadge: '🔴 आणीबाणी रेफरल विलंबित (SLA उल्लंघन)',
      urgencyEmergency: 'आणीबाणी (EMERGENCY)',
      urgencyUrgent: 'तातडीचे (URGENT)',
      urgencyRoutine: 'नेहमीचे (ROUTINE)'
    },
    fhw: {
      catchmentTitle: 'आशा कार्यक्षेत्र लाभार्थी केंद्र',
      registeredBeneficiaries: 'नोंदणीकृत अतिजोखमीचे लाभार्थी',
      highRiskAlerts: 'आरोग्य जोखीम सूचना',
      followupTasks: 'गृहभेटी व फॉलो-अप कामे',
      recordVisit: 'गृहभेटीची नोंद करा',
      markCompleted: 'काम पूर्ण झाले',
      assistedTeleconsult: 'सहाय्यक टेली-सल्ला सुरू करा',
      assignTask: 'आशा सेविकेला फॉलो-अप द्या'
    },
    common: {
      search: 'शोधा...',
      filter: 'फिल्टर',
      status: 'स्थिती',
      actions: 'कृती',
      save: 'जतन करा',
      cancel: 'रद्द करा',
      loading: 'लोड होत आहे...',
      offlineMode: 'ऑफलाइन मोड सुरू आहे',
      onlineMode: 'इंटरनेट जोडलेले आहे',
      success: 'यशस्वी झाले',
      error: 'त्रुटी आढळली'
    }
  }
};

export function getStoredLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = localStorage.getItem('curatrack_language') as SupportedLanguage;
    if (saved === 'hi' || saved === 'mr' || saved === 'en') return saved;
  } catch {}
  return 'en';
}

export function setStoredLanguage(lang: SupportedLanguage) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('curatrack_language', lang);
    window.dispatchEvent(new Event('curatrack_language_change'));
  } catch {}
}

export function getTranslations(lang?: SupportedLanguage): TranslationDictionary {
  const currentLang = lang || getStoredLanguage();
  return translations[currentLang] || translations.en;
}
