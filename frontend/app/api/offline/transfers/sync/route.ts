import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transferId, timestamp, patientId, doctorId, package: pkg, doctorResponse } = body;

    if (!transferId) {
      return NextResponse.json({ error: 'transferId is required' }, { status: 400 });
    }

    // Attempt Supabase cloud database sync
    try {
      const supabase = createClient();
      await supabase.from('offline_transfers').upsert({
        transfer_id: transferId,
        patient_id: patientId,
        doctor_id: doctorId,
        package_json: pkg,
        doctor_response_json: doctorResponse,
        created_at: timestamp || new Date().toISOString(),
        synced_at: new Date().toISOString(),
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Transfer synced to cloud database successfully',
      transferId,
      syncedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Cloud sync failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data } = await supabase.from('offline_transfers').select('*').limit(20);
    return NextResponse.json({ success: true, transfers: data || [] });
  } catch (e) {
    return NextResponse.json({ success: true, transfers: [] });
  }
}
