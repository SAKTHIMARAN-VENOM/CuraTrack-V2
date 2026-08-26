import { SideNavBar } from '@/components/layout/SideNavBar';
import { TopNavBar } from '@/components/layout/TopNavBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { HealthProfileModal } from '@/components/HealthProfileModal';
import { ChatBubble } from '@/components/ChatBubble';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div suppressHydrationWarning className="flex min-h-screen text-on-background bg-surface">
      <SideNavBar />
      
      <div suppressHydrationWarning className="flex-grow flex flex-col min-w-0">
        <TopNavBar />
        <HealthProfileModal />
        {children}
        <ChatBubble />
      </div>

      <MobileNav />
    </div>
  );
}
