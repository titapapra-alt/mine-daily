export type DoctorVisit = {
  id: string;
  visit_date: string;
  location: string;
  department: string;
  doctor_name: string;
  description: string;
  net_price: number | null;
};

export type DoctorVisitInput = Omit<DoctorVisit, "id">;
