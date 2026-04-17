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

        // USE A ROLLING 24-HOUR WINDOW TO AVOID SERVER TIMEZONE CUTOFFS
        const now = Date.now();
        const endTimeMillis = now.toString();
        const startTimeMillis = (now - 24 * 60 * 60 * 1000).toString(); // Last 24 hours

        // Fetch Steps (Daily Total)
        const stepsResponse = await fitness.users.dataset.aggregate({
            userId: 'me',
            requestBody: {
                // Use 'derived' for more accurate merged data from phone/watch
                aggregateBy: [{ 
                    dataTypeName: 'com.google.step_count.delta',
                    dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps' 
                }],
                bucketByTime: { durationMillis: '86400000' }, 
                startTimeMillis,
                endTimeMillis
            }
        });

        let dailySteps = 0;
        const stepsBucket = stepsResponse.data.bucket;
        if (stepsBucket && stepsBucket.length > 0) {
            stepsBucket.forEach(bucket => {
                bucket.dataset?.[0]?.point?.forEach(point => {
                    point.value?.forEach(val => { dailySteps += val.intVal || 0; });
                });
            });
        }

        // Fetch Heart Rate (15 min intervals)
        const hrResponse = await fitness.users.dataset.aggregate({
            userId: 'me',
            requestBody: {
                aggregateBy: [{ 
                    dataTypeName: 'com.google.heart_rate.bpm',
                    // Prioritizing the boAt/CoveIoT source which seems to be the primary wearable data
                    dataSourceId: 'derived:com.google.heart_rate.bpm:com.coveiot.android.boat:GoogleFitDataManager - heart rate' 
                }],
                bucketByTime: { durationMillis: '900000' }, // 15 mins
                startTimeMillis,
                endTimeMillis
            }
        });

        const heartRateData: any[] = [];
        const hrBuckets = hrResponse.data.bucket;

        if (hrBuckets) {
            for (let bucket of hrBuckets) {
                const dataset = bucket.dataset?.[0];
                const points = dataset?.point;
                
                if (points && points.length > 0) {
                    // Points in aggregate HR usually contain [avg, max, min]
                    // The first value (index 0) is the Average BPM
                    const bpmValue = points[0].value?.[0]?.fpVal;
                    
                    if (bpmValue) {
                        heartRateData.push({
                            bpm: Math.round(bpmValue),
                            // Convert string millis to ISO for the client to parse locally
                            time: new Date(parseInt(bucket.startTimeMillis!, 10)).toISOString()
                        });
                    }
                }
            }
        }

        // Sort data by time to be absolutely sure the graph draws correctly
        heartRateData.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        return NextResponse.json({
            isAuthenticated: true,
            steps: dailySteps,
            heartRateData
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch fit data' }, { status: 500 });
    }
}
