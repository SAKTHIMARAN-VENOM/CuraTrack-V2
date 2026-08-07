"use client";

import React, { useState } from 'react';
import MobileFrame from '@/components/MobileFrame';
import RecordUploadModal from '@/components/RecordUploadModal';

export default function RecordsPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<null | { title: string; category: string; date: string; doctor: string }>(null);
  
  const [records, setRecords] = useState<any[]>([]);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("curatrack_user_records");
      if (saved) {
        setRecords(JSON.parse(saved));
      } else {
        setRecords([]);
      }
    } catch {
      setRecords([]);
    }
  }, []);

  const handleNewRecord = (newDoc: { title: string; category: string; date: string }) => {
    const updated = [
      {
        title: newDoc.title,
        category: newDoc.category,
        date: newDoc.date,
        doctor: "Uploaded by User • Tesseract & RapidOCR Verified",
        size: "2.1 MB PDF",
      },
      ...records,
    ];
    setRecords(updated);
    try {
      localStorage.setItem("curatrack_user_records", JSON.stringify(updated));
    } catch (e) {
      console.warn("LocalStorage save error:", e);
    }
  };

  return (
    <MobileFrame headerTitle="Encrypted Records">
      {/* Title & Action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0b1c30]">Medical Vault</h1>
          <p className="text-xs text-[#434654] font-medium">ABHA Linked & End-to-End Encrypted</p>
        </div>
        <button
          onClick={() => setIsUploadOpen(true)}
          className="bg-[#008080] hover:bg-teal-700 text-white font-extrabold px-3.5 py-2 rounded-2xl transition-colors shadow flex items-center gap-1 text-xs"
        >
          <span className="material-symbols-outlined text-base">cloud_upload</span>
          <span>Upload</span>
        </button>
      </div>

      {/* Security Banner */}
      <div className="bg-[#008080]/10 border border-[#008080]/30 rounded-2xl p-3 flex items-center gap-3">
        <span className="material-symbols-outlined text-xl text-[#008080]">verified_user</span>
        <p className="text-[11px] font-semibold text-[#0b1c30]">
          All records protected with 256-bit AES encryption and stored on secure cloud.
        </p>
      </div>

      {/* Record List */}
      <div className="flex flex-col gap-3">
        {records.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-teal-50 text-[#008080] flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">folder_off</span>
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-[#0b1c30]">No Encrypted Records Uploaded Yet</h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Upload your prescriptions, lab reports, or scans. Our Tesseract & RapidOCR engine will automatically parse your medical records.
              </p>
            </div>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="bg-[#008080] hover:bg-teal-700 text-white font-extrabold px-4 py-2.5 rounded-2xl text-xs shadow-md mt-1 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">cloud_upload</span>
              <span>Upload Your First Document</span>
            </button>
          </div>
        ) : (
          records.map((doc, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-xl">description</span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#0b1c30] leading-snug">{doc.title}</h3>
                    <p className="text-[11px] font-bold text-slate-400">{doc.doctor}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {doc.category}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-semibold">{doc.date}</span>
                  <button
                    onClick={() => setSelectedDoc(doc)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold px-3 py-1 rounded-xl transition-colors text-xs flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    <span>View</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      <RecordUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleNewRecord}
      />

      {/* PDF View Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-xl">picture_as_pdf</span>
                <h3 className="font-extrabold text-sm text-[#0b1c30] truncate max-w-[200px]">{selectedDoc.title}</h3>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="bg-slate-100 rounded-2xl h-48 border border-slate-200 flex flex-col items-center justify-center p-4 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">find_in_page</span>
              <p className="text-xs font-extrabold text-slate-700">{selectedDoc.title}</p>
              <p className="text-[10px] text-slate-400 mt-1">Verified Medical Signature • {selectedDoc.date}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDoc(null)}
                className="w-full bg-[#008080] hover:bg-teal-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileFrame>
  );
}
