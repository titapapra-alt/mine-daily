import { MonthYearPicker } from "@/components/month-year-picker";

export function DateFilter({ value }: { value: string }) { return <MonthYearPicker className="diary-month-picker" name="month" value={value} label="Filter by month and year" />; }
