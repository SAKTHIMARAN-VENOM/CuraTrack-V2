'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, FileText, ArrowRight, ShieldCheck, Home } from 'lucide-react';
import { useApp } from '@/context/AppContext';

function UploadSuccessContent() {
  const searchParams = useSearchParams();
  const { getRecordById, records } = useApp();

  const recordId = searchParams.get('id') || 'rec-1';
  const record = getRecordById(recordId) || records[0];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-surface via-surface-container-lowest to-surface-container-low dark:from-slate-950 dark:to-slate-900 text-center max-w-lg mx-auto w-full">
      {/* Animated Success Badge */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center ring-8 ring-emerald-50 dark:ring-emerald-950/30 animate-pulse">
          <CheckCircle2 className="w-14 h-14 text-emerald-600 stroke-[2.5]" />
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface">
        Upload Successful!
      </h1>
      <p className="text-xs sm:text-sm text-on-surface-variant mt-1 max-w-xs">
        Your document has been verified with OCR and encrypted in your medical vault.
      </p>

      {/* Uploaded Record Summary Card */}
      <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-card border border-surface-container-high dark:border-slate-800 my-6 text-left space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-2xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
              {record?.category || 'Lab Report'}
            </span>
            <h3 className="text-sm font-bold text-on-surface mt-0.5">{record?.title || 'Comprehensive Metabolic Panel'}</h3>
            <p className="text-[11px] text-slate-400">{record?.doctor || 'Dr. Sarah Jenkins'} • {record?.facility || 'Quest Labs'}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-emerald-600 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" />
            <span>256-bit Encrypted</span>
          </span>
          <span className="text-slate-400">{record?.fileSize || '2.4 MB'}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full space-y-3">
        <Link
          href={`/records/${record?.id || 'rec-1'}`}
          className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-2xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
        >
          <span>View Diagnostic Details</span>
          <ArrowRight className="w-4 h-4" />
        </Link>

        <Link
          href="/records"
          className="w-full py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-on-surface font-bold text-xs rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4 text-primary" />
          <span>Back to Medical Records</span>
        </Link>
      </div>
    </main>
  );
}

export default function UploadSuccessPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading document...</div>}>
      <UploadSuccessContent />
    </Suspense>
  );
}
