import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminDashboardPage from '../app/admin/dashboard/page';

// Mock API_BASE
vi.mock('@/lib/api', () => ({
    API_BASE: 'http://localhost:8000',
    apiFetch: vi.fn(),
}));

// Mock i18n
vi.mock('@/lib/i18n', () => ({
    useI18n: () => ({
        t: (key: string, fallback: string) => fallback,
    }),
}));

// Mock Next navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
    }),
    usePathname: () => '/admin/dashboard',
    useParams: () => ({ id: 'VIL-001' }),
}));

// Mock recharts responsive container for jsdom testing
vi.mock('recharts', async () => {
    const original = await vi.importActual<any>('recharts');
    return {
        ...original,
        ResponsiveContainer: ({ children }: any) => <div style={{ width: 500, height: 300 }}>{children}</div>,
    };
});

describe('District Health Administrator Dashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn((url: string | URL | Request) => {
            const urlStr = url.toString();
            if (urlStr.includes('/api/admin/dashboard-stats')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        district: 'Nandurbar District',
                        state: 'Maharashtra',
                        population_covered: 1648290,
                        total_villages: 6,
                        total_blocks: 6,
                        total_beneficiaries: 2480,
                        high_risk_patients: 92,
                        total_doctors: 4,
                        verified_doctors: 2,
                        pending_doctor_approvals: 2,
                        total_asha_workers: 5,
                        verified_asha_workers: 3,
                        pending_asha_verification: 2,
                        total_facilities: 6,
                        active_healthcare_workers: 17,
                        recent_disease_cases: 239,
                        pending_referrals: 4,
                        emergency_referrals: 2,
                        active_health_alerts: 3
                    })
                } as Response);
            }
            if (urlStr.includes('/api/admin/action-required')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        items: [
                            {
                                id: 'ACT-ALT-101',
                                priority: 'CRITICAL',
                                category: 'Disease Outbreak',
                                title: 'Surge: Dengue in Borvihir Pada',
                                description: '42 active cases detected (+250% above baseline).',
                                link: '/admin/alerts',
                                action_label: 'Investigate & Respond',
                                created_at: '2026-08-25'
                            }
                        ]
                    })
                } as Response);
            }
            if (urlStr.includes('/api/admin/disease-monitoring')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        trend_history_7d: [
                            { day: 'Day 1', Dengue: 24, Malaria: 38, Gastro: 50, TB: 18 }
                        ]
                    })
                } as Response);
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
        }) as any;
    });

    it('renders the District Administrator dashboard with metrics and Action Required items', async () => {
        render(<AdminDashboardPage />);

        // Check hero title
        await waitFor(() => {
            expect(screen.getByText(/Nandurbar District Healthcare Dashboard/i)).toBeInTheDocument();
        });

        // Check Action Required item
        expect(screen.getByText(/Surge: Dengue in Borvihir Pada/i)).toBeInTheDocument();
        expect(screen.getByText(/CRITICAL Priority/i)).toBeInTheDocument();

        // Check KPI metrics
        expect(screen.getByText(/1,648,290/i)).toBeInTheDocument();
        expect(screen.getByText(/Medical Doctors/i)).toBeInTheDocument();
        expect(screen.getByText(/ASHA Frontline Workers/i)).toBeInTheDocument();
    });
});
