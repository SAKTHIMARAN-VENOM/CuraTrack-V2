export const initialUserData = {
  name: "Sarah Jenkins",
  avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCP3mhycXoGXwl5sHBoVQzBtV6rvefYZucfAwk3JAM_lcohGoBGxY-WSQGw0ocroOuik3Sptv5VhhcH3nWRyJ7WHvWwAEfOuj-Z3CgDoy2_YRr6PFbE63yvRQeT4iNBpXqSdeQ0vk6nopDMp9IcqaqXzQ06i75R7z25-gQsqT4eMmGGlkSbChcxnbuuStqcENV_78lcljR4an08l_Nh-kgm19dOpYxrLZXYEld-yepOiuiYqwnxutuqBQ",
  email: "sarah.jenkins@curatrack.health",
  phone: "+1 (555) 234-5678",
  bloodGroup: "O+",
  height: "168 cm",
  weight: "62 kg",
  emergencyContact: "David Jenkins (Husband) - +1 (555) 987-6543",
  primaryDoctor: "Dr. Aris Thorne (Cardiology)"
};

export const initialVitals = {
  heartRate: 72,
  steps: 6420,
  bloodPressure: "120/80",
  spo2: 98,
  temperature: "98.6°F",
  weightProgress: [64.2, 63.8, 63.1, 62.5, 62.0]
};

export const initialAppointments = [
  {
    id: "apt-1",
    doctor: "Dr. Aris Thorne",
    specialty: "Cardiologist",
    hospital: "City Central Health Plaza",
    date: "2026-08-10",
    time: "10:30 AM",
    status: "Upcoming",
    type: "In-Person Consultation",
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "apt-2",
    doctor: "Dr. Elena Rostova",
    specialty: "Dermatologist",
    hospital: "Metro Care Clinic",
    date: "2026-08-18",
    time: "02:15 PM",
    status: "Upcoming",
    type: "Follow-up Visit",
    avatar: "https://images.unsplash.com/photo-1594824813566-88855ce78906?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "apt-3",
    doctor: "Dr. Marcus Vance",
    specialty: "General Physician",
    hospital: "CuraTrack Telehealth",
    date: "2026-07-22",
    time: "11:00 AM",
    status: "Completed",
    type: "Video Call",
    avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80"
  }
];

export const initialMedications = [
  {
    id: "med-1",
    name: "Amoxicillin",
    dosage: "500 mg",
    instructions: "1 capsule with water after breakfast",
    time: "08:00 AM",
    taken: true,
    category: "Antibiotic",
    color: "#0052cc"
  },
  {
    id: "med-2",
    name: "Lisinopril",
    dosage: "10 mg",
    instructions: "1 tablet before lunch",
    time: "01:00 PM",
    taken: false,
    category: "Blood Pressure",
    color: "#006c49"
  },
  {
    id: "med-3",
    name: "Vitamin D3",
    dosage: "2000 IU",
    instructions: "1 softgel daily after dinner",
    time: "08:00 PM",
    taken: false,
    category: "Supplement",
    color: "#4547d3"
  }
];

export const initialMedicalRecords = [
  {
    id: "rec-1",
    title: "Comprehensive Blood Panel",
    category: "Lab Results",
    date: "Aug 02, 2026",
    doctor: "Dr. Marcus Vance",
    hospital: "CuraLab Diagnostics",
    status: "Normal",
    fileSize: "2.4 MB",
    type: "PDF Document"
  },
  {
    id: "rec-2",
    title: "Chest X-Ray Digital Scan",
    category: "Imaging",
    date: "Jul 15, 2026",
    doctor: "Dr. Sarah Lin",
    hospital: "City Hospital Radiology",
    status: "Reviewed",
    fileSize: "14.8 MB",
    type: "DICOM Image"
  },
  {
    id: "rec-3",
    title: "Cardiology ECG Report",
    category: "Specialist Report",
    date: "Jun 28, 2026",
    doctor: "Dr. Aris Thorne",
    hospital: "City Central Health",
    status: "Normal",
    fileSize: "1.8 MB",
    type: "PDF Document"
  }
];

export const initialNotifications = [
  {
    id: "notif-1",
    title: "Medication Reminder",
    message: "Time to take Lisinopril 10 mg (01:00 PM)",
    time: "10 mins ago",
    read: false,
    type: "medication"
  },
  {
    id: "notif-2",
    title: "Appointment Confirmed",
    message: "Dr. Aris Thorne confirmed your appointment for Aug 10 at 10:30 AM",
    time: "2 hours ago",
    read: false,
    type: "appointment"
  },
  {
    id: "notif-3",
    title: "Lab Results Ready",
    message: "Your Comprehensive Blood Panel is now available for view",
    time: "1 day ago",
    read: true,
    type: "record"
  }
];
