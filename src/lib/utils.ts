import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimeString(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hour = parseInt(parts[0], 10);
  const minute = parts[1];
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  return `${hour}:${minute} ${ampm}`;
}

export function hasAnyStudentData(s: any): boolean {
  if (!s) return false;
  return !!(
    s.first_name?.trim() ||
    s.last_name?.trim() ||
    (s.age !== '' && s.age !== null && s.age !== undefined) ||
    s.last_grade_completed?.trim() ||
    s.home_zip_code?.trim() ||
    s.race?.trim() ||
    s.ethnicity?.trim() ||
    s.gender?.trim() ||
    s.first_language?.trim() ||
    s.notes?.trim()
  );
}
