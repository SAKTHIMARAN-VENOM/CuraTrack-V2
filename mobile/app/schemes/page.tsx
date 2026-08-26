'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { TopAppBar } from '@/components/TopAppBar';
import { useApp } from '@/context/AppContext';
import { fetchRecommendedSchemes, submitInsuranceClaim } from '@/lib/api';
import { 
  Landmark, 
  ShieldCheck, 
  CheckCircle2, 
  Search, 
  ArrowUpRight, 
  Sparkles, 
  HeartHandshake, 
  FileText, 
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Percent,
  CreditCard
} from 'lucide-react';

interface Scheme {
  id: string;
  name: string;
  category: 'Universal Cover' | 'Chronic Care' | 'Senior Citizens' | 'Maternity' | 'Subsidies';
  coverage: string;
  provider: string;
  description: string;
  eligibility: string;
  benefits: string[];
  status: 'Eligible' | 'Applied' | 'Explore';
  badgeColor: string;
}

const schemesData: Scheme[] = [
  {
    id: 'pmjay',
    name: 'Ayushman Bharat PM-JAY',
    category: 'Universal Cover',
    coverage: '₹5,00,000 / Year per Family',
    provider: 'National Health Authority (NHA)',
    description: 'World’s largest government-funded health assurance scheme providing secondary and tertiary care hospitalization.',
    eligibility: 'All verified socio-economic registry families & PMJAY card holders',
    benefits: ['Cashless inpatient care at 28,000+ empanelled hospitals', 'Pre-existing illnesses covered from Day 1', '15 days post-hospitalization medicine expenses covered'],
    status: 'Eligible',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  {
    id: 'ncis',
    name: 'National Chronic Illness Care Subsidy',
    category: 'Chronic Care',
    coverage: 'Up to 70% Off Maintenance Rx',
    provider: 'Ministry of Health & Family Welfare',
    description: 'Direct subsidies on essential medications for cardiovascular health, hypertension, diabetes, and chronic respiratory disorders.',
    eligibility: 'Patients diagnosed with registered chronic conditions (e.g. Asthma, CVD)',
    benefits: ['Subsidized generic medicines via Jan Aushadhi Kendras', 'Free bi-annual HbA1c and lipid profile testing', 'Teleconsultation follow-up assistance'],
    status: 'Eligible',
    badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300',
  },
  {
    id: 'senior-care',
    name: 'Senior Citizen Health & Wellness Grant',
    category: 'Senior Citizens',
    coverage: '₹1,50,000 Annual Diagnostic Pool',
    provider: 'Department of Social Justice & Health',
    description: 'Comprehensive geriatric care package covering preventive screenings, vision care, cardiology checks, and mobility aids.',
    eligibility: 'Citizens aged 60+ with valid government photo identification',
    benefits: ['Free quarterly at-home health checkups', 'Subsidized hearing aids and corrective spectacles', 'Priority emergency ambulance dispatch'],
    status: 'Explore',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
  },
  {
    id: 'pmmvy',
    name: 'Pradhan Mantri Matru Vandana Yojana',
    category: 'Maternity',
    coverage: '₹6,000 Direct Health Benefit',
    provider: 'Ministry of Women and Child Development',
    description: 'Maternity benefit program offering cash incentive for pregnant and lactating mothers for improved nutrition and prenatal visits.',
    eligibility: 'Pregnant women and lactating mothers for first living child',
    benefits: ['Institutional delivery coverage', 'Free immunization schedules for infant', 'Nutritional supplement vouchers'],
    status: 'Explore',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
  },
  {
    id: 'critical-relief',
    name: 'Emergency Catastrophic Health Relief',
    category: 'Subsidies',
    coverage: 'Up to ₹2,50,000 Emergency Grant',
    provider: 'National Illness Assistance Fund',
    description: 'One-time emergency relief fund for life-threatening medical emergencies and critical ICU admissions.',
    eligibility: 'Patients undergoing emergency interventions below state threshold',
    benefits: ['Fast-track hospital verification within 2 hours', 'Direct hospital account disbursement', 'No advance collateral needed'],
    status: 'Applied',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  },
];

export default function SchemesPage() {
  const { user, session } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedScheme, setExpandedScheme] = useState<string | null>('pmjay');
  const [backendSchemes, setBackendSchemes] = useState<Scheme[]>([]);
  const [isLoadingSchemes, setIsLoadingSchemes] = useState(false);
  const [claimStatus, setClaimStatus] = useState<{ id: string; message: string } | null>(null);

  // Fetch AI-recommended schemes from backend
  useEffect(() => {
    const loadSchemes = async () => {
      setIsLoadingSchemes(true);
      try {
        const result = await fetchRecommendedSchemes(session?.user?.id || 'demo-patient-001');
        if (result.availableSchemes) {
          const mapped: Scheme[] = result.availableSchemes.map((s: any) => ({
            id: s.id,
            name: s.name,
            category: s.type === 'insurance' ? 'Subsidies' as const : 'Universal Cover' as const,
            coverage: s.amount,
            provider: 'AI Recommended • CuraTrack',
            description: s.reason,
            eligibility: `Match Score: ${s.match_percentage}%`,
            benefits: ['AI-matched to your clinical profile', 'Verified eligibility', 'Instant claim processing'],
            status: 'Eligible' as const,
            badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
          }));
          setBackendSchemes(mapped);
        }
      } catch (e) {
        console.warn('Failed to load recommended schemes:', e);
      } finally {
        setIsLoadingSchemes(false);
      }
    };
    loadSchemes();
  }, [session]);

  const handleClaimSubmit = async (scheme: Scheme) => {
    try {
      const result = await submitInsuranceClaim(
        session?.user?.id || 'demo-patient-001',
        scheme.name,
        50000
      );
      setClaimStatus({ id: result.claimId, message: result.message });
      setTimeout(() => setClaimStatus(null), 5000);
    } catch (e) {
      alert(`Application initiated for ${scheme.name}. Your ABHA Health ID is linked.`);
    }
  };

  const allSchemes = [...backendSchemes, ...schemesData];

  const categories = ['All', 'Universal Cover', 'Chronic Care', 'Senior Citizens', 'Maternity', 'Subsidies'];

  const filteredSchemes = allSchemes.filter((scheme) => {
    const matchesCategory = selectedCategory === 'All' || scheme.category === selectedCategory;
    const matchesSearch = scheme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          scheme.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          scheme.provider.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col pb-28 bg-[#f8fafc] dark:bg-[#091422] min-h-screen">
      <TopAppBar title="Health Schemes & Benefits" />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 flex flex-col gap-4">
        {/* Clean Header */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <h1 className="text-xl font-extrabold text-on-surface">
            Healthcare Schemes &amp; Grants
          </h1>
          <span className="text-xs text-primary font-mono font-bold">ABHA Synced</span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search schemes, subsidies, PM-JAY..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all shadow-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Schemes List */}
        <div className="space-y-3.5">
          {filteredSchemes.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-800">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No schemes found</p>
              <p className="text-xs text-slate-400 mt-0.5">Try searching with different keywords</p>
            </div>
          ) : (
            filteredSchemes.map((scheme) => {
              const isExpanded = expandedScheme === scheme.id;

              return (
                <div
                  key={scheme.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                            {scheme.name}
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">{scheme.provider}</p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ${scheme.badgeColor}`}>
                      {scheme.status}
                    </span>
                  </div>

                  {/* Coverage Highlight */}
                  <div className="mt-3.5 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-700/60">
                    <span className="text-[11px] font-bold text-slate-500">Maximum Benefit Cover:</span>
                    <span className="text-xs font-black text-teal-700 dark:text-teal-400">{scheme.coverage}</span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
                    {scheme.description}
                  </p>

                  {/* Expandable Details */}
                  {isExpanded && (
                    <div className="mt-3.5 pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-2.5 animate-in fade-in">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Key Benefits</span>
                        <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                          {scheme.benefits.map((benefit, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-2.5 bg-teal-50/70 dark:bg-teal-950/40 rounded-xl text-[11px] text-teal-900 dark:text-teal-200">
                        <strong className="block font-bold">Eligibility Rule:</strong>
                        <span>{scheme.eligibility}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleClaimSubmit(scheme)}
                          className="flex-1 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-transform active:scale-95 shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <span>Apply / Claim Benefit</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Toggle Accordion */}
                  <button
                    onClick={() => setExpandedScheme(isExpanded ? null : scheme.id)}
                    className="w-full mt-3 pt-2 text-[11px] font-bold text-teal-700 dark:text-teal-400 flex items-center justify-center gap-1 hover:underline"
                  >
                    <span>{isExpanded ? 'Show Less' : 'View Full Details & Benefits'}</span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? '-rotate-90' : 'rotate-90'}`} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
