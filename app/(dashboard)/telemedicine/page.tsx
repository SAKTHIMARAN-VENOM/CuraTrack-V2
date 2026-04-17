'use client';

export default function TelemedicinePage() {
    return (
        <div className="p-8 space-y-10 max-w-7xl mx-auto w-full">
            {/* Hero / Welcome Section */}
            <section className="flex flex-col md:flex-row gap-8 items-end">
                <div className="flex-1">
                    <h2 className="text-4xl font-extrabold tracking-tight font-headline mb-3">Instant Care, Anywhere.</h2>
                    <p className="text-tertiary text-lg max-w-xl">Consult with top-tier specialists from the comfort of your home. Secure, private, and empathetic precision healthcare at your fingertips.</p>
                </div>
                {/* Vitals Micro-Chart Integrated Style */}
                <div className="hidden lg:flex gap-4">
                    <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex items-center gap-4 border border-surface-container-high">
                        <div className="w-12 h-12 rounded-full bg-secondary-container/50 flex items-center justify-center text-secondary">
                            <span className="material-symbols-outlined">bolt</span>
                        </div>
                        <div>
                            <p className="text-xs text-tertiary font-bold uppercase tracking-wider">Wait Time</p>
                            <p className="text-xl font-bold font-headline">~ 8 Mins</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Doctor List (Left/Center) */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold font-headline">Available Specialists</h3>
                        <div className="flex gap-2">
                            <button className="px-4 py-2 rounded-lg bg-surface-container-high text-sm font-semibold hover:bg-surface-container-highest transition-colors">Filters</button>
                            <button className="px-4 py-2 rounded-lg bg-surface-container-high text-sm font-semibold hover:bg-surface-container-highest transition-colors">Sort by: Rating</button>
                        </div>
                    </div>

                    {/* Bento-ish Doctor Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Doctor Card 1 */}
                        <div className="bg-surface-container-lowest rounded-2xl p-6 transition-all hover:-translate-y-1 shadow-sm border border-surface-container-high">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex gap-4">
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100">
                                        <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDvSWjUQHVGGHOvUyW1pazyfHqSR_nJKqdzSN6ZsiSot-Fi2g0UdIYZPiQoKYiG1l5OmI9HR75csWPAWw6epzJerCVhOlBdYclwow8BehbAQBNMPoHRHQd5Gr2s1AiWv0JKc6wjXmhKJb7rYNSyxF2M1_FPmMgOwPMp8Vlzw3ZUOkORDyXhKUpOY14tdKfaTYJWSCU0Q8ogt80qhn9yJ7pY9lAvnXaqIiB-qEzBRfqZOsYe4D-SJGPn9c5N6vXPJPF8LM5ZenLFFiNo" alt="Doctor"/>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg leading-tight">Dr. Sarah Jenkins</h4>
                                        <p className="text-sm text-tertiary">Cardiologist</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className="material-symbols-outlined text-amber-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                            <span className="text-sm font-bold">4.9</span>
                                            <span className="text-xs text-slate-400">(120 reviews)</span>
                                        </div>
                                    </div>
                                </div>
                                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-secondary-container text-on-secondary-container">Available Now</span>
                            </div>
                            <button className="w-full py-3 rounded-xl doctor-card-gradient text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                                <span className="material-symbols-outlined text-xl">video_call</span>
                                Start Consultation
                            </button>
                        </div>

                        {/* Doctor Card 2 */}
                        <div className="bg-surface-container-lowest rounded-2xl p-6 transition-all hover:-translate-y-1 shadow-sm border border-surface-container-high">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex gap-4">
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100">
                                        <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4dGC7-zzJDBIGjuA0GPnI81Qgkgy4Xea8YZKc3STXozqGmhy-fbNCx1DEEFp--6cBgDWbIiOE_Z3UICWxq028X_sa1azqUSopoeMVV7vG00qmgSG9kfZh3a0BM6202GuW-x8jN6e-gqEOL-Ich8vmFEKNyVrcdsvF0EFRQjbO6ZGK3F4udeYM278joBbwQjBrVJ6WOAvrtRTFHvrVLOa067rqy_jYhBFF5DnsZq8una2HQ9cuowy9Hu6u3aVe7M2rWH_fctCmZHRO" alt="Doctor"/>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg leading-tight">Dr. Michael Chen</h4>
                                        <p className="text-sm text-tertiary">General Physician</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className="material-symbols-outlined text-amber-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                            <span className="text-sm font-bold">4.8</span>
                                            <span className="text-xs text-slate-400">(240 reviews)</span>
                                        </div>
                                    </div>
                                </div>
                                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-secondary-container text-on-secondary-container">Available Now</span>
                            </div>
                            <button className="w-full py-3 rounded-xl doctor-card-gradient text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                                <span className="material-symbols-outlined text-xl">video_call</span>
                                Start Consultation
                            </button>
                        </div>

                        {/* Doctor Card 3 */}
                        <div className="bg-surface-container-lowest rounded-2xl p-6 transition-all hover:-translate-y-1 opacity-80 shadow-sm border border-surface-container-high">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex gap-4">
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden grayscale bg-slate-100">
                                        <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyrCPOjpdKiiAXlorJ6fvUCcBgIdmTSSUr7F_SQV1YLsrYnQvnkOpzYx1bfgQaFPtny1G0PBloEtrJ_wsIS0mDLJJFYpVRXF2wERUBAyT1BxLqWx4R6PJ2P64yTNZC2QU5gZB7PwT3wVPinKgx1JeG5XlxkzOtbdunqou0_eJoi3Ka8MqLtV7dBm09yKXG4NxtsP6dcaQau2b5TG5Hq7mDyrx5FaxINRpzmInqvSHpFT2Z5CPE2y5CdiSAdEgpk_8wjkfyZY1_J9gw" alt="Doctor"/>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg leading-tight">Dr. Elena Rodriguez</h4>
                                        <p className="text-sm text-tertiary">Pediatrician</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className="material-symbols-outlined text-amber-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                            <span className="text-sm font-bold">5.0</span>
                                            <span className="text-xs text-slate-400">(89 reviews)</span>
                                        </div>
                                    </div>
                                </div>
                                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface-container-high text-tertiary">In Session</span>
                            </div>
                            <button className="w-full py-3 rounded-xl bg-surface-container text-tertiary font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                                <span className="material-symbols-outlined text-xl">schedule</span>
                                Schedule Later
                            </button>
                        </div>
                    </div>
                </div>

                {/* Patient Context Sidebar (Right) */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-primary-container text-white rounded-[2rem] p-8 shadow-md">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="material-symbols-outlined">folder_shared</span>
                            <h3 className="font-bold text-xl">Auto-Shared Records</h3>
                        </div>
                        <p className="text-white/80 text-sm leading-relaxed mb-6">When you start a consultation, your verified doctor receives temporary access to these records for accurate diagnosis.</p>
                        
                        <div className="space-y-3">
                            <div className="flex items-center justify-between bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-sm">favorite</span>
                                    <span className="text-sm font-semibold">Live Heart Rate</span>
                                </div>
                                <div className="w-3 h-3 rounded-full bg-secondary shadow-[0_0_8px_rgba(0,106,103,1)] animate-pulse"></div>
                            </div>
                            <div className="flex items-center justify-between bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-sm">monitor_heart</span>
                                    <span className="text-sm font-semibold">ECG History</span>
                                </div>
                                <span className="material-symbols-outlined text-sm text-secondary-container">check_circle</span>
                            </div>
                            <div className="flex items-center justify-between bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-sm">pill</span>
                                    <span className="text-sm font-semibold">Active Medications</span>
                                </div>
                                <span className="material-symbols-outlined text-sm text-secondary-container">check_circle</span>
                            </div>
                        </div>

                        <button className="w-full mt-6 py-2 border border-white/30 text-white rounded-xl text-sm font-bold hover:bg-white/10 transition-colors">
                            Manage Permissions
                        </button>
                    </div>

                    {/* Quick Preparation Tips */}
                    <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-surface-container-high">
                        <h4 className="font-bold text-on-surface mb-4">Consultation Prep</h4>
                        <ul className="space-y-4">
                            <li className="flex gap-3 text-sm text-on-surface-variant">
                                <span className="material-symbols-outlined text-tertiary">lightbulb</span>
                                Find a quiet, well-lit room for video clarity.
                            </li>
                            <li className="flex gap-3 text-sm text-on-surface-variant">
                                <span className="material-symbols-outlined text-tertiary">checklist</span>
                                Note down your symptoms before the call starts.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
