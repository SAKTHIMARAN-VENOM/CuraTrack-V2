import React, { useState } from 'react';

// 10. Medical Records Main List Screen
export function MedicalRecordsScreen({ records, onAddRecord, onNavigate, onSelectRecord }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [uploading, setUploading] = useState(false);

  const categories = ['All', 'Lab Results', 'Imaging', 'Specialist Report'];

  const filteredRecords = selectedCategory === 'All' 
    ? records 
    : records.filter(r => r.category === selectedCategory);

  const handleSimulatedUpload = () => {
    setUploading(true);
    setTimeout(() => {
      const newRec = {
        id: `rec-${Date.now()}`,
        title: "Blood Lipid & Glucose Profile",
        category: "Lab Results",
        date: "Aug 06, 2026",
        doctor: "Dr. Marcus Vance",
        hospital: "CuraLab Central",
        status: "Verified",
        fileSize: "3.1 MB",
        type: "PDF Document"
      };
      onAddRecord(newRec);
      setUploading(false);
      onNavigate('upload_success');
    }, 1200);
  };

  return (
    <div className="flex-1 p-5 bg-[#f8f9ff] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0b1c30]">Medical Records</h2>
          <p className="text-xs text-[#434654]">Secure repository for lab reports & diagnostic files</p>
        </div>
        <button
          onClick={handleSimulatedUpload}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#003d9b] text-white font-bold text-xs shadow hover:bg-[#0052cc] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-base">{uploading ? 'sync' : 'upload_file'}</span>
          <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-[#003d9b] text-white shadow'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
        <button
          onClick={() => onNavigate('medical_records_empty')}
          className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap text-blue-600 bg-blue-50 border border-blue-200"
        >
          View Empty State Screen
        </button>
      </div>

      {/* Records List */}
      <div className="flex flex-col gap-3">
        {filteredRecords.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-[#c3c6d6]/40 text-center flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-4xl text-slate-400">folder_off</span>
            <p className="text-sm font-bold text-[#0b1c30]">No records found in this category</p>
          </div>
        ) : (
          filteredRecords.map((rec) => (
            <div
              key={rec.id}
              onClick={() => { onSelectRecord(rec); onNavigate('record_details'); }}
              className="bg-white p-4 rounded-3xl border border-[#c3c6d6]/50 shadow-sm hover:border-[#003d9b] cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#e1e0ff] text-[#2b29bb] flex items-center justify-center group-hover:scale-105 transition-all">
                  <span className="material-symbols-outlined text-2xl">description</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#0b1c30] group-hover:text-[#003d9b] transition-all">
                    {rec.title}
                  </h3>
                  <p className="text-xs text-[#434654] font-medium">{rec.hospital} • {rec.date}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {rec.category}
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-600">
                      ✓ {rec.status}
                    </span>
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400 group-hover:text-[#003d9b] text-xl">
                chevron_right
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// 11. Medical Records Empty Screen Component
export function MedicalRecordsEmptyScreen({ onNavigate }) {
  return (
    <div className="flex-1 p-6 bg-[#f8f9ff] flex flex-col items-center justify-center text-center my-auto">
      <div className="w-24 h-24 rounded-full bg-[#dae2ff] text-[#003d9b] flex items-center justify-center mb-6 shadow-inner">
        <span className="material-symbols-outlined text-5xl">folder_open</span>
      </div>
      <h2 className="text-xl font-extrabold text-[#0b1c30] mb-2">No Medical Records Uploaded Yet</h2>
      <p className="text-xs text-[#434654] max-w-xs leading-relaxed mb-6">
        Keep all your lab reports, prescriptions, and radiology scans securely stored in one encrypted cloud location.
      </p>

      <button
        onClick={() => onNavigate('medical_records')}
        className="w-full max-w-xs py-3.5 rounded-2xl bg-[#003d9b] text-white font-bold text-sm shadow-md hover:bg-[#0052cc] active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-xl">upload_file</span>
        <span>Upload First Medical Document</span>
      </button>
    </div>
  );
}

// 12. Record Details Screen Component
export function RecordDetailsScreen({ record, onNavigate }) {
  const item = record || {
    title: "Comprehensive Blood Panel",
    category: "Lab Results",
    date: "Aug 02, 2026",
    doctor: "Dr. Marcus Vance",
    hospital: "CuraLab Diagnostics",
    status: "Normal",
    fileSize: "2.4 MB",
    type: "PDF Document"
  };

  return (
    <div className="flex-1 p-5 bg-[#f8f9ff] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('medical_records')}
          className="text-xs font-bold text-[#003d9b] flex items-center gap-1 hover:underline"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Back to Records</span>
        </button>
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
          Verified PDF
        </span>
      </div>

      {/* Main Document Details Card */}
      <div className="bg-white p-5 rounded-3xl border border-[#c3c6d6]/50 shadow-sm flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#dae2ff] text-[#003d9b] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-3xl">picture_as_pdf</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0b1c30]">{item.title}</h2>
            <p className="text-xs text-[#434654] font-medium">{item.category} • {item.fileSize}</p>
            <p className="text-xs text-slate-500 mt-0.5">Uploaded on {item.date}</p>
          </div>
        </div>

        <hr className="border-slate-100" />

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-400 font-medium block">Ordering Doctor</span>
            <span className="font-bold text-[#0b1c30]">{item.doctor}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Clinical Facility</span>
            <span className="font-bold text-[#0b1c30]">{item.hospital}</span>
          </div>
        </div>

        {/* Document Preview Placeholder Box */}
        <div className="bg-slate-100 rounded-2xl p-6 border border-slate-200 text-center flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-4xl text-slate-400">task</span>
          <span className="text-xs font-bold text-slate-700">Digital Document Preview Active</span>
          <p className="text-[11px] text-slate-500">Fast FHIR-compliant health record renderer</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert(`Downloading ${item.title}...`)}
            className="flex-1 py-3 rounded-2xl bg-[#003d9b] text-white font-bold text-xs shadow hover:bg-[#0052cc] transition-all flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            <span>Download PDF</span>
          </button>
          <button
            onClick={() => alert(`Sharing record with clinical provider...`)}
            className="flex-1 py-3 rounded-2xl bg-white border border-[#003d9b] text-[#003d9b] font-bold text-xs hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-lg">share</span>
            <span>Share Record</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// 13. Upload Success Screen Component
export function UploadSuccessScreen({ onNavigate }) {
  return (
    <div className="flex-1 p-6 bg-[#f8f9ff] flex flex-col items-center justify-center text-center my-auto">
      <div className="w-20 h-20 rounded-full bg-[#6cf8bb]/30 text-[#006c49] flex items-center justify-center mb-6 shadow-md animate-bounce">
        <span className="material-symbols-outlined text-5xl">task_alt</span>
      </div>
      <h2 className="text-2xl font-extrabold text-[#0b1c30] mb-2">Upload Successful!</h2>
      <p className="text-xs text-[#434654] max-w-xs leading-relaxed mb-6">
        Your medical document has been encrypted and added to your CuraTrack health profile.
      </p>

      <button
        onClick={() => onNavigate('medical_records')}
        className="w-full max-w-xs py-3.5 rounded-2xl bg-[#003d9b] text-white font-bold text-sm shadow-md hover:bg-[#0052cc] active:scale-95 transition-all"
      >
        View All Records
      </button>
    </div>
  );
}
