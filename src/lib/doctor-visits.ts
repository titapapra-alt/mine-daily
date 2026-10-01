import { isLocalPreview } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";
import type { DoctorVisit } from "@/types/doctor";

type RawDoctorVisit = Omit<DoctorVisit, "department" | "doctor_name" | "description" | "net_price"> & {
  department: string | null;
  doctor_name: string | null;
  description: string | null;
  net_price: number | string | null;
};

export const mapDoctorVisit = (row: RawDoctorVisit): DoctorVisit => ({
  ...row,
  department: row.department ?? "",
  doctor_name: row.doctor_name ?? "",
  description: row.description ?? "",
  net_price: row.net_price === null ? null : Number(row.net_price),
});

async function getLocalPreviewDoctorVisits() {
  const [{ readFile }, { join }] = await Promise.all([import("node:fs/promises"), import("node:path")]);
  const contents = await readFile(join(process.cwd(), "source data", "doctor-visits.local.json"), "utf8");
  return JSON.parse(contents) as DoctorVisit[];
}

export async function getDoctorVisits() {
  if (isLocalPreview) return getLocalPreviewDoctorVisits();
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("doctor_visits")
    .select("id, visit_date, location, department, doctor_name, description, net_price")
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapDoctorVisit(row as RawDoctorVisit));
}
