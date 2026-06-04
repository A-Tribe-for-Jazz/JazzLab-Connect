-- Add new demographic and operational fields to the students table
ALTER TABLE students 
ADD COLUMN last_grade_completed TEXT,
ADD COLUMN home_zip_code TEXT,
ADD COLUMN race_ethnicity TEXT,
ADD COLUMN gender TEXT,
ADD COLUMN total_program_hours NUMERIC;
