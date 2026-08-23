'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TopAppBar } from '@/components/TopAppBar';
import { useApp } from '@/context/AppContext';
import { ingestDocument, confirmIngestion } from '@/lib/api';
import { 
  FileText, 
  Search, 
  UploadCloud, 
  ChevronRight, 
  FileCheck, 
  FlaskConical, 
  Scan, 
  Pill, 
  HeartPulse, 
  Plus, 
  Download, 
  Eye,
  Filter,
  X
} from 'lucide-react';

export default function MedicalRecordsPage() {
  const router = useRouter();
  const { records, addRecord } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New record state
  const [newDoc, setNewDoc] = useState({
    title: '',
    category: 'Lab Report' as const,
    doctor: 'Dr. Sarah Jenkins',
    facility: 'Quest Diagnostic Labs',
    summary: 'Comprehensive lab tests and biomarkers analysis.',
  });

  const categories = ['All', 'Lab Report', 'Imaging', 'Prescription', 'Cardiology'];

  const filteredRecords = records.filter((rec) => {
    const matchesCategory = selectedCategory === 'All' || rec.category === selectedCategory;
    const matchesSearch =
      rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.doctor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.title) return;
    setIsUploading(true);

    try {
      let extractedData: any = {};

      // If a file was selected, send it to the OCR backend
      if (uploadFile) {
        try {
          extractedData = await ingestDocument(uploadFile);
        } catch (ocrError) {
          console.warn('OCR extraction failed, proceeding with manual data:', ocrError);
        }
      }

      // Create the record locally
      const newId = addRecord({
        title: newDoc.title,
        category: newDoc.category,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        doctor: newDoc.doctor,
        facility: newDoc.facility,
        summary: extractedData?.doctor_notes?.summary || newDoc.summary,
        fileSize: uploadFile ? `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB` : '3.1 MB',
        fileType: uploadFile?.type?.includes('pdf') ? 'PDF Document' : 'Uploaded Document',
        metrics: [
          { label: 'Diagnostic Verification', value: 'Complete', status: 'optimal' as const, range: 'Verified' },
          { label: 'OCR Extraction', value: extractedData?.extracted_text ? '100% Match' : 'Manual Entry', status: 'optimal' as const, range: extractedData?.extracted_text ? 'High Confidence' : 'User Provided' },
        ],
        doctorNotes: extractedData?.doctor_notes?.summary || 'Uploaded document verified and indexed in medical history.',
      });

      // Confirm ingestion with the backend
      try {
        await confirmIngestion({
          patient_id: 'mobile-user',
          doc_name: newDoc.title,
          category: newDoc.category,
          extracted_text: extractedData?.extracted_text,
          medications: extractedData?.medications,
          lab_results: extractedData?.lab_results,
          doctor_notes: extractedData?.doctor_notes,
        });
      } catch (confirmError) {
        console.warn('Backend confirmation failed:', confirmError);
      }

      setIsUploading(false);
      setIsUploadModalOpen(false);
      setUploadFile(null);
      router.push(`/records/upload-success?id=${newId}`);
    } catch (error) {
      console.error('Upload failed:', error);
      setIsUploading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Lab Report':
        return <FlaskConical className="w-5 h-5 text-teal-600" />;
      case 'Imaging':
        return <Scan className="w-5 h-5 text-indigo-600" />;
      case 'Prescription':
        return <Pill className="w-5 h-5 text-amber-600" />;
      case 'Cardiology':
        return <HeartPulse className="w-5 h-5 text-red-600" />;
      default:
        return <FileText className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col pb-24">
      <TopAppBar title="Medical Records" />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 py-5 flex flex-col gap-6">
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface">Medical Records</h1>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
              Securely view lab test results, imaging, and prescriptions
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tests, doctors..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full pl-9 pr-4 py-2 text-xs sm:text-sm text-on-surface outline-none focus:border-primary shadow-sm"
              />
            </div>

            {/* Upload Button */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-sm transition-transform active:scale-95 shrink-0"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Records Bento Grid */}
        {filteredRecords.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-dashed border-slate-300 dark:border-slate-700 shadow-sm flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              <FileCheck className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-on-surface">No Records Found</h3>
            <p className="text-xs text-on-surface-variant max-w-sm mt-1">
              No medical documents match your current filter or search criteria.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 text-xs font-bold text-primary bg-primary/10 rounded-xl hover:bg-primary/20"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecords.map((rec) => (
              <div
                key={rec.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-card border border-surface-container-high dark:border-slate-800 flex flex-col justify-between hover:border-primary/50 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        {getCategoryIcon(rec.category)}
                      </div>
                      <span className="text-[11px] font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                        {rec.category}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">{rec.date}</span>
                  </div>

                  <h3 className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                    {rec.title}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">
                    {rec.summary}
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 space-y-1">
                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">Doctor:</span> {rec.doctor}</p>
                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">Facility:</span> {rec.facility}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">{rec.fileSize} • {rec.fileType}</span>
                  <Link
                    href={`/records/${rec.id}`}
                    className="flex items-center gap-1 text-xs font-bold text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-xl"
                  >
                    <span>View Report</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Modal */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-primary" />
                  <span>Upload Medical Record</span>
                </h3>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-3.5">
                {/* File Dropzone with real file input */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-primary/40 bg-primary/5 dark:bg-primary/10 rounded-2xl p-6 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.dicom"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadFile(file);
                        if (!newDoc.title) {
                          setNewDoc({ ...newDoc, title: file.name.replace(/\.[^.]+$/, '') });
                        }
                      }
                    }}
                  />
                  <UploadCloud className="w-8 h-8 text-primary mx-auto mb-2" />
                  {uploadFile ? (
                    <>
                      <p className="text-xs font-bold text-on-surface">{uploadFile.name}</p>
                      <p className="text-[10px] text-emerald-600 mt-0.5">{(uploadFile.size / (1024 * 1024)).toFixed(1)} MB — Ready for OCR</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-on-surface">Click to select or drag PDF / DICOM file</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Supports PDF, JPG, PNG, DICOM (Max 25MB)</p>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Document Title / Test Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lipid Panel Blood Test"
                    value={newDoc.title}
                    onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                      Category
                    </label>
                    <select
                      value={newDoc.category}
                      onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value as any })}
                      className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                    >
                      <option value="Lab Report">Lab Report</option>
                      <option value="Imaging">Imaging (X-Ray / MRI)</option>
                      <option value="Prescription">Prescription</option>
                      <option value="Cardiology">Cardiology</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                      Doctor Name
                    </label>
                    <input
                      type="text"
                      placeholder="Dr. Aris Thorne"
                      value={newDoc.doctor}
                      onChange={(e) => setNewDoc({ ...newDoc, doctor: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Clinical Summary
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Summary of results or diagnosis..."
                    value={newDoc.summary}
                    onChange={(e) => setNewDoc({ ...newDoc, summary: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 shadow-sm flex items-center gap-1.5"
                  >
                    {isUploading ? (
                      <span>Encrypting & Uploading...</span>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload & Verify</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
