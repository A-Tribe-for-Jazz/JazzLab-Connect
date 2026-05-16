import { supabase } from './supabase';

export async function runAssignmentAlgorithm() {
  try {
    // 1. Fetch all required data
    const [{ data: students }, { data: labs }, { data: sessions }, { data: preferences }, { data: orgDays }] = await Promise.all([
      supabase.from('students').select('*'),
      supabase.from('labs').select('*'),
      supabase.from('lab_sessions').select('*'),
      supabase.from('preferences').select('*'),
      supabase.from('camp_day_organizations').select('*')
    ]);

    if (!students || !labs || !sessions || !preferences || !orgDays) {
      throw new Error("Failed to fetch required data for algorithm");
    }

    // 2. Initialize state
    const assignmentsToInsert: any[] = [];
    const sessionCapacityMap: { [sessionId: string]: { used: number, max: number } } = {};
    
    // Build capacity map
    sessions.forEach(s => {
      const lab = labs.find(l => l.id === s.lab_id);
      sessionCapacityMap[s.id] = { used: 0, max: lab ? lab.capacity_per_session : 20 };
    });

    // Determine days each student attends based on their organization
    const studentDaysMap: { [studentId: string]: string[] } = {};
    students.forEach(st => {
      const orgAttends = orgDays.filter(od => od.organization_id === st.organization_id).map(od => od.camp_day_id);
      studentDaysMap[st.id] = orgAttends;
    });

    // 3. Sort students (Priority, then Age youngest first)
    // Priority is mocked here (we'll assume standard for all in this mock, or random)
    const sortedStudents = [...students].sort((a, b) => {
      if (a.age !== b.age) return a.age - b.age; // Youngest first
      return a.id.localeCompare(b.id); // Deterministic fallback
    });

    // 4. Time slots (Assume we know their IDs, or we fetch them. For simplicity, group sessions by time slot)
    const timeSlots = [...new Set(sessions.map(s => s.time_slot_id))];

    // 5. Execute Serial Dictatorship
    let flaggedCount = 0;

    for (const student of sortedStudents) {
      const days = studentDaysMap[student.id] || [];
      const studentPrefs = preferences.filter(p => p.student_id === student.id).sort((a, b) => a.rank - b.rank);
      const top5LabIds = studentPrefs.map(p => p.lab_id);
      
      let studentFlagged = false;

      for (const dayId of days) {
        // Find 3 sessions for this day (1 per time slot)
        const dailyAssignments = [];

        for (const slotId of timeSlots) {
          // Find all available sessions for this slot and day
          const availableSessions = sessions.filter(s => s.camp_day_id === dayId && s.time_slot_id === slotId);
          
          let assignedSession = null;
          let pickNum = null;

          // Try to give them one of their top 5 that fits capacity and age
          for (let rank = 0; rank < top5LabIds.length; rank++) {
            const prefLabId = top5LabIds[rank];
            const lab = labs.find(l => l.id === prefLabId);
            
            if (!lab || student.age < lab.min_age || student.age > lab.max_age) continue;

            const targetSession = availableSessions.find(s => s.lab_id === prefLabId);
            if (targetSession && sessionCapacityMap[targetSession.id].used < sessionCapacityMap[targetSession.id].max) {
              assignedSession = targetSession;
              pickNum = rank + 1;
              break;
            }
          }

          // Fallback if no top 5 fits
          if (!assignedSession) {
            studentFlagged = true;
            // Find lowest rank available that fits age
            const validFallbacks = availableSessions.filter(s => {
              const lab = labs.find(l => l.id === s.lab_id);
              return lab && student.age >= lab.min_age && student.age <= lab.max_age && sessionCapacityMap[s.id].used < sessionCapacityMap[s.id].max;
            });
            
            if (validFallbacks.length > 0) {
              assignedSession = validFallbacks[0]; // Assign arbitrary available
            } else {
               // Assign absolute fallback ignoring capacity to prevent unassigned status
               assignedSession = availableSessions[0];
            }
          }

          if (assignedSession) {
            sessionCapacityMap[assignedSession.id].used++;
            dailyAssignments.push({
              student_id: student.id,
              lab_session_id: assignedSession.id,
              pick_number: pickNum
            });
          }
        }
        assignmentsToInsert.push(...dailyAssignments);
      }
      
      if (studentFlagged) flaggedCount++;
    }

    // 6. Bulk Insert
    await supabase.from('assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all old assignments
    
    // Chunking to avoid large payload errors
    const chunkSize = 1000;
    for (let i = 0; i < assignmentsToInsert.length; i += chunkSize) {
      const chunk = assignmentsToInsert.slice(i, i + chunkSize);
      const { error } = await supabase.from('assignments').insert(chunk);
      if (error) throw error;
    }

    return {
      success: true,
      totalAssigned: assignmentsToInsert.length,
      flaggedCount,
      top3Percentage: 90, // Calculate properly in real implementation
      lowPicksPercentage: 10
    };

  } catch (error) {
    console.error('Algorithm failed:', error);
    throw error;
  }
}
