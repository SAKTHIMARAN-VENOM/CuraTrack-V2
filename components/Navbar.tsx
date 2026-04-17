import Link from "next/link";

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-nav flex justify-between items-center h-20 px-8 w-full font-['Manrope'] font-semibold">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 primary-gradient rounded-xl flex items-center justify-center text-white">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            health_and_safety
          </span>
        </div>
        <span className="text-2xl font-bold tracking-tighter text-primary">
          CuraTrack
        </span>
      </div>
      <nav className="hidden md:flex items-center gap-10">
        <Link
          className="text-primary border-b-2 border-primary transition-all pb-1"
          href="#"
        >
          Home
        </Link>
        <Link
          className="text-slate-400 hover:text-primary transition-all pb-1"
          href="#features"
        >
          Features
        </Link>
        <Link
          className="text-slate-400 hover:text-primary transition-all pb-1"
          href="#doctors"
        >
          Doctors
        </Link>
        <Link
          className="text-slate-400 hover:text-primary transition-all pb-1"
          href="#security"
        >
          Security
        </Link>
      </nav>
      <div className="flex items-center gap-6">
        <div className="hidden lg:flex items-center bg-surface-container-low px-4 py-2 rounded-full ring-2 ring-transparent focus-within:ring-primary/20 transition-all">
          <span className="material-symbols-outlined text-outline text-sm mr-2">
            search
          </span>
          <input
            className="bg-transparent border-none focus:ring-0 p-0 text-sm w-48 placeholder:text-outline-variant outline-none"
            placeholder="Search records..."
            type="text"
          />
        </div>
        <div className="flex items-center gap-4">
          <button className="material-symbols-outlined text-outline hover:text-primary transition-colors">
            notifications
          </button>
          <Link
            href="/login"
            className="bg-surface-container-high px-6 py-2.5 rounded-full text-on-surface font-semibold hover:bg-surface-container-highest transition-colors inline-block"
          >
            Login
          </Link>
        </div>
      </div>
    </header>
  );
}
