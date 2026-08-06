import { Suspense } from 'react';
import CallClient from './CallClient';

export function generateStaticParams() {
  return [{ roomId: 'demo' }];
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading Call...</div>}>
      <CallClient />
    </Suspense>
  );
}
