import { NextResponse } from 'next/server';

const FALLBACK_INSIGHTS = [
  {
    category: 'Heart Rate',
    icon: 'favorite',
    status: 'Normal',
    statusColor: 'green',
    insight: 'Your resting heart rate is within the healthy range (60-80 BPM).',
    tip: 'Maintain regular cardio exercises to keep your cardiovascular endurance optimal.'
  },
  {
    category: 'Activity',
    icon: 'directions_walk',
    status: 'On Track',
    statusColor: 'green',
    insight: 'Daily step count is progressing towards your target goal.',
    tip: 'Take a short 10-minute walk after meals to improve glucose metabolism.'
  },
  {
    category: 'Sleep',
    icon: 'bedtime',
    status: 'Optimal',
    statusColor: 'green',
    insight: 'Consistent sleep duration recorded over recent cycles.',
    tip: 'Limit blue light exposure 30 minutes before bed to enhance deep sleep phases.'
  }
];

export async function GET() {
  try {
    const fastApiUrl = process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const backendRes = await fetch(`${fastApiUrl}/api/health-insights`, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      });
      clearTimeout(timeoutId);

      if (backendRes.ok) {
        const data = await backendRes.json();
        if (data.insights && Array.isArray(data.insights) && data.insights.length > 0) {
          return NextResponse.json(data);
        }
      }
    } catch (backendErr) {
      // Backend not running or timeout; return fallback smoothly
    }

    return NextResponse.json({
      insights: FALLBACK_INSIGHTS,
      source: 'fallback'
    });
  } catch (err: any) {
    return NextResponse.json({
      insights: FALLBACK_INSIGHTS,
      error: err?.message
    });
  }
}
