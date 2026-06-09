-- Add performance indexes for foreign keys to optimize multi-tenant query speeds
CREATE INDEX IF NOT EXISTS idx_students_organization_id ON students(organization_id);
CREATE INDEX IF NOT EXISTS idx_students_camp_day_id ON students(camp_day_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_preferences_student_id ON preferences(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_student_id ON assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_camp_day_organizations_org_day ON camp_day_organizations(organization_id, camp_day_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_organization_id ON staff_members(organization_id);
