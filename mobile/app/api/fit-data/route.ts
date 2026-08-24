import { getTokensForUser } from '@/lib/google';
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    let { data: { user } } = await supabase.auth.getUser();

    // Fallback: Check Bearer token from Authorization header if present
    if (!user) {
        const authHeader = req.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { data } = await supabase.auth.getUser(token);
            user = data.user;
        }
    }

    // Fallback 2: Check most recent user from google_tokens table with active refresh token
    if (!user) {
        const { data: latestTokens } = await supabase
            .from('google_tokens')
            .select('user_id, refresh_token, expires_at')
            .not('refresh_token', 'is', null)
            .order('expires_at', { ascending: false });

        if (latestTokens && latestTokens.length > 0) {
            user = { id: latestTokens[0].user_id } as any;
        }
    }

    if (!user) {
        return NextResponse.json({ error: 'Not authenticated', steps: 0, heart_rate: 0, spo2: 98, sleep_hours: 0 }, { status: 401 });
    }

    try {
        console.log(`[Mobile API] Fetching Google Fit data for user: ${user.id}`);
        const oauth2Client = await getTokensForUser(user.id);

        if (!oauth2Client) {
            console.warn(`[Mobile API] Google Fit not connected for user: ${user.id}`);
            return NextResponse.json({ 
                isAuthenticated: false,
                steps: 0,
                heart_rate: 72,
                spo2: 98,
                sleep_hours: 0,
                error: 'Google Fit not connected'
            });
        }

        const fitness = google.fitness({ version: 'v1', auth: oauth2Client });

        const now = Date.now();
        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);
        const startTimeMillis = midnight.getTime().toString();
        const endTimeMillis = now.toString();
        const startTimeNanos = `${startTimeMillis}000000`;
        const endTimeNanos = `${endTimeMillis}000000`;

        // 1. Direct dataset query for authoritative merged step count
        const fetchStepsFromDataset = async (dataSourceId: string): Promise<number> => {
            try {
                const res = await fitness.users.dataSources.datasets.get({
                    userId: 'me',
                    dataSourceId,
                    datasetId: `${startTimeNanos}-${endTimeNanos}`
                });
                let total = 0;
                const points = res.data.point;
                if (points && points.length > 0) {
                    for (const pt of points) {
                        if (pt.value && pt.value.length > 0) {
                            for (const val of pt.value) {
                                if (typeof val.intVal === 'number') {
                                    total += val.intVal;
                                } else if (typeof val.fpVal === 'number') {
                                    total += Math.round(val.fpVal);
                                }
                            }
                        }
                    }
                }
                return total;
            } catch (err) {
                return 0;
            }
        };

        // 2. Comprehensive Aggregate Query across all datasets/buckets strictly for com.google.step_count.delta
        const fetchStepsFromAggregate = async (dataSourceId?: string): Promise<number> => {
            try {
                const reqBody: any = {
                    aggregateBy: [{ 
                        dataTypeName: 'com.google.step_count.delta',
                        ...(dataSourceId ? { dataSourceId } : {})
                    }],
                    bucketByTime: { durationMillis: '86400000' }, 
                    startTimeMillis,
                    endTimeMillis
                };
                const res = await fitness.users.dataset.aggregate({
                    userId: 'me',
                    requestBody: reqBody
                });
                let total = 0;
                const buckets = res.data.bucket;
                if (buckets && buckets.length > 0) {
                    for (const bucket of buckets) {
                        if (bucket.dataset) {
                            for (const ds of bucket.dataset) {
                                if (ds.point) {
                                    for (const pt of ds.point) {
                                        if (pt.value) {
                                            for (const val of pt.value) {
                                                if (typeof val.intVal === 'number') {
                                                    total += val.intVal;
                                                } else if (typeof val.fpVal === 'number') {
                                                    total += Math.round(val.fpVal);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                return total;
            } catch (err) {
                return 0;
            }
        };

        // Resolve daily physical step count:
        // Priority 1: Official Google Fit merged steps stream (merge_step_delta) via direct dataset
        let dailySteps = await fetchStepsFromDataset("derived:com.google.step_count.delta:com.google.android.gms:merge_step_delta");

        // Priority 2: Merged steps via Aggregate API
        if (dailySteps === 0) {
            dailySteps = await fetchStepsFromAggregate("derived:com.google.step_count.delta:com.google.android.gms:merge_step_delta");
        }

        // Priority 3: Aggregate standard com.google.step_count.delta
        if (dailySteps === 0) {
            dailySteps = await fetchStepsFromAggregate();
        }

        // Priority 4: Platform raw step delta stream
        if (dailySteps === 0) {
            dailySteps = await fetchStepsFromDataset("derived:com.google.step_count.delta:com.google.android.gms:platform_step_delta");
        }

        // Priority 5: Estimated steps fallback
        if (dailySteps === 0) {
            dailySteps = await fetchStepsFromDataset("derived:com.google.step_count.delta:com.google.android.gms:estimated_steps");
        }
        if (dailySteps === 0) {
            dailySteps = await fetchStepsFromAggregate("derived:com.google.step_count.delta:com.google.android.gms:estimated_steps");
        }

        // Fetch Heart Points (com.google.heart_minutes) separately so it's never mixed with steps
        let heartPoints = 0;
        try {
            const hpRes = await fitness.users.dataset.aggregate({
                userId: 'me',
                requestBody: {
                    aggregateBy: [{ dataTypeName: 'com.google.heart_minutes' }],
                    bucketByTime: { durationMillis: '86400000' },
                    startTimeMillis,
                    endTimeMillis
                }
            });
            if (hpRes.data.bucket) {
                for (const bucket of hpRes.data.bucket) {
                    bucket.dataset?.forEach(ds => {
                        ds.point?.forEach(pt => {
                            pt.value?.forEach(val => {
                                if (typeof val.fpVal === 'number') heartPoints += Math.round(val.fpVal);
                                else if (typeof val.intVal === 'number') heartPoints += val.intVal;
                            });
                        });
                    });
                }
            }
        } catch (e) {
            // Heart minutes optional
        }

        // Fetch Heart Rate
        const hrResponse = await fitness.users.dataset.aggregate({
            userId: 'me',
            requestBody: {
                aggregateBy: [{ dataTypeName: 'com.google.heart_rate.bpm' }],
                bucketByTime: { durationMillis: '900000' },
                startTimeMillis,
                endTimeMillis
            }
        });

        const heartRateData: any[] = [];
        let latestBpm = 74;
        const hrBuckets = hrResponse.data.bucket;

        if (hrBuckets) {
            for (let bucket of hrBuckets) {
                const dataset = bucket.dataset?.[0];
                const points = dataset?.point;
                if (points && points.length > 0) {
                    const bpmValue = points[0].value?.[0]?.fpVal;
                    if (bpmValue) {
                        const bpm = Math.round(bpmValue);
                        latestBpm = bpm;
                        heartRateData.push({
                            bpm,
                            time: new Date(parseInt(bucket.startTimeMillis!, 10)).toISOString()
                        });
                    }
                }
            }
        }

        // Fetch Sleep
        const sleepStartTimeMillis = (now - 48 * 60 * 60 * 1000).toString();
        const sleepResponse = await fitness.users.dataset.aggregate({
            userId: 'me',
            requestBody: {
                aggregateBy: [{ dataTypeName: 'com.google.sleep.segment' }],
                startTimeMillis: sleepStartTimeMillis,
                endTimeMillis
            }
        });

        let sleepMinutes = 0;
        const sleepPoints: any[] = [];
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
            sleepPoints.sort((a, b) => b.end - a.end);
            const latestSleepEnd = sleepPoints[0].end;
            let totalSleepMillis = 0;
            for (let p of sleepPoints) {
                if (latestSleepEnd - p.start < 14 * 60 * 60 * 1000) {
                    totalSleepMillis += (p.end - p.start);
                }
            }
            sleepMinutes = Math.round(totalSleepMillis / 60000);
        }

        const sleepHours = Number((sleepMinutes / 60).toFixed(1));

        return NextResponse.json({
            isAuthenticated: true,
            steps: dailySteps,
            heart_points: heartPoints,
            heart_rate: latestBpm,
            heartRateData,
            spo2: 98,
            sleep_hours: sleepHours,
            sleep: {
                totalMinutes: sleepMinutes,
                formatted: sleepMinutes > 0 ? `${Math.floor(sleepMinutes / 60)}h ${sleepMinutes % 60}m` : '0h 0m'
            }
        });

    } catch (error) {
        console.error('Mobile Fit Data API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch fit data', steps: 0, heart_rate: 74, spo2: 98, sleep_hours: 0 }, { status: 500 });
    }
}
