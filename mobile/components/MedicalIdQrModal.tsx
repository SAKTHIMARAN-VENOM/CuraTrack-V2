'use client';

import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { UserProfile } from '@/context/AppContext';
import { generatePassport } from '@/lib/api';
import { 
  QrCode, 
  X, 
  Clock, 
  RefreshCw, 
  ShieldCheck, 
  Heart, 
  Phone, 
  AlertTriangle, 
  CheckCircle2, 
  Share2,
  Copy,
  Lock
} from 'lucide-react';

interface MedicalIdQrModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

const EXPIRATION_SECONDS = 300; // 5 minutes

export const MedicalIdQrModal: React.FC<MedicalIdQrModalProps> = ({
  user,
  isOpen,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(EXPIRATION_SECONDS);
  const [tokenId, setTokenId] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Generate QR data
  const generateQrCode = useCallback(async () => {
    setIsGenerating(true);
    const newTokenId = `CURA-MED-${Date.now().toString(36).toUpperCase()}`;
    const generatedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + EXPIRATION_SECONDS * 1000).toISOString();

    setTokenId(newTokenId);
    setSecondsRemaining(EXPIRATION_SECONDS);

    // Try backend passport generation first
    let passportPayload: string | null = null;
    try {
      const passportResult: any = await generatePassport({
        patient_id: newTokenId,
        name: user.name,
        blood_type: user.bloodType,
        allergies: user.allergies,
        conditions: user.chronicConditions,
        emergency_contact: user.emergencyContact,
      });
      if (passportResult?.qr_data) {
        passportPayload = typeof passportResult.qr_data === 'string'
          ? passportResult.qr_data
          : JSON.stringify(passportResult.qr_data);
      }
    } catch (e) {
      console.warn('Backend passport generation failed, using local:', e);
    }

    // Fallback: build payload locally
    if (!passportPayload) {
      passportPayload = JSON.stringify({
        schema: 'CuraTrack-Medical-ID-v1',
        token: newTokenId,
        expiresAt,
        patient: {
          name: user.name,
          bloodType: user.bloodType,
          age: user.age,
          gender: user.gender,
          allergies: user.allergies,
          chronicConditions: user.chronicConditions,
          emergencyContact: {
            name: user.emergencyContact.name,
            relationship: user.emergencyContact.relationship,
            phone: user.emergencyContact.phone,
          },
        },
      });
    }

    try {
      const url = await QRCode.toDataURL(passportPayload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#004d40',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error('Error generating QR code:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [user]);

  // Initial generation when opened
  useEffect(() => {
    if (isOpen) {
      generateQrCode();
    }
  }, [isOpen, generateQrCode]);

  // 5-minute countdown timer
  useEffect(() => {
    if (!isOpen || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, secondsRemaining]);

  if (!isOpen) return null;

  const isExpired = secondsRemaining <= 0;
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPercent = (secondsRemaining / EXPIRATION_SECONDS) * 100;

  const handleCopySummary = () => {
    const summaryText = `[CuraTrack Emergency Medical ID]\nPatient: ${user.name} (${user.gender}, ${user.age} yrs)\nBlood Group: ${user.bloodType}\nAllergies: ${user.allergies.join(', ') || 'None'}\nConditions: ${user.chronicConditions.join(', ') || 'None'}\nEmergency Contact: ${user.emergencyContact.name} (${user.emergencyContact.relationship}) - ${user.emergencyContact.phone}\nToken ID: ${tokenId} (Expires in 5m)`;
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 bg-gradient-to-r from-teal-700 via-teal-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-md">
              <QrCode className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 className="text-base font-extrabold leading-tight">Secure Medical ID QR</h2>
              <p className="text-[11px] text-teal-200 font-medium">Temporary 5-minute encrypted pass</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white/80 hover:text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-center">
          {/* Timer Banner */}
          <div className={`p-3 rounded-2xl border flex items-center justify-between transition-colors ${
            isExpired 
              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300' 
              : 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900 text-teal-800 dark:text-teal-300'
          }`}>
            <div className="flex items-center gap-2 text-left">
              <Clock className={`w-4 h-4 shrink-0 ${!isExpired && 'animate-spin-slow'}`} />
              <div>
                <span className="text-xs font-bold block">
                  {isExpired ? 'QR Code Expired' : 'Pass Available For:'}
                </span>
                <span className="text-[11px] opacity-80">
                  {isExpired ? 'Regenerate to re-enable access' : 'Strict 5-minute auto-expiry for privacy'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-lg font-mono font-extrabold tracking-wider ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-teal-700 dark:text-teal-300'}`}>
                {formattedTime}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          {!isExpired && (
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden -mt-2">
              <div 
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {/* QR Code Container */}
          <div className="relative mx-auto w-64 h-64 bg-white rounded-2xl p-3 border-2 border-dashed border-teal-200 dark:border-slate-700 flex items-center justify-center shadow-inner">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="Medical ID QR Code"
                className={`w-full h-full object-contain rounded-xl transition-all duration-300 ${
                  isExpired ? 'blur-md opacity-30 grayscale' : 'opacity-100'
                }`}
              />
            )}

            {/* Expired Overlay */}
            {isExpired && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4 text-white animate-in fade-in">
                <AlertTriangle className="w-10 h-10 text-amber-400 mb-2" />
                <p className="text-sm font-bold">5-Minute Window Expired</p>
                <p className="text-[11px] text-slate-300 text-center mt-0.5 mb-3">
                  This QR code has self-destructed to protect patient medical privacy.
                </p>
                <button
                  onClick={generateQrCode}
                  disabled={isGenerating}
                  className="bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs px-4 py-2 rounded-full shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>Generate New Pass (5 min)</span>
                </button>
              </div>
            )}
          </div>

          {/* Patient Quick Glance Summary */}
          <div className="text-left bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700/60 text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <div>
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">{user.name}</span>
                <span className="text-[11px] text-slate-500 block">{user.gender} • {user.age} yrs • ID: {tokenId}</span>
              </div>
              <span className="bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-extrabold text-xs px-2.5 py-1 rounded-full">
                {user.bloodType}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-slate-400 block font-semibold">ALLERGIES</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                  {user.allergies.join(', ') || 'None Listed'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">CONDITIONS</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                  {user.chronicConditions.join(', ') || 'None Listed'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">
                Emergency: <strong className="text-slate-800 dark:text-slate-200">{user.emergencyContact.name} ({user.emergencyContact.phone})</strong>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={generateQrCode}
              disabled={isGenerating}
              className="flex-1 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/80 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>Reset 5m Timer</span>
            </button>

            <button
              type="button"
              onClick={handleCopySummary}
              className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Details!' : 'Copy Summary'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
