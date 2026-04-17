import { SideNavBar } from '@/components/layout/SideNavBar';
import { TopNavBar } from '@/components/layout/TopNavBar';
import { MobileNav } from '@/components/layout/MobileNav';

// All dashboard pages require auth — never prerender statically
export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen text-on-background bg-surface">
      <SideNavBar />
      
      <div className="flex-grow flex flex-col min-w-0">
        <TopNavBar />
        {children}
      </div>

      <MobileNav />
    </div>
  );
}
