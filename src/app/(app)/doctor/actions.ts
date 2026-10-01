"use server";

import { revalidatePath } from "next/cache";
import { assertLocalWritable } from "@/lib/supabase/config";
import { mapDoctorVisit } from "@/lib/doctor-visits";
import { requireUser } from "@/lib/supabase/server";
import type { DoctorVisitInput } from "@/types/doctor";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const selectFields = "id, visit_date, location, department, doctor_name, description, net_price";

const cleanOptional = (value: string, limit: number) => {
  const clean = value.trim();
  if (clean.length > limit) throw new Error(`Text must not exceed ${limit.toLocaleString()} characters.`);
  return clean || null;
};

const validateVisit = (visit: DoctorVisitInput) => {
  const parsedDate = new Date(`${visit.visit_date}T00:00:00Z`);
  if (!datePattern.test(visit.visit_date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== visit.visit_date) throw new Error("Please enter a valid visit date.");
  const location = visit.location.trim();
  if (!location || location.length > 200) throw new Error("Location is required and must not exceed 200 characters.");
  if (visit.net_price !== null && (!Number.isFinite(visit.net_price) || visit.net_price < 0 || visit.net_price > 100000000)) throw new Error("Net price must be between 0 and 100,000,000.");
  return {
    visit_date: visit.visit_date,
    location,
    department: cleanOptional(visit.department, 200),
    doctor_name: cleanOptional(visit.doctor_name, 200),
    description: cleanOptional(visit.description, 3000),
    net_price: visit.net_price,
  };
};

export async function createDoctorVisitAction(visit: DoctorVisitInput) {
  assertLocalWritable();
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.from("doctor_visits").insert({ ...validateVisit(visit), user_id: userId }).select(selectFields).single();
  if (error) throw error;
  revalidatePath("/doctor");
  return mapDoctorVisit(data);
}

export async function updateDoctorVisitAction(id: string, visit: DoctorVisitInput) {
  assertLocalWritable();
  if (!uuidPattern.test(id)) throw new Error("Invalid doctor visit ID.");
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.from("doctor_visits").update(validateVisit(visit)).eq("id", id).eq("user_id", userId).select(selectFields).single();
  if (error) throw error;
  revalidatePath("/doctor");
  return mapDoctorVisit(data);
}

export async function deleteDoctorVisitAction(id: string) {
  assertLocalWritable();
  if (!uuidPattern.test(id)) throw new Error("Invalid doctor visit ID.");
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.from("doctor_visits").delete().eq("id", id).eq("user_id", userId).select("id").single();
  if (error) throw error;
  revalidatePath("/doctor");
  return data.id as string;
}
