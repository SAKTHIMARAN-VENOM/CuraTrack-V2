'use client';

import { use } from 'react';
import PassportViewPage from '../[passportId]/page';

export default function PassportTokenPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const paramsPromise = Promise.resolve({ passportId: token });
    return <PassportViewPage params={paramsPromise} />;
}
