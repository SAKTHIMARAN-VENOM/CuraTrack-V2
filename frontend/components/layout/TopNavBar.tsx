'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function TopNavBar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth-status')
      .then(r => r.json())
      .then(d => { if (d.isAuthenticated) setUser(d.user); })
      .catch(() => {});
  }, []);

  const userName = user?.name?.split(' ')[0] || 'User';

  return (
    <header className="flex justify-between items-center h-20 px-8 w-full sticky top-0 bg-white shadow-sm z-20 font-headline font-semibold border-b border-outline-variant/10">
        <div className="flex items-center gap-4 flex-grow">
            <h1 className="text-xl font-black text-on-surface tracking-tight italic">
              Hello, <span className="text-primary not-italic">{userName}</span>
            </h1>
        </div>

        <div className="flex items-center gap-6 ml-8">
            <div className="flex items-center gap-4">
                <button 
                  onClick={() => router.push('/alerts')}
                  className="relative p-2.5 text-tertiary hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                >
                    <span className="material-symbols-outlined">notifications</span>
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
                </button>
                <button 
                  onClick={() => router.push('/profile')}
                  className="h-11 w-11 rounded-2xl overflow-hidden ring-2 ring-surface-container/50 ring-offset-2 bg-surface-container flex items-center justify-center text-tertiary hover:ring-primary/40 hover:bg-primary/5 transition-all cursor-pointer"
                >
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                </button>
            </div>
        </div>
    </header>
  );
}
