'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  AlertTriangle, 
  PhoneCall, 
  X, 
  ShieldAlert, 
  MapPin, 
  Radio, 
  Heart, 
  User, 
  Phone, 
  CheckCircle2,
  Volume2
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function EmergencySOSPage() {
  const router = useRouter();
  const { user } = useApp();
  const [countdown, setCountdown] = useState(10);
  const [isTriggered, setIsTriggered] = useState(false);
  const [isAutoCalling, setIsAutoCalling] = useState(true);
  const [geoCoords, setGeoCoords] = useState<{ lat: string; lng: string; accuracy: number } | null>(null);

  // Get real GPS coordinates
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setGeoCoords({
            lat: pos.coords.latitude.toFixed(4),
            lng: pos.coords.longitude.toFixed(4),
            accuracy: Math.round(pos.coords.accuracy),
          });
        },
        (err) => console.warn('Geolocation error:', err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAutoCalling && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0 && !isTriggered) {
      setIsTriggered(true);
    }
    return () => clearTimeout(timer);
  }, [countdown, isAutoCalling, isTriggered]);

  const handleCancelCountdown = () => {
    setIsAutoCalling(false);
    setCountdown(10);
  };

  const handleImmediateTrigger = () => {
    setIsAutoCalling(false);
    setCountdown(0);
    setIsTriggered(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden">
      {/* Ambient Red Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

      {/* Header */}
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-2 text-red-500 font-extrabold text-lg sm:text-xl">
          <AlertTriangle className="w-6 h-6 animate-bounce" />
          <span>Emergency SOS Dispatch</span>
        </div>

        <button
          onClick={() => router.push('/')}
          className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-2xl mx-auto flex-1 flex flex-col items-center justify-center py-6 z-10 text-center gap-6">
        {/* Pulsating Big SOS Button */}
        <div className="relative my-2">
          <div className="absolute inset-0 bg-red-600 rounded-full pulse-ring opacity-60"></div>
          <button
            onClick={handleImmediateTrigger}
            className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-gradient-to-tr from-red-700 to-red-500 text-white flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-all group"
          >
            <PhoneCall className="w-14 h-14 sm:w-16 sm:h-16 stroke-[2.5] group-hover:scale-110 transition-transform" />
            <span className="text-2xl sm:text-3xl font-black mt-2 tracking-wider">SOS</span>
          </button>
        </div>

        {/* Status Callout */}
        {isAutoCalling ? (
          <div className="w-full max-w-md bg-red-950/80 border border-red-800 rounded-3xl p-5 shadow-xl flex flex-col items-center gap-1.5">
            <span className="text-xs font-bold text-red-300 uppercase tracking-widest">
              Connecting to 108 Ambulance & 112 Emergency
            </span>
            <div className="text-4xl sm:text-5xl font-black text-white font-mono my-1">
              00:{countdown < 10 ? `0${countdown}` : countdown}
            </div>
            <button
              onClick={handleCancelCountdown}
              className="text-xs font-bold text-red-400 hover:text-red-200 underline mt-1"
            >
              Cancel Auto-Call
            </button>
          </div>
        ) : isTriggered ? (
          <div className="w-full max-w-md bg-emerald-950/80 border border-emerald-700 rounded-3xl p-5 shadow-xl flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              <div className="text-left">
                <span className="text-xs font-bold text-emerald-300 uppercase">Emergency Dispatch Active</span>
                <p className="text-xs text-slate-300 mt-0.5">108 Emergency responders & contacts notified with live coordinates.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-800/60">
              <a
                href="tel:108"
                className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call 108 Ambulance</span>
              </a>
              <a
                href="tel:112"
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call 112 Emergency</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-4 flex items-center justify-between">
            <span className="text-xs text-slate-300">Tap SOS button above to trigger instant dispatch</span>
            <button
              onClick={() => setIsAutoCalling(true)}
              className="text-xs font-bold text-red-400 bg-red-950/60 px-3 py-1.5 rounded-xl border border-red-900"
            >
              Restart Timer
            </button>
          </div>
        )}

        {/* Live GPS Telemetry Strip */}
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <MapPin className="w-4 h-4 text-red-500 animate-pulse" />
            <span>{geoCoords ? `${geoCoords.lat}° N, ${geoCoords.lng}° W (Accuracy ${geoCoords.accuracy}m)` : 'Acquiring GPS lock...'}</span>
          </div>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 animate-spin" />
            <span>Broadcasting</span>
          </span>
        </div>

        {/* Medical ID Bento Card for First Responders */}
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-5 text-left space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-red-500" />
              <span>Paramedic Medical ID</span>
            </h3>
            <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md">
              {user.name} ({user.age}y)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-800/80 p-2.5 rounded-xl">
              <span className="text-[10px] text-slate-400 block">Blood Group</span>
              <span className="font-extrabold text-red-400 text-sm">{user.bloodType}</span>
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded-xl">
              <span className="text-[10px] text-slate-400 block">Allergies</span>
              <span className="font-bold text-white text-[11px] truncate block">{user.allergies[0]}</span>
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded-xl">
              <span className="text-[10px] text-slate-400 block">Condition</span>
              <span className="font-bold text-white text-[11px] truncate block">{user.chronicConditions[0]}</span>
            </div>
          </div>

          {/* Emergency Contact Quick Call */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400">Emergency Contact</span>
              <p className="text-xs font-bold text-white">{user.emergencyContact.name} ({user.emergencyContact.relationship})</p>
            </div>
            <a
              href={`tel:${user.emergencyContact.phone}`}
              className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-transform active:scale-95"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Contact</span>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-2xl mx-auto flex items-center justify-center text-[11px] text-slate-500 z-10 py-2">
        <span>Automatic telemetry dispatch enabled via CuraTrack emergency beacon</span>
      </footer>
    </div>
  );
}
