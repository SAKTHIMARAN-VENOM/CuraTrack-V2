"use client";

import React, { useState } from 'react';
import { ingestDocument, confirmIngestion } from '@/lib/api';

interface RecordUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (doc: { title: string; category: string; date: string; ocrText?: string }) => void;
}

export default function RecordUploadModal({ isOpen, onClose, onUploadSuccess }: RecordUploadModalProps) {
  const [docName, setDocName] = useState("");
  const [category, setCategory] = useState("Lab Reports");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<string>("");

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      if (!docName) {
        setDocName(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setOcrStatus("Processing with Tesseract OCR + RapidOCR & Llama 3.1...");

    try {
      let res;
      if (file) {
        res = await ingestDocument(file);
      } else {
        const dummyFile = new File(["dummy prescription text"], "prescription.pdf", { type: "application/pdf" });
        res = await ingestDocument(dummyFile);
      }

      setOcrStatus("Confirming medications in Supabase record...");
      await confirmIngestion({
        doc_name: docName || "Uploaded Prescription",
        category,
        extracted_text: res.extracted_text,
        medications: res.medications,
      });

      if (onUploadSuccess) {
        onUploadSuccess({
          title: docName || "Uploaded Report PDF",
          category,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          ocrText: res.extracted_text,
        });
      }
      setDocName("");
      setFile(null);
      setOcrStatus("");
      setIsUploading(false);
      onClose();
    } catch (err) {
      console.error("OCR Ingestion failed:", err);
      setIsUploading(false);
      setOcrStatus("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">cloud_upload</span>
            </div>
            <h3 className="font-extrabold text-base text-[#0b1c30]">Upload Record & OCR</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Document Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Blood Test Report Oct 2026"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#008080] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Record Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#008080] focus:outline-none"
            >
              <option>Lab Reports</option>
              <option>Radiology & Scans</option>
              <option>Prescriptions</option>
              <option>Insurance Documents</option>
            </select>
          </div>

          <label className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#008080] transition-colors relative">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <span className="material-symbols-outlined text-3xl text-slate-400 mb-1">upload_file</span>
            <p className="text-xs font-bold text-slate-700">
              {file ? file.name : "Click to select PDF or Prescription Image"}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Tesseract + RapidOCR + Llama 3.1 LLM Parsing</p>
          </label>

          {ocrStatus && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-2.5 text-[11px] text-[#008080] font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-base animate-spin">sync</span>
              <span>{ocrStatus}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading}
            className="w-full bg-[#008080] hover:bg-teal-700 text-white font-extrabold py-3 rounded-2xl text-xs transition-colors shadow-md flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <span>Extracting OCR & Uploading...</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">psychology</span>
                <span>Process OCR & Save Record</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
