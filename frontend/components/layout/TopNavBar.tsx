'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function TopNavBar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth-status')
      .then(r => r.json())
      .then(d => { if (d.isAuthenticated) setUser(d.user); });
  }, []);

  const userName = user?.name?.split(' ')[0] || 'User';

  return (
    <header className="flex justify-between items-center h-20 px-8 w-full sticky top-0 bg-white/80 backdrop-blur-xl z-20 font-headline font-semibold">
        <div className="flex items-center gap-4 flex-grow">
            <h1 className="text-xl font-bold text-on-surface">Hello, {userName}</h1>
        </div>

        <div className="flex items-center gap-6 ml-8">
            <div className="flex items-center gap-4">
                <button 
                  onClick={() => router.push('/alerts')}
                  className="relative p-2 text-slate-500 hover:text-blue-500 transition-all"
                >
                    <span className="material-symbols-outlined">notifications</span>
                    <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
                </button>
                <button 
                  onClick={() => router.push('/profile')}
                  className="h-10 w-10 rounded-xl overflow-hidden ring-2 ring-slate-100 ring-offset-2 bg-slate-100 flex items-center justify-center text-slate-400 hover:ring-blue-500/50 transition-all cursor-pointer"
                >
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                </button>
            </div>
        </div>
    </header>
  );
}
