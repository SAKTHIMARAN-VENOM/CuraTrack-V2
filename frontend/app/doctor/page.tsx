// This route is intentionally public for hackathon demonstration. In production it should be protected with doctor authentication.

import DoctorPortal from '@/components/DoctorPortal';

export default function DoctorPage() {
  return <DoctorPortal />;
}
