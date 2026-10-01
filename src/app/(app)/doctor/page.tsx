import { DoctorDashboard } from "@/components/doctor-dashboard";
import { getDoctorVisits } from "@/lib/doctor-visits";
import { isLocalPreview, isLocalReadOnly } from "@/lib/supabase/config";

export default async function DoctorPage() {
  const visits = await getDoctorVisits();
  return <DoctorDashboard initialVisits={visits} localPreview={isLocalPreview} readOnly={isLocalReadOnly} />;
}
