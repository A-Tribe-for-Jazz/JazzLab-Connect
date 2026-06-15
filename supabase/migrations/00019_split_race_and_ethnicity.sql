-- 00019_split_race_and_ethnicity.sql
-- Split race_ethnicity into two separate columns: race and ethnicity

ALTER TABLE public.students ADD COLUMN race TEXT;
ALTER TABLE public.students ADD COLUMN ethnicity TEXT;

-- Migrate existing data
-- If the current value is 'Hispanic or Latino' (which is an ethnicity), set ethnicity and leave race null
UPDATE public.students 
SET ethnicity = 'Hispanic or Latino' 
WHERE race_ethnicity = 'Hispanic or Latino';

-- For all other races, copy it to the race column and set ethnicity to 'Not Hispanic or Latino'
UPDATE public.students 
SET race = race_ethnicity,
    ethnicity = 'Not Hispanic or Latino'
WHERE race_ethnicity IS NOT NULL AND race_ethnicity != 'Hispanic or Latino';

-- Drop old column
ALTER TABLE public.students DROP COLUMN race_ethnicity;
