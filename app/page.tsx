import Link from 'next/link';

export default function LandingPage() {
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 glass-nav flex justify-between items-center h-20 px-8 w-full font-headline font-semibold">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 primary-gradient rounded-xl flex items-center justify-center text-white">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>health_and_safety</span>
          </div>
          <span className="text-2xl font-bold tracking-tighter text-primary">CuraTrack</span>
        </div>
        <nav className="hidden md:flex items-center gap-10">
          <a className="text-primary border-b-2 border-primary transition-all pb-1" href="#">Home</a>
          <a className="text-slate-400 hover:text-primary transition-all pb-1" href="#features">Features</a>
          <a className="text-slate-400 hover:text-primary transition-all pb-1" href="#doctors">Doctors</a>
          <a className="text-slate-400 hover:text-primary transition-all pb-1" href="#security">Security</a>
        </nav>
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center bg-surface-container-low px-4 py-2 rounded-full ring-2 ring-transparent focus-within:ring-primary/20 transition-all">
            <span className="material-symbols-outlined text-outline text-sm mr-2">search</span>
            <input className="bg-transparent border-none focus:ring-0 p-0 text-sm w-48 outline-none placeholder:text-outline-variant" placeholder="Search records..." type="text" />
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="bg-surface-container-high px-6 py-2.5 rounded-full text-on-surface font-semibold hover:bg-surface-container-highest transition-colors">
              Login
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-20">
        <section className="relative min-h-[921px] flex items-center px-8 lg:px-24 overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-16 items-center w-full max-w-7xl mx-auto">
            <div className="z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-container rounded-full mb-6">
                <span className="material-symbols-outlined text-on-secondary-container text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                <span className="text-xs font-bold text-on-secondary-container tracking-wider uppercase">Next-Gen Patient Care</span>
              </div>
              <h1 className="font-headline text-6xl md:text-7xl font-extrabold tracking-tight text-on-surface mb-6 leading-[1.1]">
                Your Health, <span className="text-primary italic">Unified.</span>
              </h1>
              <p className="text-xl text-tertiary leading-relaxed mb-10 max-w-lg">
                Centralized health tracking for wearables, records, and telemedicine. Experience the precision of clinical data with the empathy of human-centric design.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/login" className="primary-gradient text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-primary/20 flex items-center gap-2 group transition-transform active:scale-95">
                  Get Started
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
                <button className="bg-surface-container-lowest border border-outline-variant/30 text-on-surface px-8 py-4 rounded-xl font-bold text-lg hover:bg-surface-container-low transition-colors">View Demo</button>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-secondary/5 rounded-full blur-3xl"></div>
              <div className="relative z-10 bg-surface-container-lowest rounded-3xl p-4 shadow-2xl border border-outline-variant/10">
                <img alt="Dashboard" className="rounded-2xl w-full object-cover aspect-video shadow-inner" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNo05845FCjeVsd1fGzRLj0AsFJlhOh5wW_SAgTP69I0uYluyJM-ZDrWU3ypy47XruRlXlPi9ji4aNJ01DvLqShSkYLjROqn7izv9H7Ot-rcAXsdLMwUz1iBlzYBpebQW1KDN7-OD6v6eKqdCB419qopAfo48nurPypDlWr8zpWkEeIJYYUvXxgPyugJL2tqrMITPCbUqK_GvY-ApAa98sKJiNSLuyrlOTV9aJi8aBnzLSjAorDb3fZfX6L-nffJJ5u2eSxB2sh1ZG"/>
                <div className="absolute -bottom-8 -left-8 bg-surface-container-lowest p-6 rounded-2xl shadow-xl border border-outline-variant/10 w-64">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-tertiary">HEART RATE</span>
                    <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                  </div>
                  <div className="flex items-end gap-2 mb-4">
                    <span className="text-4xl font-headline font-extrabold text-on-surface">72</span>
                    <span className="text-tertiary font-bold mb-1">BPM</span>
                  </div>
                  <div className="h-12 w-full flex items-end gap-1">
                    <div className="w-full bg-secondary-container h-8 rounded-sm"></div>
                    <div className="w-full bg-secondary-container h-10 rounded-sm"></div>
                    <div className="w-full bg-secondary h-12 rounded-sm"></div>
                    <div className="w-full bg-secondary-container h-6 rounded-sm"></div>
                    <div className="w-full bg-secondary-container h-9 rounded-sm"></div>
                    <div className="w-full bg-secondary-container h-7 rounded-sm"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
