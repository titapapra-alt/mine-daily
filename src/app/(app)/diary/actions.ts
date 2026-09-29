"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseEntry } from "@/lib/diary";
import { assertLocalWritable } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";
export async function createDiaryEntry(formData: FormData) { assertLocalWritable(); const values = parseEntry(formData); if (!values.title || !values.content || !values.entry_date) throw new Error("Date, title, and story are required."); const { supabase, userId } = await requireUser(); const { data, error } = await supabase.from("diary_entries").insert({ ...values, user_id: userId }).select("id").single(); if (error) throw error; revalidatePath("/"); revalidatePath("/diary"); revalidatePath("/calendar"); redirect(`/diary/${data.id}`); }
export async function updateDiaryEntry(id: string, formData: FormData) { assertLocalWritable(); const values = parseEntry(formData); const { supabase } = await requireUser(); const { error } = await supabase.from("diary_entries").update(values).eq("id", id); if (error) throw error; revalidatePath("/"); revalidatePath("/diary"); revalidatePath("/calendar"); redirect(`/diary/${id}`); }
export async function deleteDiaryEntry(id: string) { assertLocalWritable(); const { supabase } = await requireUser(); const { error } = await supabase.from("diary_entries").delete().eq("id", id); if (error) throw error; revalidatePath("/"); revalidatePath("/diary"); revalidatePath("/calendar"); redirect("/diary"); }
