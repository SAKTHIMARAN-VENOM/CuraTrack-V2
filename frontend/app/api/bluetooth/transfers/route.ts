import { NextResponse } from 'next/server';

interface TransferRecord {
  transferId: string;
  timestamp: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName?: string;
  package: any;
}

const activeTransfersStore: TransferRecord[] = [];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get('doctorId');

  if (doctorId) {
    const docTransfers = activeTransfersStore.filter(
      t => t.doctorId === doctorId || 
           t.doctorId === 'DOC-DEFAULT-001' || 
           t.doctorId === 'DOC-BLE-001' ||
           doctorId.startsWith('DOC-') ||
           t.doctorId.startsWith('DOC-')
    );
    return NextResponse.json({ success: true, transfers: docTransfers });
  }

  return NextResponse.json({ success: true, transfers: activeTransfersStore });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transferId, timestamp, patientId, doctorId, package: pkg } = body;

    const record: TransferRecord = {
      transferId: transferId || pkg?.transferId || 'TR-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      timestamp: timestamp || new Date().toISOString(),
      patientId: patientId || pkg?.patient?.patientId || 'PAT-001',
      patientName: pkg?.patient?.name || 'Patient',
      doctorId: doctorId || 'DOC-DEFAULT-001',
      package: pkg,
    };

    // Unshift to top of list
    activeTransfersStore.unshift(record);

    return NextResponse.json({ success: true, transfer: record });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to save transfer' }, { status: 500 });
  }
}
