'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TopAppBar } from '@/components/TopAppBar';
import { useApp } from '@/context/AppContext';
import { 
  FileText, 
  Download, 
  Share2, 
  CheckCircle2, 
  ShieldCheck, 
  Activity, 
  Pill, 
  MessageSquare, 
  Building2, 
  Calendar,
  AlertCircle,
  FileCheck2
} from 'lucide-react';

export default function RecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getRecordById, records } = useApp();
  const [downloadToast, setDownloadToast] = useState(false);

  const recordId = typeof params?.id === 'string' ? params.id : '';
  const record = getRecordById(recordId) || records.find(r => r.id === recordId);

  const handleDownload = () => {
    setDownloadToast(true);
    setTimeout(() => setDownloadToast(false), 3000);
  };

  if (!record) {
    return (
      <div className="flex-1 flex flex-col pb-24">
        <TopAppBar title="Record Details" showBack={true} />
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <FileText className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-on-surface">Record Not Found</h2>
          <p className="text-xs text-on-surface-variant">The requested clinical record may have been archived or moved.</p>
          <button
            onClick={() => router.push('/records')}
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-sm"
          >
            Back to Records
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-24">
      <TopAppBar title="Record Details" showBack={true} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-8 py-5 flex flex-col gap-6">
        {/* Record Title & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 bg-secondary-container text-on-secondary-container rounded-full">
                {record.category}
              </span>
              <span className="text-xs text-slate-400">{record.date}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-on-surface">{record.title}</h1>
            <p className="text-xs text-on-surface-variant mt-0.5">{record.facility}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Finalized & Verified</span>
            </span>
          </div>
        </div>

        {/* Doctor Information Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-card border border-surface-container-high dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl overflow-hidden ring-2 ring-primary/20 shrink-0">
              <img
                src="https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80"
                alt={record.doctor}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-sm font-bold text-on-surface">{record.doctor}</h3>
              <p className="text-xs text-primary font-medium">Attending Physician • MD, FACC</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{record.facility}</p>
            </div>
          </div>

          <button
            onClick={() => alert(`Opening secure message thread with ${record.doctor}`)}
            className="flex items-center justify-center gap-1.5 bg-surface-container-high dark:bg-slate-800 hover:bg-surface-container-highest text-primary font-bold text-xs px-4 py-2.5 rounded-xl transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Message Doctor</span>
          </button>
        </div>

        {/* Clinical Summary & Notes */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-card border border-surface-container-high dark:border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span>Clinical Summary & Findings</span>
          </h2>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-on-surface leading-relaxed">
            {record.summary}
          </div>

          {record.doctorNotes && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-on-surface-variant">Doctor&apos;s Recommendation:</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 italic pl-3 border-l-2 border-primary">
                &ldquo;{record.doctorNotes}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Biometric Lab Metrics */}
        {record.metrics && record.metrics.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-card border border-surface-container-high dark:border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Diagnostic Key Indicators</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {record.metrics.map((metric, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-surface dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-semibold text-on-surface-variant">{metric.label}</span>
                    <div className="text-base font-extrabold text-on-surface mt-0.5">{metric.value}</div>
                    <span className="text-[10px] text-slate-400">Ref: {metric.range}</span>
                  </div>

                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    metric.status === 'optimal'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {metric.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Download & Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleDownload}
            className="w-full sm:flex-1 py-3.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-2xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Official PDF ({record.fileSize})</span>
          </button>

          <button
            onClick={() => alert('Encrypted share link generated for your physician.')}
            className="w-full sm:w-auto py-3.5 px-6 bg-surface-container-high dark:bg-slate-800 hover:bg-surface-container-highest text-on-surface font-bold text-xs rounded-2xl transition-colors flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4 text-primary" />
            <span>Share Record</span>
          </button>
        </div>

        {downloadToast && (
          <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Encrypted clinical PDF generated and downloaded successfully!</span>
          </div>
        )}
      </main>
    </div>
  );
}
