-- 1. Custom Types & Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('master_admin', 'partner', 'educator');
CREATE TYPE attendance_status AS ENUM ('present', 'absent');

-- 2. Organizations Table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Users Profiles Table (extending Supabase auth.users)
-- Note: auth.users is handled by Supabase, we create a public.profiles table that links to it.
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL, -- Only for partners
    full_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Labs Table
CREATE TABLE labs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    capacity_per_session INTEGER DEFAULT 20,
    min_age INTEGER DEFAULT 10,
    max_age INTEGER DEFAULT 18,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Lab Instructors Join Table
CREATE TABLE lab_instructors (
    lab_id UUID REFERENCES labs(id) ON DELETE CASCADE,
    educator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (lab_id, educator_id)
);

-- 6. Camp Days Table
CREATE TABLE camp_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Camp Day Organizations Join Table
CREATE TABLE camp_day_organizations (
    camp_day_id UUID REFERENCES camp_days(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    PRIMARY KEY (camp_day_id, organization_id)
);

-- 8. Time Slots Table
CREATE TABLE time_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    name TEXT NOT NULL, -- e.g. "Session 1"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Lab Sessions Table
CREATE TABLE lab_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_id UUID REFERENCES labs(id) ON DELETE CASCADE,
    camp_day_id UUID REFERENCES camp_days(id) ON DELETE CASCADE,
    time_slot_id UUID REFERENCES time_slots(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (lab_id, camp_day_id, time_slot_id)
);

-- 10. Students Table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    camp_day_id UUID REFERENCES camp_days(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    age INTEGER NOT NULL,
    sibling_group_id TEXT,
    -- Demographics (Required for grant reporting, only visible to Master Admin)
    race TEXT,
    ethnicity TEXT,
    gender TEXT,
    household_income_tier TEXT,
    zip_code TEXT,
    special_needs_notes TEXT,
    parent_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Preferences Table
CREATE TABLE preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    lab_id UUID REFERENCES labs(id) ON DELETE CASCADE,
    rank INTEGER CHECK (rank >= 1 AND rank <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, lab_id),
    UNIQUE(student_id, rank)
);

-- 12. Assignments Table
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    lab_session_id UUID REFERENCES lab_sessions(id) ON DELETE CASCADE,
    pick_number INTEGER, -- 1-5 if they got a preference, or NULL if fallback
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, lab_session_id)
);

-- 13. Attendance Table
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    lab_session_id UUID REFERENCES lab_sessions(id) ON DELETE CASCADE,
    status attendance_status DEFAULT 'absent',
    marked_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(student_id, lab_session_id)
);

-- 14. Row-Level Security (RLS) setup

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_day_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Helper Function for role
CREATE OR REPLACE FUNCTION auth_user_role() RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_user_org() RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Master Admin Policies (can see/do everything)
CREATE POLICY "Master admins can do anything" ON organizations FOR ALL USING (auth_user_role() = 'master_admin');
CREATE POLICY "Master admins can do anything" ON profiles FOR ALL USING (auth_user_role() = 'master_admin');
CREATE POLICY "Master admins can do anything" ON labs FOR ALL USING (auth_user_role() = 'master_admin');
CREATE POLICY "Master admins can do anything" ON lab_instructors FOR ALL USING (auth_user_role() = 'master_admin');
CREATE POLICY "Master admins can do anything" ON camp_days FOR ALL USING (auth_user_role() = 'master_admin');
CREATE POLICY "Master admins can do anything" ON camp_day_organizations FOR ALL USING (auth_user_role() = 'master_admin');
CREATE POLICY "Master admins can do anything" ON time_slots FOR ALL USING (auth_user_role() = 'master_admin');
CREATE POLICY "Master admins can do anything" ON lab_sessions FOR ALL USING (auth_user_role() = 'master_admin');
CREATE POLICY "Master admins can do anything" ON students FOR ALL USING (auth_user_role() = 'master_admin');
CREATE POLICY "Master admins can do anything" ON preferences FOR ALL USING (auth_user_role() = 'master_admin');
CREATE POLICY "Master admins can do anything" ON assignments FOR ALL USING (auth_user_role() = 'master_admin');
CREATE POLICY "Master admins can do anything" ON attendance FOR ALL USING (auth_user_role() = 'master_admin');

-- Partner Policies (can see their own org, their students, read public info)
CREATE POLICY "Partners view their own org" ON organizations FOR SELECT USING (id = auth_user_org());
CREATE POLICY "Partners view their own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Partners view their org students" ON students FOR ALL USING (organization_id = auth_user_org());
CREATE POLICY "Partners view their students preferences" ON preferences FOR ALL USING (student_id IN (SELECT id FROM students WHERE organization_id = auth_user_org()));
CREATE POLICY "Partners view their students assignments" ON assignments FOR SELECT USING (student_id IN (SELECT id FROM students WHERE organization_id = auth_user_org()));
CREATE POLICY "Partners view labs" ON labs FOR SELECT USING (true);
CREATE POLICY "Partners view camp_days" ON camp_days FOR SELECT USING (true);
CREATE POLICY "Partners view time_slots" ON time_slots FOR SELECT USING (true);
CREATE POLICY "Partners view lab_sessions" ON lab_sessions FOR SELECT USING (true);

-- Educator Policies
CREATE POLICY "Educators view their own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Educators view assigned labs" ON labs FOR SELECT USING (id IN (SELECT lab_id FROM lab_instructors WHERE educator_id = auth.uid()));
CREATE POLICY "Educators view assigned lab_sessions" ON lab_sessions FOR SELECT USING (lab_id IN (SELECT lab_id FROM lab_instructors WHERE educator_id = auth.uid()));
CREATE POLICY "Educators view assignments for their sessions" ON assignments FOR SELECT USING (lab_session_id IN (SELECT id FROM lab_sessions WHERE lab_id IN (SELECT lab_id FROM lab_instructors WHERE educator_id = auth.uid())));
CREATE POLICY "Educators view attendance for their sessions" ON attendance FOR ALL USING (lab_session_id IN (SELECT id FROM lab_sessions WHERE lab_id IN (SELECT lab_id FROM lab_instructors WHERE educator_id = auth.uid())));
CREATE POLICY "Educators view students in their sessions" ON students FOR SELECT USING (id IN (SELECT student_id FROM assignments WHERE lab_session_id IN (SELECT id FROM lab_sessions WHERE lab_id IN (SELECT lab_id FROM lab_instructors WHERE educator_id = auth.uid()))));
-- Note: Educators should NOT have access to student demographic fields. Supabase doesn't easily do column-level security in RLS, 
-- but since educators only use SELECT, we rely on the UI/API client not to fetch those fields, or we could create a secure view.
-- For now, the application logic will simply not query demographics for educators.

-- Trigger to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', COALESCE((new.raw_user_meta_data->>'role')::user_role, 'partner'::user_role));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
