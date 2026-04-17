import { getOAuth2Client } from '@/lib/google';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { google } from 'googleapis';

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const tokenStr = cookieStore.get('tokens')?.value;

    if (!tokenStr) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    try {
        const tokens = JSON.parse(tokenStr);
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials(tokens);
        const fitness = google.fitness({ version: 'v1', auth: oauth2Client });

        // LIST ALL HEART RATE DATA SOURCES
        const sourcesResponse = await fitness.users.dataSources.list({ userId: 'me' });
        
        const hrSources = sourcesResponse.data.dataSource?.filter(s => 
            s.dataType?.name === 'com.google.heart_rate.bpm'
        ) || [];

        return NextResponse.json({
            debug_info: "Listing all Heart Rate Sources to find the one with 11:30am data",
            sources: hrSources.map(s => ({
                id: s.dataStreamId,
                name: s.dataStreamName,
                type: s.type,
                product: s.device?.model || 'Unknown Device'
            }))
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
