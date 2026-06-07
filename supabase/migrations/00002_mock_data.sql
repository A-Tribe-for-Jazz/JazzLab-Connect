-- Mock Data Generation

-- 1. Insert 10 Camp Days
INSERT INTO camp_days (id, date) VALUES
  ('11111111-1111-1111-1111-111111111111', '2024-06-10'),
  ('11111111-1111-1111-1111-111111111112', '2024-06-11'),
  ('11111111-1111-1111-1111-111111111113', '2024-06-12'),
  ('11111111-1111-1111-1111-111111111114', '2024-06-13'),
  ('11111111-1111-1111-1111-111111111115', '2024-06-14'),
  ('11111111-1111-1111-1111-111111111116', '2024-06-15');

-- 2. Insert 3 Time Slots
INSERT INTO time_slots (id, start_time, end_time, name) VALUES
  ('22222222-2222-2222-2222-222222222221', '10:00:00', '10:50:00', 'Session 1'),
  ('22222222-2222-2222-2222-222222222222', '11:00:00', '11:50:00', 'Session 2'),
  ('22222222-2222-2222-2222-222222222223', '12:30:00', '13:20:00', 'Session 3');

-- 3. Insert 10 Organizations
INSERT INTO organizations (id, name, contact_name, contact_email, contact_phone) VALUES
  ('33333333-3333-3333-3333-333333333331', 'Columbus Youth Foundation', 'Alice Smith', 'alice@cyf.org', '555-0101'),
  ('33333333-3333-3333-3333-333333333332', 'Eastside Boys & Girls Club', 'Bob Jones', 'bob@ebgc.org', '555-0102'),
  ('33333333-3333-3333-3333-333333333333', 'Downtown Arts Center', 'Charlie Brown', 'charlie@dac.org', '555-0103'),
  ('33333333-3333-3333-3333-333333333334', 'Westside Community Hub', 'Diana Prince', 'diana@wch.org', '555-0104'),
  ('33333333-3333-3333-3333-333333333335', 'North Arts Initiative', 'Evan Wright', 'evan@nai.org', '555-0105'),
  ('33333333-3333-3333-3333-333333333336', 'Southside Youth Group', 'Fiona Gallagher', 'fiona@syg.org', '555-0106'),
  ('33333333-3333-3333-3333-333333333337', 'Franklin County Scholars', 'George King', 'george@fcs.org', '555-0107'),
  ('33333333-3333-3333-3333-333333333338', 'Jazz For Kids', 'Hannah Lee', 'hannah@jfk.org', '555-0108'),
  ('33333333-3333-3333-3333-333333333339', 'Urban Strings', 'Ian Malcolm', 'ian@urbanstrings.org', '555-0109'),
  ('33333333-3333-3333-3333-333333333310', 'Creative Youth Alliance', 'Jane Doe', 'jane@cya.org', '555-0110');

-- 4. Assign Organizations to Camp Days (Some organizations attend multiple days, some just one)
INSERT INTO camp_day_organizations (camp_day_id, organization_id) VALUES
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331'),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333332'),
  ('11111111-1111-1111-1111-111111111112', '33333333-3333-3333-3333-333333333333'),
  ('11111111-1111-1111-1111-111111111112', '33333333-3333-3333-3333-333333333334'),
  ('11111111-1111-1111-1111-111111111113', '33333333-3333-3333-3333-333333333335'),
  ('11111111-1111-1111-1111-111111111114', '33333333-3333-3333-3333-333333333336'),
  ('11111111-1111-1111-1111-111111111114', '33333333-3333-3333-3333-333333333337'),
  ('11111111-1111-1111-1111-111111111115', '33333333-3333-3333-3333-333333333338'),
  ('11111111-1111-1111-1111-111111111115', '33333333-3333-3333-3333-333333333339'),
  ('11111111-1111-1111-1111-111111111116', '33333333-3333-3333-3333-333333333310');

-- 5. Insert 10 Labs
INSERT INTO labs (id, name, description, capacity_per_session, min_age, max_age) VALUES
  ('44444444-4444-4444-4444-444444444441', 'Intro to Jazz Piano', 'Learn the basics of jazz piano.', 15, 10, 18),
  ('44444444-4444-4444-4444-444444444442', 'Rhythm & Percussion', 'Drumming and rhythm section fundamentals.', 20, 10, 18),
  ('44444444-4444-4444-4444-444444444443', 'Vocal Improvisation', 'Scat singing and vocal techniques.', 15, 12, 18),
  ('44444444-4444-4444-4444-444444444444', 'Brass Ensemble', 'Trumpet and trombone section playing.', 20, 12, 18),
  ('44444444-4444-4444-4444-444444444445', 'Digital Audio Production', 'Making beats and recording using DAWs.', 15, 14, 18),
  ('44444444-4444-4444-4444-444444444446', 'Jazz History & Culture', 'Exploring the roots and legends of jazz.', 25, 10, 18),
  ('44444444-4444-4444-4444-444444444447', 'Woodwinds Clinic', 'Saxophone, clarinet, and flute techniques.', 20, 10, 18),
  ('44444444-4444-4444-4444-444444444448', 'Bass Lines & Grooves', 'Electric and upright bass foundations.', 15, 12, 18),
  ('44444444-4444-4444-4444-444444444449', 'Songwriting Workshop', 'Write your own original jazz composition.', 15, 14, 18),
  ('44444444-4444-4444-4444-444444444410', 'Stage Performance', 'Mastering stage presence and playing live.', 20, 10, 18);

-- 6. Note: To generate Users (Admins, Partners, Educators) you will need to use Supabase Auth API
-- since passwords must be hashed. We cannot easily insert plain auth.users here. 
-- However, we can create the lab_sessions for all days and all time slots.

DO $$
DECLARE
  v_day_id UUID;
  v_time_id UUID;
  v_lab_id UUID;
BEGIN
  FOR v_day_id IN SELECT id FROM camp_days LOOP
    FOR v_time_id IN SELECT id FROM time_slots LOOP
      FOR v_lab_id IN SELECT id FROM labs LOOP
        INSERT INTO lab_sessions (lab_id, camp_day_id, time_slot_id)
        VALUES (v_lab_id, v_day_id, v_time_id);
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$;
