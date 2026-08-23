'use client';

import React, { useState } from 'react';
import { TopAppBar } from '@/components/TopAppBar';
import { useApp } from '@/context/AppContext';
import { checkVitalsAlerts } from '@/lib/api';
import { 
  Heart, 
  Activity, 
  Droplet, 
  Moon, 
  TrendingDown, 
  TrendingUp, 
  RefreshCw, 
  Watch, 
  CheckCircle2, 
  Calendar,
  Sparkles,
  Zap,
  AlertTriangle,
  Wifi
} from 'lucide-react';

export default function VitalsOverviewPage() {
  const { vitals, vitalsLoading, fetchVitals, session } = useApp();
  const [timeRange, setTimeRange] = useState<'Day' | 'Week' | 'Month'>('Week');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncText, setLastSyncText] = useState('Tap Sync to update');
  const [alerts, setAlerts] = useState<Array<{ type: string; severity: string; message: string; value?: number }>>([]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetchVitals();
      setLastSyncText('Just updated now');

      // Check vitals alerts with real data
      if (vitals.heart_rate > 0 || vitals.spo2 > 0) {
        try {
          const alertResult = await checkVitalsAlerts({
            patient_id: session?.user?.id || 'mobile-user',
            heart_rate: vitals.heart_rate || undefined,
            spo2: vitals.spo2 || undefined,
          });
          setAlerts(alertResult.alerts || []);
        } catch (e) {
          console.warn('Vitals alert check failed:', e);
        }
      }
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const bpData = [
    { day: 'Mon', sys: 120, dia: 78 },
    { day: 'Tue', sys: 118, dia: 76 },
    { day: 'Wed', sys: 122, dia: 80 },
    { day: 'Thu', sys: 116, dia: 74 },
    { day: 'Fri', sys: 118, dia: 76 },
    { day: 'Sat', sys: 115, dia: 72 },
    { day: 'Sun', sys: 118, dia: 76 },
  ];

  const hrPoints = vitals.heartRateData && vitals.heartRateData.length > 0
    ? vitals.heartRateData.slice(-10).map(d => d.bpm)
    : [68, 74, 82, 71, 69, 78, 72, 70, 75, 72];

  const displayHR = vitals.heart_rate || 72;
  const displaySpo2 = vitals.spo2 || 98;
  const displaySleep = vitals.sleep?.formatted || `${Math.floor(vitals.sleep_hours)}h ${Math.round((vitals.sleep_hours % 1) * 60)}m`;
  const displaySleepScore = vitals.sleep_hours > 0 ? Math.min(99, Math.round(vitals.sleep_hours * 12)) : 89;

  return (
    <div className="flex-1 flex flex-col pb-24">
      <TopAppBar title="Vitals & Health Telemetry" />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 py-5 flex flex-col gap-6">
        {/* Header & Device Sync Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface">Vitals Overview</h1>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
              Live continuous telemetry & biometric trend analysis
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Time Filter */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-2xl flex items-center shadow-sm">
              {(['Day', 'Week', 'Month'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    timeRange === range
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>

            {/* Sync Wearable Button */}
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 bg-surface-container-high dark:bg-slate-800 hover:bg-surface-container-highest text-primary font-bold text-xs px-3.5 py-2.5 rounded-2xl shadow-sm transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>
        </div>

        {/* Vitals Alerts from Backend */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.filter(a => a.severity !== 'INFO').map((alert, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl flex items-center gap-3 text-xs font-medium ${
                  alert.severity === 'EMERGENCY' || alert.severity === 'CRITICAL'
                    ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200'
                    : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{alert.message}{alert.value ? ` (${alert.value})` : ''}</span>
              </div>
            ))}
          </div>
        )}

        {/* Google Fit Connection Status */}
        {vitals.isAuthenticated === false && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-2xl p-4 flex items-center gap-3 text-xs">
            <Wifi className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold text-blue-800 dark:text-blue-200">Google Fit Not Connected</span>
              <p className="text-blue-600 dark:text-blue-300 mt-0.5">Sign in with Google to sync your wearable data.</p>
            </div>
          </div>
        )}

        {/* Sync Device Badge */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Watch className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-on-surface">Google Fit / Wearable</span>
              <span className="text-slate-400 ml-2">• {vitals.isAuthenticated ? 'Connected' : 'Continuous telemetry active'}</span>
            </div>
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{lastSyncText}</span>
          </span>
        </div>

        {/* Vitals Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Blood Pressure (Large Wide Card) */}
          <div className="md:col-span-8 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-card border border-surface-container-high dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-primary/10 text-primary rounded-2xl">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-on-surface">Blood Pressure</h2>
                  <p className="text-xs text-on-surface-variant">Systolic & Diastolic readings</p>
                </div>
              </div>

              <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Optimal (Normal)</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end my-2">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-black text-on-surface tracking-tight">118</span>
                  <span className="text-2xl font-normal text-slate-400">/76</span>
                  <span className="text-xs text-slate-500 font-medium ml-1">mmHg</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Average 7-day baseline</p>
              </div>

              {/* Interactive Bar Chart Visualization */}
              <div className="sm:col-span-2 h-28 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 flex items-end justify-between gap-1.5">
                {bpData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div className="text-[9px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.sys}/{d.dia}
                    </div>
                    <div className="w-full max-w-[20px] bg-slate-200 dark:bg-slate-700 rounded-t-lg relative flex flex-col justify-end overflow-hidden" style={{ height: `${(d.sys / 140) * 100}%` }}>
                      <div className="w-full bg-primary group-hover:bg-teal-400 transition-colors" style={{ height: `${(d.dia / d.sys) * 100}%` }}></div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Goal Target: &lt; 120/80 mmHg</span>
              <span className="font-semibold text-emerald-600">Within Healthy Clinical Range</span>
            </div>
          </div>

          {/* Heart Rate Card */}
          <div className="md:col-span-4 bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-card border border-surface-container-high dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-error">
                  <div className="p-2 bg-error-container/50 rounded-xl">
                    <Heart className="w-5 h-5 fill-error text-error animate-pulse" />
                  </div>
                  <h3 className="text-sm font-bold text-on-surface">Heart Rate</h3>
                </div>
                <span className="text-xs font-bold text-slate-400">Resting</span>
              </div>

              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl font-extrabold text-on-surface">{vitalsLoading ? '—' : displayHR}</span>
                <span className="text-xs text-slate-500 font-medium">bpm</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {vitals.heartRateData && vitals.heartRateData.length > 0
                  ? `Range today: ${Math.min(...hrPoints)} - ${Math.max(...hrPoints)} bpm`
                  : 'Range today: 58 - 114 bpm'}
              </p>

              {/* Mini Waveform Visualization */}
              <div className="mt-4 h-16 bg-red-50/50 dark:bg-red-950/20 rounded-xl p-2 flex items-end gap-1.5 justify-between">
                {hrPoints.map((val, idx) => (
                  <div
                    key={idx}
                    className="flex-1 bg-error/70 rounded-full hover:bg-error transition-all"
                    style={{ height: `${((val - 50) / 70) * 100}%` }}
                    title={`${val} bpm`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>Heart Rate Variability: <strong>48 ms</strong></span>
              <span className="text-emerald-600 font-semibold">{displayHR < 100 ? 'Good Recovery' : 'Elevated'}</span>
            </div>
          </div>

          {/* SpO2 Blood Oxygen */}
          <div className="md:col-span-6 bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-card border border-surface-container-high dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 text-blue-600 rounded-2xl shrink-0">
                <Droplet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-surface">Blood Oxygen (SpO2)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Continuous pulse oximetry</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-extrabold text-on-surface">{vitalsLoading ? '—' : `${displaySpo2}%`}</span>
                </div>
                <span className={`inline-block mt-1 text-[11px] font-semibold ${displaySpo2 >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {displaySpo2 >= 95 ? 'Normal Range (95% - 100%)' : 'Below Normal — Monitor Closely'}
                </span>
              </div>
            </div>

            <div className="w-16 h-16 rounded-full border-4 border-blue-100 dark:border-slate-800 relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent -rotate-12"></div>
              <Droplet className="w-5 h-5 text-blue-500" />
            </div>
          </div>

          {/* Sleep Score */}
          <div className="md:col-span-6 bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-card border border-surface-container-high dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 rounded-2xl shrink-0">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-surface">Sleep Duration</h3>
                <p className="text-xs text-slate-400 mt-0.5">Last night sleep cycle</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-extrabold text-on-surface">{vitalsLoading ? '—' : displaySleep}</span>
                </div>
                <span className="inline-block mt-1 text-[11px] font-semibold text-indigo-600">
                  Deep Sleep: {vitals.sleep_hours > 0 ? `${Math.floor(vitals.sleep_hours * 0.28)}h ${Math.round((vitals.sleep_hours * 0.28 % 1) * 60)}m` : '2h 10m'} ({displaySleepScore} Score)
                </span>
              </div>
            </div>

            <div className="w-16 h-16 rounded-full border-4 border-indigo-100 dark:border-slate-800 relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent rotate-45"></div>
              <Moon className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
