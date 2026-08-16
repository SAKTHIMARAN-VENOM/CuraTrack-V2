import { NextResponse } from 'next/server';

interface DoctorPresence {
  id: string;
  name: string;
  role: 'doctor';
  specialization: string;
  hospitalName: string;
  availabilityState: 'AVAILABLE' | 'OFFLINE';
  isAvailable: boolean;
  rssi: number;
  lastSeen: number;
}

// Global in-memory presence store for Next.js runtime
const activeDoctorsMap = new Map<string, DoctorPresence>();
const HEARTBEAT_TTL_MS = 15000;

export async function GET() {
  const now = Date.now();
  const validDoctors: DoctorPresence[] = [];

  for (const [id, doc] of Array.from(activeDoctorsMap.entries())) {
    if (doc.isAvailable && doc.availabilityState === 'AVAILABLE' && (now - doc.lastSeen) < HEARTBEAT_TTL_MS) {
      validDoctors.push(doc);
    } else if ((now - doc.lastSeen) >= HEARTBEAT_TTL_MS) {
      activeDoctorsMap.delete(id);
    }
  }

  return NextResponse.json({ success: true, doctors: validDoctors });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { doctorId, doctorName, specialization, hospitalName, availabilityState } = body;

    if (!doctorId) {
      return NextResponse.json({ error: 'doctorId is required' }, { status: 400 });
    }

    if (availabilityState === 'OFFLINE') {
      activeDoctorsMap.delete(doctorId);
      return NextResponse.json({ success: true, status: 'OFFLINE' });
    }

    const doc: DoctorPresence = {
      id: doctorId,
      name: doctorName || 'Dr. David Ross',
      role: 'doctor',
      specialization: specialization || 'Cardiology & Internal Medicine',
      hospitalName: hospitalName || 'CuraTrack Clinical Center',
      availabilityState: 'AVAILABLE',
      isAvailable: true,
      rssi: -55,
      lastSeen: Date.now(),
    };

    activeDoctorsMap.set(doctorId, doc);
    return NextResponse.json({ success: true, status: 'AVAILABLE', doctor: doc });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update presence' }, { status: 500 });
  }
}
