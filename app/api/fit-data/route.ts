import { getOAuth2Client, getTokensForUser } from '@/lib/google';
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    try {
        console.log(`[API] Fetching fit data for user: ${user.id}`);
        const oauth2Client = await getTokensForUser(user.id);

        if (!oauth2Client) {
            console.warn(`[API] Google Fit not connected for user: ${user.id}`);
            return NextResponse.json({ 
                error: 'Google Fit not connected',
                code: 'GOOG_NOT_CONNECTED' 
            }, { status: 403 });
        }


        const fitness = google.fitness({ version: 'v1', auth: oauth2Client });

        // USE A 24-HOUR WINDOW
        const now = Date.now();
        const endTimeMillis = now.toString();
        const startTimeMillis = (now - 24 * 60 * 60 * 1000).toString(); // Last 24 hours

        console.log(`[API] Querying from ${new Date(parseInt(startTimeMillis)).toLocaleString()} to ${new Date(parseInt(endTimeMillis)).toLocaleString()}`);

        // Fetch Steps (Daily Total)
        const stepsResponse = await fitness.users.dataset.aggregate({
            userId: 'me',
            requestBody: {
                aggregateBy: [{ 
                    dataTypeName: 'com.google.step_count.delta'
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
        console.log(`[API] Found ${dailySteps} steps in the period.`);

        // Fetch Heart Rate (15 min intervals)
        const hrResponse = await fitness.users.dataset.aggregate({
            userId: 'me',
            requestBody: {
                aggregateBy: [{ 
                    dataTypeName: 'com.google.heart_rate.bpm'
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
        console.log(`[API] Found ${heartRateData.length} heart rate data points.`);

        // Fetch Sleep Data (Robust 48-hour check)
        const sleepStartTimeMillis = (now - 48 * 60 * 60 * 1000).toString();
        const sleepResponse = await fitness.users.dataset.aggregate({
            userId: 'me',
            requestBody: {
                aggregateBy: [{ 
                    dataTypeName: 'com.google.sleep.segment'
                }],
                // No bucketing for sleep here so we can process raw points across the 48h
                startTimeMillis: sleepStartTimeMillis,
                endTimeMillis
            }
        });

        let sleepMinutes = 0;
        const sleepPoints: any[] = [];
        
        // Extract all sleep points in the 48h window
        const sleepBuckets = sleepResponse.data.bucket;
        if (sleepBuckets) {
            for (let bucket of sleepBuckets) {
                bucket.dataset?.[0]?.point?.forEach(point => {
                    const sleepType = point.value?.[0]?.intVal;
                    if (sleepType && [2, 4, 5, 6].includes(sleepType)) {
                        sleepPoints.push({
                            start: parseInt(point.startTimeNanos!, 10) / 1000000,
                            end: parseInt(point.endTimeNanos!, 10) / 1000000
                        });
                    }
                });
            }
        }

        if (sleepPoints.length > 0) {
            // Sort points by end time (latest first)
            sleepPoints.sort((a, b) => b.end - a.end);

            // Logic: Take the most recent sleep point and sum everything within 14 hours of it
            // This captures a full night's sleep even if it spans across the 24h cutoff
            const latestSleepEnd = sleepPoints[0].end;
            let totalSleepMillis = 0;

            for (let p of sleepPoints) {
                // If this segment is part of the same "night" (within 14 hours of the latest point)
                if (latestSleepEnd - p.start < 14 * 60 * 60 * 1000) {
                    totalSleepMillis += (p.end - p.start);
                }
            }
            sleepMinutes = Math.round(totalSleepMillis / 60000);
        }

        const sleepHours = Math.floor(sleepMinutes / 60);
        const remainingMinutes = sleepMinutes % 60;

        return NextResponse.json({
            isAuthenticated: true,
            steps: dailySteps,
            heartRateData,
            sleep: {
                totalMinutes: sleepMinutes,
                formatted: sleepMinutes > 0 ? `${sleepHours}h ${remainingMinutes}m` : '0h 0m'
            }
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch fit data' }, { status: 500 });
    }
}
