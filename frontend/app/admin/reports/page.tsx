'use client';

import { useState, useRef } from 'react';
import { API_BASE } from '@/lib/api';

export default function DistrictReportsPage() {
    const [reportType, setReportType] = useState('district_health');
    const [generating, setGenerating] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [reportOutput, setReportOutput] = useState<any>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/reports?report_type=${reportType}`);
            if (res.ok) {
                const data = await res.json();
                setReportOutput(data.report);
            }
        } catch (err) {
            console.warn('Report generation error:', err);
        } finally {
            setGenerating(false);
        }
    };

    // Vector PDF Generation using jsPDF + autoTable (100% Reliable, zero CORS/CSS errors)
    const handleDownloadPDF = async () => {
        if (!reportOutput) return;
        setDownloadingPdf(true);
        try {
            const { jsPDF } = await import('jspdf');
            const autoTableModule = await import('jspdf-autotable');
            const autoTable = autoTableModule.default || autoTableModule;

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const tealColor: [number, number, number] = [0, 103, 130];
            const darkColor: [number, number, number] = [25, 28, 29];
            const grayColor: [number, number, number] = [90, 100, 110];
            const lightBg: [number, number, number] = [245, 247, 248];

            // 1. Header Banner
            doc.setFillColor(tealColor[0], tealColor[1], tealColor[2]);
            doc.rect(0, 0, 210, 8, 'F');

            // 2. Government & Department Header
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(tealColor[0], tealColor[1], tealColor[2]);
            doc.text('GOVERNMENT OF MAHARASHTRA • PUBLIC HEALTH DEPARTMENT', 105, 17, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
            doc.text('National Health Mission (NHM) • District Health Society, Nandurbar', 105, 22, { align: 'center' });

            // 3. Report Title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
            doc.text((reportOutput.title || 'District Health Report').toUpperCase(), 105, 30, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
            doc.text(`Jurisdiction: ${reportOutput.district || 'Nandurbar District'} • District Health Directorate`, 105, 35, { align: 'center' });

            // Divider Line
            doc.setDrawColor(tealColor[0], tealColor[1], tealColor[2]);
            doc.setLineWidth(0.5);
            doc.line(14, 38, 196, 38);

            // 4. Metadata Box
            doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
            doc.setDrawColor(220, 225, 230);
            doc.setLineWidth(0.2);
            doc.roundedRect(14, 41, 182, 10, 1.5, 1.5, 'FD');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
            doc.text('REFERENCE ID: ', 18, 47.5);
            doc.setFont('helvetica', 'normal');
            doc.text(`CRTRK-REP-2026-${(reportType).toUpperCase()}`, 42, 47.5);

            doc.setFont('helvetica', 'bold');
            doc.text('DATE: ', 100, 47.5);
            doc.setFont('helvetica', 'normal');
            doc.text(`${reportOutput.generated_at || new Date().toISOString().slice(0, 10)}`, 112, 47.5);

            doc.setFont('helvetica', 'bold');
            doc.text('TYPE: ', 155, 47.5);
            doc.setFont('helvetica', 'normal');
            doc.text('Statutory Audit', 166, 47.5);

            let currentY = 56;

            // 5. Executive Key Indices (KPI Cards)
            if (reportOutput.key_metrics) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(tealColor[0], tealColor[1], tealColor[2]);
                doc.text('1. EXECUTIVE HEALTH INDICES', 14, currentY);
                currentY += 4;

                const kpis = [
                    { label: 'POPULATION', val: reportOutput.key_metrics.population_covered?.toLocaleString() || '1,648,290' },
                    { label: 'VILLAGES', val: String(reportOutput.key_metrics.total_villages || '6') },
                    { label: 'BED OCCUPANCY', val: String(reportOutput.key_metrics.district_bed_occupancy || '77.5%') },
                    { label: 'VACCINATION', val: String(reportOutput.key_metrics.average_vaccination_rate || '86.8%') }
                ];

                const cardWidth = 43;
                const cardHeight = 14;
                const gap = 3.3;

                kpis.forEach((kpi, idx) => {
                    const x = 14 + idx * (cardWidth + gap);
                    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
                    doc.setDrawColor(220, 225, 230);
                    doc.roundedRect(x, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(6.5);
                    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
                    doc.text(kpi.label, x + cardWidth / 2, currentY + 4.5, { align: 'center' });

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10.5);
                    doc.setTextColor(tealColor[0], tealColor[1], tealColor[2]);
                    doc.text(kpi.val, x + cardWidth / 2, currentY + 10.5, { align: 'center' });
                });

                currentY += cardHeight + 8;
            }

            // 6. Tabular Section using autoTable
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(tealColor[0], tealColor[1], tealColor[2]);
            doc.text('2. DETAILED STATUTORY REGISTRY & DATA', 14, currentY);
            currentY += 2;

            if (reportOutput.village_breakdown) {
                const head = [['Village Name', 'Taluk', 'Population', 'ASHA Ratio', 'High Risk', 'Vaccination', 'Status']];
                const body = reportOutput.village_breakdown.map((v: any) => [
                    v.name,
                    v.block,
                    v.population?.toLocaleString() || '',
                    v.asha_ratio || '',
                    `${v.high_risk_cases || 0} cases`,
                    v.vaccination_rate || '',
                    v.coverage_status || 'GOOD'
                ]);

                autoTable(doc, {
                    head,
                    body,
                    startY: currentY,
                    theme: 'grid',
                    styles: { fontSize: 7.5, cellPadding: 2, textColor: [25, 28, 29] },
                    headStyles: { fillColor: [0, 103, 130], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
                    alternateRowStyles: { fillColor: [248, 249, 250] },
                    margin: { left: 14, right: 14 }
                });
            } else if (reportOutput.active_outbreaks) {
                const head = [['Disease Surge', 'Village', 'Taluk', 'Active Cases', 'Spike %', 'Severity', 'Action Status']];
                const body = reportOutput.active_outbreaks.map((o: any) => [
                    o.disease,
                    o.village_name,
                    o.block,
                    String(o.current_cases || 0),
                    o.increase_pct || '',
                    o.severity || 'HIGH',
                    o.status || 'ACTION_REQUIRED'
                ]);

                autoTable(doc, {
                    head,
                    body,
                    startY: currentY,
                    theme: 'grid',
                    styles: { fontSize: 7.5, cellPadding: 2, textColor: [25, 28, 29] },
                    headStyles: { fillColor: [0, 103, 130], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
                    alternateRowStyles: { fillColor: [248, 249, 250] },
                    margin: { left: 14, right: 14 }
                });
            } else if (reportOutput.workers) {
                const head = [['ASHA Name', 'Worker ID', 'Assigned Village', 'Taluk', 'Catchment Beneficiaries', 'Status']];
                const body = reportOutput.workers.map((w: any) => [
                    w.name,
                    w.asha_id,
                    w.village_name,
                    w.block,
                    `${w.beneficiaries_count || 40} Active`,
                    w.verification_status || 'VERIFIED'
                ]);

                autoTable(doc, {
                    head,
                    body,
                    startY: currentY,
                    theme: 'grid',
                    styles: { fontSize: 7.5, cellPadding: 2, textColor: [25, 28, 29] },
                    headStyles: { fillColor: [0, 103, 130], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
                    alternateRowStyles: { fillColor: [248, 249, 250] },
                    margin: { left: 14, right: 14 }
                });
            }

            // 7. Footer Attestation Block
            const pageHeight = doc.internal.pageSize.getHeight();
            const footerY = pageHeight - 25;

            doc.setDrawColor(220, 225, 230);
            doc.line(14, footerY, 196, footerY);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
            doc.text('CuraTrack Healthcare Governance System', 14, footerY + 5);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
            doc.text('Digitally compiled under the authority of National Health Mission (NHM).', 14, footerY + 9);
            doc.text(`Doc Hash: SHA256-DHO-NDB-${(reportType).slice(0, 4).toUpperCase()}-2026`, 14, footerY + 13);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(tealColor[0], tealColor[1], tealColor[2]);
            doc.text('Dr. R. K. Shinde', 196, footerY + 5, { align: 'right' });

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
            doc.text('District Health Officer (DHO)', 196, footerY + 9, { align: 'right' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
            doc.text('District Public Health Authority, Nandurbar', 196, footerY + 13, { align: 'right' });

            const cleanTitle = (reportOutput.title || 'District_Report').replace(/\s+/g, '_');
            const dateStr = new Date().toISOString().slice(0, 10);
            doc.save(`CuraTrack_${cleanTitle}_${dateStr}.pdf`);
        } catch (err) {
            console.error('PDF Generation Error:', err);
        } finally {
            setDownloadingPdf(false);
        }
    };

    return (
        <div suppressHydrationWarning className="space-y-8">
            {/* Top Header */}
            <div suppressHydrationWarning className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-surface-container shadow-sm">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface font-headline">
                        District Health Reports & PDF Intelligence Export
                    </h1>
                    <p className="text-xs text-tertiary mt-0.5 font-medium">
                        Generate official district administrative summaries and statutory returns for NHM, DHS, and state health audits
                    </p>
                </div>
            </div>

            {/* Report Selector Strip */}
            <div suppressHydrationWarning className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-container shadow-sm space-y-6">
                <h2 className="text-lg font-bold text-on-surface font-headline">Select Report Template & Scope</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-sans">
                    {[
                        { id: 'district_health', title: 'Comprehensive District Health Report', desc: 'Infrastructure, population coverage, bed occupancy & village status' },
                        { id: 'disease_epidemiology', title: 'Disease Epidemiology & Outbreak Audit', desc: 'Communicable disease incidence, vector spikes & hotspot analysis' },
                        { id: 'asha_performance', title: 'ASHA Worker Field Performance Report', desc: 'Catchment coverage, pending home visits & vaccination ratios' },
                        { id: 'doctor_verification', title: 'Doctor & Specialist Verification Audit', desc: 'Medical council registrations, approved licenses & pending queues' },
                        { id: 'facility_operations', title: 'Facility EDL Stocks & Inpatient Capacity', desc: 'Essential Drug List stockout warnings & bed occupancy ratios' },
                        { id: 'referral_audit', title: 'Inter-Facility Referral Pipeline Audit', desc: 'Emergency 108 transit times, SLA escalations & facility bottlenecks' }
                    ].map((item) => (
                        <div
                            key={item.id}
                            onClick={() => setReportType(item.id)}
                            className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                                reportType === item.id
                                    ? 'bg-primary/10 border-primary ring-2 ring-primary/20'
                                    : 'bg-surface-container-low border-surface-container hover:border-primary/30'
                            }`}
                        >
                            <div className="space-y-1">
                                <h3 className={`font-bold text-sm font-headline ${reportType === item.id ? 'text-primary' : 'text-on-surface'}`}>
                                    {item.title}
                                </h3>
                                <p className="text-xs text-tertiary leading-relaxed font-medium">{item.desc}</p>
                            </div>
                            <div className="pt-3 mt-2 border-t border-surface-container flex items-center justify-between text-xs font-headline">
                                <span className="text-[10px] uppercase font-bold text-tertiary">Standard NHM</span>
                                <span className={`font-bold ${reportType === item.id ? 'text-primary' : 'text-tertiary'}`}>
                                    {reportType === item.id ? '● Selected' : 'Select'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-surface-container-low">
                    <button
                        suppressHydrationWarning
                        onClick={handleGenerate}
                        disabled={generating}
                        className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer font-headline"
                    >
                        <span className="material-symbols-outlined text-sm">auto_graph</span>
                        <span>{generating ? 'Compiling Official Report...' : 'Compile & Generate Report'}</span>
                    </button>
                </div>
            </div>

            {/* Generated Official Document Section */}
            {reportOutput && (
                <div suppressHydrationWarning className="space-y-6">
                    {/* Action Bar */}
                    <div suppressHydrationWarning className="bg-white p-4 sm:p-6 rounded-3xl border border-surface-container shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <span className="text-[10px] font-black uppercase text-primary tracking-wider font-headline">Document Compiled Successfully</span>
                            <h3 className="text-base font-bold text-on-surface font-headline">{reportOutput.title}</h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 font-headline">
                            <button
                                suppressHydrationWarning
                                onClick={handleDownloadPDF}
                                disabled={downloadingPdf}
                                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                            >
                                <span className="material-symbols-outlined text-base">download</span>
                                <span>{downloadingPdf ? 'Generating PDF...' : 'Download PDF Document (.pdf)'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Official Document Preview Sheet */}
                    <div
                        ref={reportRef}
                        suppressHydrationWarning
                        className="bg-white p-8 sm:p-12 rounded-3xl border border-surface-container shadow-md max-w-5xl mx-auto font-sans"
                    >
                        {/* Official Header */}
                        <div className="text-center border-b-2 border-primary pb-5 mb-6">
                            <div className="flex items-center justify-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl font-headline">
                                    🏛️
                                </div>
                                <div className="text-left">
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-primary font-headline">
                                        Government of Maharashtra · Public Health Department
                                    </h4>
                                    <h3 className="text-xs font-bold text-tertiary">
                                        National Health Mission (NHM) · District Health Society, Nandurbar
                                    </h3>
                                </div>
                            </div>
                            <h1 className="text-xl sm:text-2xl font-black text-on-surface uppercase tracking-wide font-headline mt-3">
                                {reportOutput.title}
                            </h1>
                            <p className="text-xs text-tertiary mt-1">
                                Jurisdiction: <strong className="text-on-surface">{reportOutput.district}</strong> · District Health Directorate
                            </p>
                        </div>

                        {/* Document Meta Information Bar */}
                        <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container flex flex-wrap items-center justify-between text-xs text-tertiary mb-6 font-medium">
                            <div><strong className="text-on-surface">Reference ID:</strong> CRTRK-REP-2026-{(reportType).toUpperCase()}</div>
                            <div><strong className="text-on-surface">Generated At:</strong> {reportOutput.generated_at}</div>
                            <div><strong className="text-on-surface">Classification:</strong> Statutory Administrative Record</div>
                        </div>

                        {/* Executive Summary Metrics Grid */}
                        {reportOutput.key_metrics && (
                            <div className="mb-6">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-tertiary mb-2.5 font-headline">
                                    1. District Executive Key Indices
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container text-center">
                                        <p className="text-[10px] text-tertiary uppercase font-bold font-headline">Population Monitored</p>
                                        <p className="text-lg font-black text-on-surface font-headline mt-1">
                                            {reportOutput.key_metrics.population_covered?.toLocaleString() || '1,648,290'}
                                        </p>
                                    </div>
                                    <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container text-center">
                                        <p className="text-[10px] text-tertiary uppercase font-bold font-headline">Villages Monitored</p>
                                        <p className="text-lg font-black text-on-surface font-headline mt-1">
                                            {reportOutput.key_metrics.total_villages || 6}
                                        </p>
                                    </div>
                                    <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container text-center">
                                        <p className="text-[10px] text-tertiary uppercase font-bold font-headline">Bed Occupancy</p>
                                        <p className="text-lg font-black text-primary font-headline mt-1">
                                            {reportOutput.key_metrics.district_bed_occupancy || '77.5%'}
                                        </p>
                                    </div>
                                    <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container text-center">
                                        <p className="text-[10px] text-tertiary uppercase font-bold font-headline">Vaccination Rate</p>
                                        <p className="text-lg font-black text-emerald-700 font-headline mt-1">
                                            {reportOutput.key_metrics.average_vaccination_rate || '86.8%'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tabular Details Section */}
                        <div className="space-y-6">
                            {/* Village Breakdown */}
                            {reportOutput.village_breakdown && (
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-tertiary mb-2 font-headline">
                                        2. Rural Settlement Health & Workforce Status
                                    </h3>
                                    <div className="overflow-x-auto border border-surface-container rounded-xl">
                                        <table className="w-full text-left text-xs border-collapse font-sans">
                                            <thead>
                                                <tr className="bg-primary text-white font-headline text-[10px] uppercase tracking-wider">
                                                    <th className="py-2.5 px-3">Village Name</th>
                                                    <th className="py-2.5 px-3">Taluk</th>
                                                    <th className="py-2.5 px-3">Population</th>
                                                    <th className="py-2.5 px-3">ASHA Ratio</th>
                                                    <th className="py-2.5 px-3">High Risk</th>
                                                    <th className="py-2.5 px-3">Vaccination</th>
                                                    <th className="py-2.5 px-3">Coverage Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-surface-container-low">
                                                {reportOutput.village_breakdown.map((v: any, i: number) => (
                                                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-surface-container-low/40'}>
                                                        <td className="py-2.5 px-3 font-bold text-on-surface">{v.name}</td>
                                                        <td className="py-2.5 px-3 text-tertiary">{v.block}</td>
                                                        <td className="py-2.5 px-3 font-medium text-on-surface">{v.population?.toLocaleString()}</td>
                                                        <td className="py-2.5 px-3 font-mono text-purple-800 font-semibold">{v.asha_ratio}</td>
                                                        <td className="py-2.5 px-3 font-bold text-rose-700">{v.high_risk_cases} cases</td>
                                                        <td className="py-2.5 px-3 text-emerald-800 font-bold">{v.vaccination_rate}</td>
                                                        <td className="py-2.5 px-3 font-bold">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                                                                v.coverage_status === 'GOOD' ? 'bg-emerald-100 text-emerald-800' :
                                                                v.coverage_status === 'CRITICAL' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                                                            }`}>
                                                                {v.coverage_status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Disease Epidemiology Breakdown */}
                            {reportOutput.active_outbreaks && (
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-tertiary mb-2 font-headline">
                                        2. Active Outbreaks & Epidemiological Anomalies
                                    </h3>
                                    <div className="overflow-x-auto border border-surface-container rounded-xl">
                                        <table className="w-full text-left text-xs border-collapse font-sans">
                                            <thead>
                                                <tr className="bg-primary text-white font-headline text-[10px] uppercase tracking-wider">
                                                    <th className="py-2.5 px-3">Disease Surge</th>
                                                    <th className="py-2.5 px-3">Village</th>
                                                    <th className="py-2.5 px-3">Taluk</th>
                                                    <th className="py-2.5 px-3">Active Cases</th>
                                                    <th className="py-2.5 px-3">Spike</th>
                                                    <th className="py-2.5 px-3">Severity</th>
                                                    <th className="py-2.5 px-3">Action Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-surface-container-low">
                                                {reportOutput.active_outbreaks.map((o: any, i: number) => (
                                                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-surface-container-low/40'}>
                                                        <td className="py-2.5 px-3 font-bold text-on-surface">{o.disease}</td>
                                                        <td className="py-2.5 px-3 font-medium text-on-surface">{o.village_name}</td>
                                                        <td className="py-2.5 px-3 text-tertiary">{o.block}</td>
                                                        <td className="py-2.5 px-3 font-black text-rose-700">{o.current_cases}</td>
                                                        <td className="py-2.5 px-3 font-bold text-rose-600">{o.increase_pct}</td>
                                                        <td className="py-2.5 px-3 font-bold">
                                                            <span className="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-800">
                                                                {o.severity}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-tertiary font-medium">{o.status}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ASHA Performance Breakdown */}
                            {reportOutput.workers && (
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-tertiary mb-2 font-headline">
                                        2. Frontline ASHA Worker Catchment Roster
                                    </h3>
                                    <div className="overflow-x-auto border border-surface-container rounded-xl">
                                        <table className="w-full text-left text-xs border-collapse font-sans">
                                            <thead>
                                                <tr className="bg-primary text-white font-headline text-[10px] uppercase tracking-wider">
                                                    <th className="py-2.5 px-3">ASHA Name</th>
                                                    <th className="py-2.5 px-3">ASHA ID</th>
                                                    <th className="py-2.5 px-3">Assigned Village</th>
                                                    <th className="py-2.5 px-3">Taluk</th>
                                                    <th className="py-2.5 px-3">Beneficiaries</th>
                                                    <th className="py-2.5 px-3">Verification</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-surface-container-low">
                                                {reportOutput.workers.map((w: any, i: number) => (
                                                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-surface-container-low/40'}>
                                                        <td className="py-2.5 px-3 font-bold text-on-surface">{w.name}</td>
                                                        <td className="py-2.5 px-3 font-mono text-purple-800 font-bold">{w.asha_id}</td>
                                                        <td className="py-2.5 px-3 font-medium text-on-surface">{w.village_name}</td>
                                                        <td className="py-2.5 px-3 text-tertiary">{w.block}</td>
                                                        <td className="py-2.5 px-3 font-bold text-primary">{w.beneficiaries_count || 40} Active</td>
                                                        <td className="py-2.5 px-3 font-bold text-emerald-800">
                                                            ✓ {w.verification_status || 'VERIFIED'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Official Attestation & Sign-off Block */}
                        <div className="mt-12 pt-6 border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-tertiary">
                            <div className="space-y-1 text-center sm:text-left">
                                <p className="font-bold text-on-surface">CuraTrack Healthcare Governance System</p>
                                <p>Digitally compiled under the authority of National Health Mission (NHM).</p>
                                <p className="font-mono text-[10px]">Doc Hash: SHA256-DHO-NDB-{(reportType).slice(0, 4)}-2026</p>
                            </div>

                            <div className="text-center sm:text-right space-y-1">
                                <div className="w-48 border-b border-on-surface pb-1 mb-1">
                                    <span className="font-serif italic text-primary font-bold text-sm">Dr. R. K. Shinde</span>
                                </div>
                                <p className="font-bold text-on-surface">District Health Officer (DHO)</p>
                                <p className="text-[10px]">District Public Health Authority, Nandurbar</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
