import { Suspense } from 'react';
import ClientComponent from './ClientComponent';

export function generateStaticParams() {
    return [{ token: 'demo' }];
}

function PassportLoadingFallback() {
    return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl p-12 max-w-lg w-full text-center">
                <div className="w-16 h-16 mx-auto mb-6 primary-gradient rounded-2xl flex items-center justify-center text-white animate-pulse">
                    <span className="material-symbols-outlined text-3xl">verified_user</span>
                </div>
                <div className="space-y-3">
                    <div className="h-6 bg-surface-container rounded-lg w-3/4 mx-auto animate-pulse"></div>
                    <div className="h-4 bg-surface-container rounded-lg w-1/2 mx-auto animate-pulse"></div>
                    <div className="h-28 bg-surface-container rounded-2xl w-full animate-pulse mt-6"></div>
                    <div className="h-28 bg-surface-container rounded-2xl w-full animate-pulse"></div>
                </div>
                <p className="text-tertiary font-semibold mt-8 text-sm">Verifying secure access...</p>
            </div>
        </div>
    );
}

export default function PassportTokenPage() {
    return (
        <Suspense fallback={<PassportLoadingFallback />}>
            <ClientComponent />
        </Suspense>
    );
}
