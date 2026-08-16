import { NextResponse } from 'next/server';

interface ConnectionRequest {
  requestId: string;
  patientId: string;
  patientName: string;
  targetDoctorId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  timestamp: number;
}

const activeRequestsMap = new Map<string, ConnectionRequest>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get('doctorId');
  const requestId = searchParams.get('requestId');

  if (requestId) {
    const req = activeRequestsMap.get(requestId);
    if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    return NextResponse.json({ success: true, request });
  }

  if (doctorId) {
    const pending = Array.from(activeRequestsMap.values()).filter(
      r => r.targetDoctorId === doctorId && r.status === 'PENDING'
    );
    return NextResponse.json({ success: true, requests: pending });
  }

  return NextResponse.json({ success: true, requests: Array.from(activeRequestsMap.values()) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'CREATE') {
      const { patientId, patientName, targetDoctorId } = body;
      const requestId = 'REQ-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const req: ConnectionRequest = {
        requestId,
        patientId,
        patientName: patientName || 'Patient',
        targetDoctorId,
        status: 'PENDING',
        timestamp: Date.now(),
      };
      activeRequestsMap.set(requestId, req);
      return NextResponse.json({ success: true, requestId, request: req });
    }

    if (action === 'RESPOND') {
      const { requestId, status } = body;
      const existing = activeRequestsMap.get(requestId);
      if (!existing) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      existing.status = status;
      activeRequestsMap.set(requestId, existing);
      return NextResponse.json({ success: true, request: existing });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to process request' }, { status: 500 });
  }
}
