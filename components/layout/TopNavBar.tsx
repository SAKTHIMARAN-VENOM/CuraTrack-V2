'use client';

export function TopNavBar() {
  return (
    <header className="flex justify-between items-center h-20 px-8 w-full sticky top-0 bg-white/80 backdrop-blur-xl z-20 font-headline font-semibold">
        <div className="flex items-center gap-4 flex-grow max-w-xl">
            <div className="relative w-full group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input 
                    className="w-full bg-slate-50 border-none rounded-2xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-blue-500/20 text-sm transition-all outline-none" 
                    placeholder="Search patient data or metrics..." 
                    type="text"
                />
            </div>
        </div>

        <div className="flex items-center gap-6 ml-8">
            {/* Glass Theme Toggle */}
            <button className="glass-toggle flex items-center gap-1 p-1 rounded-full shadow-sm">
                <div className="bg-white p-1.5 rounded-full shadow-sm text-primary">
                    <span className="material-symbols-outlined !text-sm">light_mode</span>
                </div>
                <div className="p-1.5 rounded-full text-slate-400">
                    <span className="material-symbols-outlined !text-sm">dark_mode</span>
                </div>
            </button>
            
            <div className="flex items-center gap-4">
                <button className="relative p-2 text-slate-500 hover:text-blue-500 transition-all">
                    <span className="material-symbols-outlined">notifications</span>
                    <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
                </button>
                <div className="h-10 w-10 rounded-xl overflow-hidden ring-2 ring-slate-100 ring-offset-2">
                    <img className="h-full w-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4KW19dhkISVyVCa8wUKjzCfIdJjD4C-GIuAybFNICL4jijFPR-5uzkLnzihS9CRvJJRIs9DYZmTuICkAnGaNmjutX8KsU_zLlSXroutRDc-ht1TKB7U2FwEZ35J2ju1DDctDK8Zr3FXiCG145P2Yy6nzQwaXApkvKlOaa8BE8hgs8BndTV-oZV1YNXZ21aV4IetFhbD3vM3wyhGulrbcttCSOB3I-LsiJWvwqAUgt3WDmNGbCCzfSo5vk2AZNwLDWpbHlTgnmnP_2" alt="User profile" />
                </div>
            </div>
        </div>
    </header>
  );
}
