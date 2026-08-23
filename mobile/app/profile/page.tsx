'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TopAppBar } from '@/components/TopAppBar';
import { useApp } from '@/context/AppContext';
import { 
  User, 
  ShieldCheck, 
  Heart, 
  Mail, 
  Bell, 
  Lock, 
  LogOut, 
  QrCode, 
  ChevronRight, 
  Edit3, 
  CheckCircle2, 
  Sparkles,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { MedicalIdQrModal } from '@/components/MedicalIdQrModal';

export default function UserProfilePage() {
  const router = useRouter();
  const { user, updateUser, signOut, supabaseUser, isAuthenticated } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [editData, setEditData] = useState({
    name: user.name,
    phone: user.phone,
    email: user.email,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser(editData);
    setIsEditing(false);
  };

  return (
    <div className="flex-1 flex flex-col pb-24">
      <TopAppBar title="User Profile" />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-8 py-5 flex flex-col gap-6">
        {/* Profile Card Header */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-card border border-surface-container-high dark:border-slate-800 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary/20 shadow-md">
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h1 className="text-xl sm:text-2xl font-extrabold text-on-surface">{user.name}</h1>
                <span className="bg-primary/10 text-primary p-1 rounded-full" title="Verified Patient">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {user.gender} • {user.age} Years Old • ID: {user.email ? `ABHA-${user.email.split('@')[0].toUpperCase()}` : 'ABHA-VERIFIED'}
              </p>

              <div className="flex flex-wrap gap-1.5 mt-3 justify-center sm:justify-start">
                <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-3 py-0.5 rounded-full text-[11px] font-bold">
                  Ayushman Beneficiary
                </span>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-0.5 rounded-full text-[11px] font-bold">
                  Blood Group {user.bloodType}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 bg-surface-container-high dark:bg-slate-800 hover:bg-surface-container-highest text-primary font-bold text-xs px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
          </button>
        </section>

        {/* Edit Form Drawer */}
        {isEditing && (
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-card border border-primary/40 space-y-3 animate-in fade-in">
            <h3 className="text-sm font-bold text-on-surface">Update Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Phone</label>
                <input
                  type="text"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Email</label>
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="bg-primary text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-primary/90 shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* 2-Column Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Medical ID Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-card border border-surface-container-high dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                <span>Medical ID Summary</span>
              </h3>
              <Link href="/emergency" className="text-xs font-semibold text-error hover:underline flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Emergency View</span>
              </Link>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-surface dark:bg-slate-800/60 rounded-2xl flex items-center justify-between">
                <span className="text-slate-500 font-medium">Blood Group:</span>
                <span className="font-extrabold text-red-600 dark:text-red-400">{user.bloodType}</span>
              </div>

              <div className="p-3 bg-surface dark:bg-slate-800/60 rounded-2xl">
                <span className="text-slate-500 font-medium block mb-1">Known Allergies:</span>
                <div className="flex flex-wrap gap-1">
                  {user.allergies.map((all, i) => (
                    <span key={i} className="bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                      {all}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-surface dark:bg-slate-800/60 rounded-2xl">
                <span className="text-slate-500 font-medium block mb-1">Chronic Conditions:</span>
                <div className="flex flex-wrap gap-1">
                  {user.chronicConditions.map((cond, i) => (
                    <span key={i} className="bg-slate-200 dark:bg-slate-700 text-on-surface px-2 py-0.5 rounded-md font-semibold text-[10px]">
                      {cond}
                    </span>
                  ))}
                </div>
              </div>

              {/* Dynamic 5-Min QR Code Trigger Button */}
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="w-full mt-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white p-3 rounded-2xl font-bold text-xs flex items-center justify-between shadow-sm transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-white/20 rounded-xl">
                    <QrCode className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="block text-xs font-bold leading-tight">Patient Medical QR</span>
                    <span className="text-[10px] text-teal-100 font-normal">Encrypted • 5-min live validity</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-full text-[10px] font-extrabold text-teal-100">
                  <Clock className="w-3 h-3" />
                  <span>5 MINS</span>
                </div>
              </button>
            </div>
          </div>

          {/* Account Settings & Sign Out */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-card border border-surface-container-high dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Account & Security</span>
            </h3>

            <div className="space-y-2">
              {/* Log out */}
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  router.push('/login');
                }}
                className="w-full p-3 rounded-2xl flex items-center justify-between text-error hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <LogOut className="w-4 h-4" />
                  <span className="text-xs font-bold">Sign Out of CuraTrack</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Dynamic 5-Minute Medical ID QR Modal */}
      <MedicalIdQrModal
        user={user}
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </div>
  );
}
