import ClientComponent from './ClientComponent';

export function generateStaticParams() {
    return [{ token: 'demo' }];
}

export default function PassportTokenPage() {
    return <ClientComponent />;
}

