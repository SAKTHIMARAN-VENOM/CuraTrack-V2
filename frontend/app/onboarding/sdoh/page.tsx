'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

const QUESTIONS = [
  {
    key: 'income_band',
    title: 'Monthly Household Income',
    subtitle: 'What is your approximate monthly household income?',
    icon: 'payments',
    options: [
      { label: '> ₹50,000', value: 0 },
      { label: '₹25,000 – ₹50,000', value: 1 },
      { label: '₹10,000 – ₹25,000', value: 2 },
      { label: '< ₹10,000', value: 3 },
    ],
  },
  {
    key: 'food_security',
    title: 'Food Security',
    subtitle: 'Do you or your family skip meals due to cost?',
    icon: 'restaurant',
    options: [
      { label: 'Never', value: 0 },
      { label: 'Rarely', value: 1 },
      { label: 'Sometimes', value: 2 },
      { label: 'Often', value: 3 },
    ],
  },
  {
    key: 'hospital_distance',
    title: 'Distance to Nearest Clinic',
    subtitle: 'How far is the nearest hospital or clinic from your home?',
    icon: 'local_hospital',
    options: [
      { label: '< 5 km', value: 0 },
      { label: '5 – 10 km', value: 1 },
      { label: '10 – 20 km', value: 2 },
      { label: '> 20 km', value: 3 },
    ],
  },
  {
    key: 'employment',
    title: 'Employment Status',
    subtitle: 'What is your current employment situation?',
    icon: 'work',
    options: [
      { label: 'Salaried / Regular', value: 0 },
      { label: 'Self-employed', value: 1 },
      { label: 'Informal / Daily Wage', value: 2 },
      { label: 'Unemployed', value: 2 },
    ],
  },
  {
    key: 'health_literacy',
    title: 'Health Literacy',
    subtitle: 'Can you read and understand a prescription label?',
    icon: 'menu_book',
    options: [
      { label: 'Yes, fully understand', value: 0 },
      { label: 'Can understand basic info', value: 1 },
      { label: 'Can read but not understand', value: 2 },
      { label: 'Cannot read', value: 3 },
    ],
  },
];

const RISK_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; emoji: string }> = {
  LOW: { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-300', label: 'Low Risk', emoji: '✅' },
  MODERATE: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300', label: 'Moderate Risk', emoji: '⚠️' },
  HIGH: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300', label: 'High Risk', emoji: '🚨' },
};

export default function SDOHOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const question = QUESTIONS[step];
  const totalSteps = QUESTIONS.length;
  const isLastStep = step === totalSteps - 1;

  const handleSelect = (value: number) => {
    setSelected(value);
  };

  const handleNext = async () => {
    if (selected === null) return;
    const newAnswers = { ...answers, [question.key]: selected };
    setAnswers(newAnswers);

    if (isLastStep) {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const patientId = user?.id || 'anonymous';

        const body = {
          patient_id: patientId,
          income_band: newAnswers.income_band ?? 0,
          food_security: newAnswers.food_security ?? 0,
          hospital_distance: newAnswers.hospital_distance ?? 0,
          employment: newAnswers.employment ?? 0,
          health_literacy: newAnswers.health_literacy ?? 0,
        };

        const res = await fetch(`${API_BASE}/api/sdoh/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error('Failed to calculate score');
        setResult(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    } else {
      setStep(step + 1);
      setSelected(null);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      setSelected(answers[QUESTIONS[step - 1].key] ?? null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-tertiary font-semibold">Calculating your social health score...</p>
        </div>
      </div>
    );
  }

  if (result) {
    const cfg = RISK_CONFIG[result.risk_level] || RISK_CONFIG.MODERATE;
    const scorePercent = Math.min((result.score / 14) * 100, 100);

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-3xl p-8 shadow-lg text-center border border-slate-100">
            {/* Animated score circle */}
            <div className={`w-32 h-32 rounded-full ${cfg.bg} border-4 ${cfg.border} flex flex-col items-center justify-center mx-auto mb-6 shadow-inner`}>
              <span className="text-4xl">{cfg.emoji}</span>
              <p className={`text-3xl font-black ${cfg.color}`}>{result.score}</p>
              <p className={`text-xs font-bold ${cfg.color}`}>/ 14</p>
            </div>

            <h2 className="text-2xl font-extrabold text-on-surface mb-1">Social Health Score</h2>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${cfg.bg} ${cfg.color} border ${cfg.border} mb-6`}>
              {cfg.label}
            </div>

            {/* Score bar */}
            <div className="w-full bg-slate-100 h-3 rounded-full mb-8 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  result.risk_level === 'HIGH' ? 'bg-red-500' :
                  result.risk_level === 'MODERATE' ? 'bg-amber-400' : 'bg-green-500'
                }`}
                style={{ width: `${scorePercent}%` }}
              />
            </div>

            {/* Recommendations */}
            {result.recommendations?.length > 0 && (
              <div className="text-left space-y-3 mb-8">
                <p className="text-xs font-bold uppercase tracking-widest text-tertiary mb-3">Personalized Recommendations</p>
                {result.recommendations.map((rec: string, i: number) => (
                  <div key={i} className={`flex items-start gap-3 p-4 rounded-2xl ${cfg.bg} border ${cfg.border}`}>
                    <span className={`material-symbols-outlined text-sm mt-0.5 ${cfg.color}`}>lightbulb</span>
                    <p className={`text-sm font-medium ${cfg.color}`}>{rec}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => router.push('/dashboard')}
              disabled={saving}
              className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">dashboard</span>
              Save & Continue to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-bold text-tertiary uppercase tracking-widest">Step {step + 1} of {totalSteps}</p>
            <p className="text-xs font-bold text-primary">{Math.round(((step + 1) / totalSteps) * 100)}%</p>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">{question.icon}</span>
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-on-surface">{question.title}</h2>
              <p className="text-sm text-tertiary">{question.subtitle}</p>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-6 py-4 rounded-2xl border-2 font-semibold text-base transition-all active:scale-95 ${
                  selected === opt.value && answers[question.key] !== opt.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : selected === opt.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-200 bg-slate-50 text-on-surface hover:border-primary/40 hover:bg-primary/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{opt.label}</span>
                  {selected === opt.value && (
                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={handleBack}
                className="flex-1 py-3 border border-outline-variant text-on-surface font-bold rounded-2xl hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={selected === null}
              className="flex-1 py-3 bg-primary text-white font-bold rounded-2xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLastStep ? 'See My Score' : 'Next'}
              <span className="material-symbols-outlined text-sm">{isLastStep ? 'analytics' : 'arrow_forward'}</span>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Your responses are private and used only to personalize your care.
        </p>
      </div>
    </div>
  );
}
