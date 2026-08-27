import { SideNavBar } from '@/components/layout/SideNavBar';
import { TopNavBar } from '@/components/layout/TopNavBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { HealthProfileModal } from '@/components/HealthProfileModal';
import { ChatBubble } from '@/components/ChatBubble';

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div suppressHydrationWarning className="flex min-h-screen text-on-background bg-surface font-headline">
      <SideNavBar />
      
      <div suppressHydrationWarning className="flex-grow flex flex-col min-w-0">
        <TopNavBar />
        <HealthProfileModal />
        <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full space-y-8 pb-16">
          {children}
        </main>
        <ChatBubble />
      </div>

      <MobileNav />
    </div>
  );
}
