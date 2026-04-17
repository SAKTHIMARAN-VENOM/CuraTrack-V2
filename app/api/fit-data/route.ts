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

        // Today's data (last 24 hours or since midnight)
        const endTime = new Date();
        const startTime = new Date();
        startTime.setHours(0, 0, 0, 0);

        // Fetch overall daily steps (1 bucket for the whole day)
        const stepsResponse = await fitness.users.dataset.aggregate({
            userId: 'me',
            requestBody: {
                aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
                bucketByTime: { durationMillis: 86400000 },
                startTimeMillis: startTime.getTime(),
                endTimeMillis: endTime.getTime()
            }
        });

        let dailySteps = 0;
        const stepsBucket = stepsResponse.data.bucket;
        if (stepsBucket && stepsBucket.length > 0 && stepsBucket[0].dataset[0]?.point?.length > 0) {
            for (let bucket of stepsBucket) {
                for (let point of bucket.dataset?.[0]?.point || []) {
                    for (let value of point.value || []) {
                        dailySteps += value.intVal || 0;
                    }
                }
            }
        }

        // Fetch Heart Rate Time Series (15 min buckets)
        // Duration: 15 minutes = 15 * 60 * 1000 = 900000 ms
        const hrResponse = await fitness.users.dataset.aggregate({
            userId: 'me',
            requestBody: {
                aggregateBy: [{ dataTypeName: 'com.google.heart_rate.bpm' }],
                bucketByTime: { durationMillis: 900000 },
                startTimeMillis: startTime.getTime(),
                endTimeMillis: endTime.getTime()
            }
        });

        const heartRateData: any[] = [];
        const hrBuckets = hrResponse.data.bucket;

        if (hrBuckets && hrBuckets.length > 0) {
            for (let bucket of hrBuckets) {
                const points = bucket.dataset?.[0]?.point;
                if (points && points.length > 0) {
                    const avgValue = points[0].value?.[0]?.fpVal;
                    if (avgValue) {
                        const hrTime = new Date(parseInt(bucket.startTimeMillis as string, 10));
                        heartRateData.push({
                            bpm: Math.round(avgValue),
                            time: hrTime.toISOString()
                        });
                    }
                }
            }
        }

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
