'use client';

export default function AlertsPage() {
    return (
        <div className="p-8 max-w-7xl mx-auto w-full">
            {/* Page Header */}
            <div className="mb-10">
                <div className="flex items-baseline gap-3">
                    <h2 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">Health Alerts</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container text-xs font-bold">4 New</span>
                </div>
                <p className="text-tertiary mt-2 text-lg">Track critical health activities and stay informed</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-10 overflow-x-auto pb-2 no-scrollbar">
                <button className="px-6 py-2.5 rounded-full bg-primary text-white font-semibold text-sm shadow-md shadow-primary/20 transition-transform active:scale-95">All</button>
                <button className="px-6 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant font-semibold text-sm hover:bg-surface-container-highest transition-colors">Medications</button>
                <button className="px-6 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant font-semibold text-sm hover:bg-surface-container-highest transition-colors">Outbreaks</button>
                <button className="px-6 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant font-semibold text-sm hover:bg-surface-container-highest transition-colors">Goals</button>
                <button className="px-6 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant font-semibold text-sm hover:bg-surface-container-highest transition-colors">Appointments</button>
            </div>

            {/* Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Alerts List */}
                <div className="lg:col-span-8 space-y-6">
                    {/* 1. MEDICATION TRACKER */}
                    <div className="group relative bg-white p-6 rounded-3xl transition-all duration-300 hover:translate-y-[-4px] shadow-sm border border-surface-container">
                        <div className="absolute left-0 top-1/4 bottom-1/4 w-1.5 bg-amber-400 rounded-r-full"></div>
                        <div className="flex flex-col sm:flex-row gap-6">
                            <div className="w-14 h-14 shrink-0 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                                <span className="material-symbols-outlined text-3xl">pill</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="text-xl font-bold font-headline text-on-surface">Missed Medication</h3>
                                    <span className="text-xs font-medium text-slate-400">1 hour ago</span>
                                </div>
                                <p className="text-on-surface-variant text-sm leading-relaxed mb-6">You missed your 8:00 AM dose of <span className="font-semibold text-on-surface">Lisinopril</span>. Timely dosage is critical for managing your blood pressure levels.</p>
                                <div className="flex flex-wrap gap-3">
                                    <button className="px-5 py-2 rounded-xl bg-amber-100 text-amber-700 text-sm font-bold hover:bg-amber-200 transition-colors">Log Now</button>
                                    <button className="px-5 py-2 rounded-xl bg-surface-container-low text-on-surface-variant text-sm font-bold hover:bg-surface-container-high transition-colors">Remind Me</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. DISEASE OUTBREAK */}
                    <div className="group relative bg-white p-6 rounded-3xl transition-all duration-300 hover:translate-y-[-4px] shadow-sm border border-surface-container">
                        <div className="absolute left-0 top-1/4 bottom-1/4 w-1.5 bg-red-500 rounded-r-full"></div>
                        <div className="flex flex-col sm:flex-row gap-6">
                            <div className="w-14 h-14 shrink-0 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
                                <span className="material-symbols-outlined text-3xl">warning</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-bold font-headline text-on-surface">Dengue Alert in Your Area</h3>
                                        <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-tighter">High Priority</span>
                                    </div>
                                    <span className="text-xs font-medium text-slate-400">30 mins ago</span>
                                </div>
                                <p className="text-on-surface-variant text-sm leading-relaxed mb-6">Increased dengue cases reported within <span className="font-semibold">5 km radius</span>. Please ensure there is no standing water around your premises.</p>
                                <div className="flex flex-wrap gap-3">
                                    <button className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">View Precautions</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. MISSED GOALS */}
                    <div className="group relative bg-white p-6 rounded-3xl transition-all duration-300 hover:translate-y-[-4px] shadow-sm border border-surface-container">
                        <div className="absolute left-0 top-1/4 bottom-1/4 w-1.5 bg-sky-500 rounded-r-full"></div>
                        <div className="flex flex-col sm:flex-row gap-6">
                            <div className="w-14 h-14 shrink-0 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600">
                                <span className="material-symbols-outlined text-3xl">steps</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="text-xl font-bold font-headline text-on-surface">Daily Step Goal Not Met</h3>
                                    <span className="text-xs font-medium text-slate-400">2 hours ago</span>
                                </div>
                                <p className="text-on-surface-variant text-sm leading-relaxed mb-4">You reached only <span className="font-bold">4,200 / 8,000</span> steps today. A short 15-minute walk can help you bridge the gap!</p>
                                <div className="mb-6 bg-surface-container rounded-full h-2.5 overflow-hidden">
                                    <div className="bg-sky-500 h-full rounded-full transition-all duration-1000" style={{ width: '52.5%' }}></div>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <button className="px-5 py-2 rounded-xl bg-sky-100 text-sky-700 text-sm font-bold hover:bg-sky-200 transition-colors">View Activity</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. MISSED APPOINTMENT */}
                    <div className="group relative bg-white p-6 rounded-3xl transition-all duration-300 hover:translate-y-[-4px] shadow-sm border border-surface-container">
                        <div className="absolute left-0 top-1/4 bottom-1/4 w-1.5 bg-purple-500 rounded-r-full"></div>
                        <div className="flex flex-col sm:flex-row gap-6">
                            <div className="w-14 h-14 shrink-0 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                                <span className="material-symbols-outlined text-3xl">calendar_today</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="text-xl font-bold font-headline text-on-surface">Missed Appointment</h3>
                                    <span className="text-xs font-medium text-slate-400">Yesterday</span>
                                </div>
                                <p className="text-on-surface-variant text-sm leading-relaxed mb-6">You missed your consultation with <span className="font-semibold">Dr. Sharma</span> at 10:30 AM. Missing regular check-ups can delay your recovery progress.</p>
                                <div className="flex flex-wrap gap-3">
                                    <button className="px-5 py-2 rounded-xl bg-purple-100 text-purple-700 text-sm font-bold hover:bg-purple-200 transition-colors">Reschedule</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Summary Panel */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-surface-container">
                        <h3 className="text-xl font-extrabold font-headline mb-6 text-on-surface">Alert Summary</h3>
                        
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                                    <span className="text-sm font-medium text-tertiary">Total Alerts</span>
                                </div>
                                <span className="text-2xl font-black font-headline text-on-surface">4</span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-amber-500">pill</span>
                                        <span className="text-sm font-medium">Missed Medications</span>
                                    </div>
                                    <span className="font-bold">1</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-sky-500">fitness_center</span>
                                        <span className="text-sm font-medium">Missed Goals</span>
                                    </div>
                                    <span className="font-bold">1</span>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-surface-container">
                                <h4 className="text-xs uppercase tracking-widest font-black text-slate-400 mb-4">Upcoming Actions</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-4 p-3 bg-surface rounded-xl border-l-4 border-primary">
                                        <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center">
                                            <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>event</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold truncate">Dr. Lee Follow-up</p>
                                            <p className="text-[10px] text-tertiary">Today, 2:30 PM</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-3 bg-surface rounded-xl border-l-4 border-amber-400">
                                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-amber-600 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>medical_information</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold truncate">2pm Dose</p>
                                            <p className="text-[10px] text-tertiary">Lisinopril 10mg</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mini Map Card for Outbreak */}
                    <div className="bg-white rounded-3xl overflow-hidden shadow-sm p-4 border border-surface-container">
                        <h4 className="text-sm font-bold font-headline mb-3 px-2">Outbreak Proximity</h4>
                        <div className="aspect-video rounded-2xl overflow-hidden relative grayscale hover:grayscale-0 transition-all duration-700">
                            <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBMd3gkZNXnA-Kawwp5Fw1YAi5_ZIxREHcDHHdrZKnCZ0-PYLyb_dKEGVYxjOkY48NJSxA9XuM6PXprxEnazHLbOE7lZwVpBSrKyI2cEycanw6ZkaCM29WdBA3hp6fw5-oPvgm-KTMXYRNSAA2Lb1e4hM1d9C0pv_RW39rr0FiA7HpU-btVtBRcVzHaULkUex6mUSKAh6A2oXTyJUMofr24wu-cZwXZ2i7LV4_PGSVNw5xAhmfj0zdb2vxf3eY6Uvwu6M8vOnHZ2_11" alt="Map"/>
                            <div className="absolute inset-0 bg-red-500/10 pointer-events-none"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <div className="relative">
                                    <div className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-20"></div>
                                    <div className="w-6 h-6 bg-red-600 rounded-full border-4 border-white shadow-lg relative z-10"></div>
                                </div>
                            </div>
                        </div>
                        <div className="p-2 mt-2">
                            <p className="text-[11px] text-tertiary text-center">Safety Radius: <span className="text-red-500 font-bold">Infected Zone</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
