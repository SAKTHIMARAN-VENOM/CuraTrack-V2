'use client';

export default function BenefitsPage() {
    return (
        <div className="p-8 max-w-7xl mx-auto w-full">
            {/* Page Title & Greeting */}
            <section className="mb-12">
                <h1 className="text-4xl font-extrabold tracking-tight text-on-surface mb-2">Benefits &amp; Schemes</h1>
                <p className="text-tertiary text-lg max-w-2xl">Maximize your coverage with AI-matched healthcare schemes and seamless insurance claim processing.</p>
            </section>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-12 gap-8">
                {/* Main Schemes Column */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    {/* Recommendations Banner */}
                    <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary-container p-8 text-white shadow-xl">
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="max-w-md">
                                <span className="bg-white/20 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur-md">AI Insights</span>
                                <h3 className="text-2xl font-bold mt-4 mb-2">Recommended: Senior Care Plus</h3>
                                <p className="text-primary-fixed/80 font-medium text-white/80">Based on your recent cardiology records, you qualify for an additional 15% co-payment waiver.</p>
                            </div>
                            <button className="px-8 py-4 bg-white text-primary font-bold rounded-2xl hover:bg-opacity-90 transition-all shadow-lg active:scale-95">
                                Apply Instantly
                            </button>
                        </div>
                        {/* Abstract Texture decoration */}
                        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-4 p-1 bg-surface-container-low rounded-2xl w-fit">
                        <button className="px-6 py-2.5 rounded-xl bg-white shadow-sm font-bold text-primary">All Schemes</button>
                        <button className="px-6 py-2.5 rounded-xl text-tertiary hover:text-primary transition-colors font-semibold">Insurance</button>
                        <button className="px-6 py-2.5 rounded-xl text-tertiary hover:text-primary transition-colors font-semibold">Government</button>
                    </div>

                    {/* Schemes Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Card 1 */}
                        <div className="bg-surface-container-lowest p-6 rounded-[2rem] hover:shadow-md transition-shadow group shadow-sm border border-surface-container-high">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-14 h-14 bg-secondary-container flex items-center justify-center rounded-2xl text-secondary">
                                    <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>shield_with_heart</span>
                                </div>
                                <span className="px-3 py-1 bg-secondary-container text-secondary text-[10px] font-bold uppercase rounded-full">Eligible</span>
                            </div>
                            <h4 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">National Health Scheme</h4>
                            <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">Comprehensive coverage for primary healthcare including outpatient consultations and standard diagnostics.</p>
                            <div className="flex items-center justify-between pt-4 border-t border-surface-container-low">
                                <span className="text-primary font-bold text-sm">$0 Premium</span>
                                <button className="flex items-center gap-2 text-primary font-bold text-sm hover:underline">
                                    View Details
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </button>
                            </div>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-surface-container-lowest p-6 rounded-[2rem] hover:shadow-md transition-shadow group shadow-sm border border-surface-container-high">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-14 h-14 bg-tertiary-fixed flex items-center justify-center rounded-2xl text-on-tertiary-fixed-variant">
                                    <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>assured_workload</span>
                                </div>
                                <span className="px-3 py-1 bg-surface-container-high text-outline-variant text-[10px] font-bold uppercase rounded-full border border-outline-variant/30 text-on-surface">Claimed</span>
                            </div>
                            <h4 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">Corporate Blue Shield</h4>
                            <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">Active employer-sponsored plan. Covered up to $50,000 annually for specialized surgeries.</p>
                            <div className="flex items-center justify-between pt-4 border-t border-surface-container-low">
                                <span className="text-tertiary font-bold text-sm">Valid till Jan 2025</span>
                                <button className="px-4 py-2 bg-surface-container-high text-on-surface font-bold text-xs rounded-xl hover:bg-surface-container-highest transition-colors">
                                    View Receipt
                                </button>
                            </div>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-surface-container-lowest p-6 rounded-[2rem] hover:shadow-md transition-shadow group shadow-sm border border-surface-container-high">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-14 h-14 bg-error-container flex items-center justify-center rounded-2xl text-error">
                                    <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>pill</span>
                                </div>
                                <span className="px-3 py-1 bg-error-container/80 text-on-error-container text-[10px] font-bold uppercase rounded-full">Recommended</span>
                            </div>
                            <h4 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">Chronic Med Subsidy</h4>
                            <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">Subsidized medication costs for long-term conditions. Covers up to 80% of pharmacy expenses.</p>
                            <div className="flex items-center justify-between pt-4 border-t border-surface-container-low">
                                <span className="text-error font-bold text-sm">Urgent: Apply Now</span>
                                <button className="flex items-center gap-2 text-primary font-bold text-sm hover:underline">
                                    Pre-fill Claim Form
                                    <span className="material-symbols-outlined text-sm">edit_note</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Claim Summary & Quick Actions */}
                <div className="col-span-12 lg:col-span-4 space-y-6 lg:sticky lg:top-24">
                    <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm border border-surface-container-high">
                        <h3 className="text-lg font-bold mb-6">Claim Analytics</h3>
                        
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-tertiary text-sm font-semibold">Total Claimed</span>
                            <span className="text-2xl font-black text-on-surface">$12,450</span>
                        </div>
                        <div className="w-full bg-surface-container-low h-3 rounded-full mb-6 overflow-hidden">
                            <div className="bg-primary h-full rounded-full w-[65%]"></div>
                        </div>
                        
                        <div className="flex justify-between text-sm mb-8 pb-8 border-b border-surface-container-low">
                            <span className="text-tertiary">Annual Limit</span>
                            <span className="font-bold text-on-surface">$50,000</span>
                        </div>

                        <h4 className="text-sm font-bold text-tertiary uppercase tracking-wider mb-4">Pending Claims</h4>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-secondary">
                                        <span className="material-symbols-outlined text-sm">dentistry</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">Dental X-Ray</p>
                                        <p className="text-[10px] text-tertiary">Submitted 2 days ago</p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-secondary bg-secondary-container/50 px-2 py-1 rounded w-fit">Processing</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
