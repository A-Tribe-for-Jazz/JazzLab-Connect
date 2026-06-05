import { supabase } from './supabase';

function getPrefScore(rank: number): number {
  if (rank === 1) return 100;
  if (rank === 2) return 80;
  if (rank === 3) return 60;
  if (rank === 4) return 40;
  if (rank === 5) return 20;
  if (rank === 6) return 10;
  if (rank === 7) return 5;
  return 0;
}

// Generate valid permutations of size k from eligible labs
function generatePermutations(eligibleLabs: any[], k: number): string[][] {
  const results: string[][] = [];
  function permute(current: string[]) {
    if (current.length === k) {
      results.push([...current]);
      return;
    }
    for (const lab of eligibleLabs) {
      if (!current.includes(lab.id)) {
        current.push(lab.id);
        permute(current);
        current.pop();
      }
    }
  }
  permute([]);
  return results;
}

export async function runAssignmentAlgorithm(campDayId: string) {
  try {
    if (!campDayId) {
      throw new Error("campDayId is required for running the assignment algorithm");
    }

    // 1. Fetch labs, time slots, and students attending this camp day
    const [{ data: labs }, { data: timeSlotsData }, { data: students }] = await Promise.all([
      supabase.from('labs').select('*').order('name'),
      supabase.from('time_slots').select('*').order('start_time'),
      supabase.from('students').select('*').eq('camp_day_id', campDayId)
    ]);

    if (!labs || !timeSlotsData || !students) {
      throw new Error("Failed to fetch required core data for algorithm");
    }

    const activeLabs = labs;
    const activeTimeSlots = timeSlotsData;

    // Filter students with names (same as frontend behavior)
    const activeStudents = students.filter(s => s.first_name?.trim() || s.last_name?.trim());
    if (activeStudents.length === 0) {
      return {
        success: true,
        totalAssigned: 0,
        flaggedCount: 0,
        top3Percentage: 0,
        lowPicksPercentage: 0
      };
    }

    const studentIds = activeStudents.map(s => s.id);

    // Fetch preferences for these students
    const { data: preferences, error: prefError } = await supabase
      .from('preferences')
      .select('*')
      .in('student_id', studentIds);

    if (prefError) throw prefError;

    // 2. Ensure lab sessions exist for this camp day
    const { data: existingSessions, error: sessError } = await supabase
      .from('lab_sessions')
      .select('*')
      .eq('camp_day_id', campDayId);

    if (sessError) throw sessError;

    const sessions = existingSessions || [];
    const missingSessionsToCreate: { lab_id: string; camp_day_id: string; time_slot_id: string }[] = [];
    
    for (const lab of activeLabs) {
      for (const slot of activeTimeSlots) {
        const hasSession = sessions.some(s => s.lab_id === lab.id && s.time_slot_id === slot.id);
        if (!hasSession) {
          missingSessionsToCreate.push({
            lab_id: lab.id,
            camp_day_id: campDayId,
            time_slot_id: slot.id
          });
        }
      }
    }

    if (missingSessionsToCreate.length > 0) {
      const { data: createdSessions, error: createSessError } = await supabase
        .from('lab_sessions')
        .insert(missingSessionsToCreate)
        .select('*');
      
      if (createSessError) throw createSessError;
      if (createdSessions) {
        sessions.push(...createdSessions);
      }
    }

    // Build mapping from lab_id and slot_id to lab_session_id
    const sessionLookup: { [key: string]: string } = {};
    sessions.forEach(s => {
      sessionLookup[`${s.lab_id}_${s.time_slot_id}`] = s.id;
    });

    // 3. Build maps for preferences and domain generation
    const studentPrefsMap: { [studentId: string]: { [labId: string]: number } } = {};
    (preferences || []).forEach(p => {
      if (!studentPrefsMap[p.student_id]) studentPrefsMap[p.student_id] = {};
      studentPrefsMap[p.student_id][p.lab_id] = p.rank;
    });

    const k = activeTimeSlots.length; // Number of rotations

    // Group students by age (or domain size) for MRV ordering
    // We sort students youngest/most restricted first
    const sortedStudents = [...activeStudents].sort((a, b) => {
      // Younger is more restricted (has fewer eligible labs)
      return (a.age ?? 0) - (b.age ?? 0);
    });
    // Build student preferences scores map for quick lookup
    const studentPrefsScores: { [studentId: string]: { [tupleKey: string]: number } } = {};
    for (const student of sortedStudents) {
      studentPrefsScores[student.id] = {};
      const eligible = activeLabs.filter(lab => {
        if (lab.min_age == null) return true;
        return student.age >= lab.min_age && student.age <= (lab.max_age ?? 999);
      });

      let studentEligible = eligible;
      if (studentEligible.length === 0) studentEligible = activeLabs;
      while (studentEligible.length < k) {
        studentEligible = [...studentEligible, ...studentEligible];
      }

      const rawTuples = generatePermutations(studentEligible, k);
      const prefMap = studentPrefsMap[student.id] || {};

      rawTuples.forEach(tuple => {
        let score = 0;
        tuple.forEach(labId => {
          if (prefMap[labId] !== undefined) {
            score += getPrefScore(prefMap[labId]);
          }
        });
        const key = tuple.join('_');
        studentPrefsScores[student.id][key] = score;
      });
    }

    // 4. Run Backtracking solver with Randomized Restarts
    const MAX_RESTARTS = 50;
    let finalAssignment: { [studentId: string]: string[] } | null = null;

    for (let restart = 0; restart < MAX_RESTARTS; restart++) {
      const studentTuples: { [studentId: string]: string[][] } = {};
      
      for (const student of sortedStudents) {
        const eligible = activeLabs.filter(lab => {
          if (lab.min_age == null) return true;
          return student.age >= lab.min_age && student.age <= (lab.max_age ?? 999);
        });

        let studentEligible = eligible;
        if (studentEligible.length === 0) studentEligible = activeLabs;
        while (studentEligible.length < k) {
          studentEligible = [...studentEligible, ...studentEligible];
        }

        const rawTuples = generatePermutations(studentEligible, k);
        const prefMap = studentPrefsMap[student.id] || {};

        const tupleWithScore = rawTuples.map(tuple => {
          const key = tuple.join('_');
          const baseScore = studentPrefsScores[student.id]?.[key] || 0;
          const score = baseScore + Math.random() * 0.5;
          return { tuple, score };
        });

        tupleWithScore.sort((a, b) => b.score - a.score);
        studentTuples[student.id] = tupleWithScore.map(x => x.tuple);
      }

      // Shuffle students within the same age group to diversify search order
      const ageGroups: { [age: number]: any[] } = {};
      for (const st of sortedStudents) {
        const age = st.age ?? 99;
        if (!ageGroups[age]) ageGroups[age] = [];
        ageGroups[age].push(st);
      }

      const shuffledStudents: any[] = [];
      const sortedAges = Object.keys(ageGroups).map(Number).sort((a, b) => a - b);
      for (const age of sortedAges) {
        const grp = [...ageGroups[age]];
        for (let i = grp.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [grp[i], grp[j]] = [grp[j], grp[i]];
        }
        shuffledStudents.push(...grp);
      }

      // Run CSP Backtracking Search
      const assignment: { [studentId: string]: string[] } = {};
      const capacities: { [slotId: string]: { [labId: string]: number } } = {};
      activeTimeSlots.forEach(slot => {
        capacities[slot.id] = {};
        activeLabs.forEach(lab => {
          capacities[slot.id][lab.id] = 0;
        });
      });

      let backtrackCount = 0;
      const BACKTRACK_LIMIT = 20000;

      function backtrack(index: number): boolean {
        if (index === shuffledStudents.length) return true;
        
        backtrackCount++;
        if (backtrackCount > BACKTRACK_LIMIT) return false;

        const student = shuffledStudents[index];
        const tuples = studentTuples[student.id];

        // LCV dynamic sorting
        const scoredTuples = tuples.map(tuple => {
          const [l1, l2, l3] = tuple;
          const cap1 = capacities[activeTimeSlots[0].id][l1] || 0;
          const cap2 = capacities[activeTimeSlots[1].id][l2] || 0;
          const cap3 = capacities[activeTimeSlots[2].id][l3] || 0;

          if (cap1 >= 20 || cap2 >= 20 || cap3 >= 20) {
            return { tuple, val: -Infinity };
          }

          const key = tuple.join('_');
          const utility = studentPrefsScores[student.id]?.[key] || 0;
          const capCost = cap1 + cap2 + cap3;
          // Subtract capacity cost penalty to prefer less loaded labs
          const val = utility - 15 * capCost;
          return { tuple, val };
        });

        const validTuples = scoredTuples
          .filter(x => x.val !== -Infinity)
          .sort((a, b) => b.val - a.val)
          .map(x => x.tuple);

        for (const tuple of validTuples) {
          const [l1, l2, l3] = tuple;

          // Assign
          assignment[student.id] = tuple;
          for (let slotIdx = 0; slotIdx < k; slotIdx++) {
            const labId = tuple[slotIdx];
            const slotId = activeTimeSlots[slotIdx].id;
            capacities[slotId][labId]++;
          }

          if (backtrack(index + 1)) return true;

          // Unassign
          delete assignment[student.id];
          for (let slotIdx = 0; slotIdx < k; slotIdx++) {
            const labId = tuple[slotIdx];
            const slotId = activeTimeSlots[slotIdx].id;
            capacities[slotId][labId]--;
          }
        }

        return false;
      }

      if (backtrack(0)) {
        finalAssignment = assignment;
        break;
      }
    }

    if (!finalAssignment) {
      throw new Error("Failed to find a valid assignment satisfying all constraints after multiple attempts.");
    }

    // 5. Clear previous assignments for this camp day only
    const sessionIds = sessions.map(s => s.id);
    if (sessionIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('assignments')
        .delete()
        .in('lab_session_id', sessionIds);
      if (deleteError) throw deleteError;
    }

    // Prepare new assignments list
    const assignmentsToInsert: any[] = [];
    Object.entries(finalAssignment).forEach(([studentId, tuple]) => {
      const prefMap = studentPrefsMap[studentId] || {};
      for (let slotIdx = 0; slotIdx < k; slotIdx++) {
        const labId = tuple[slotIdx];
        const slotId = timeSlotsData[slotIdx].id;
        const sessionId = sessionLookup[`${labId}_${slotId}`];
        if (sessionId) {
          assignmentsToInsert.push({
            student_id: studentId,
            lab_session_id: sessionId,
            pick_number: prefMap[labId] !== undefined ? prefMap[labId] : null
          });
        }
      }
    });

    // 6. Bulk Insert
    const chunkSize = 1000;
    for (let i = 0; i < assignmentsToInsert.length; i += chunkSize) {
      const chunk = assignmentsToInsert.slice(i, i + chunkSize);
      const { error: insertError } = await supabase.from('assignments').insert(chunk);
      if (insertError) throw insertError;
    }

    // 7. Calculate stats
    let top3Count = 0;
    let fallbackCount = 0;
    assignmentsToInsert.forEach(a => {
      if (a.pick_number !== null && a.pick_number <= 3) {
        top3Count++;
      } else if (a.pick_number === null) {
        fallbackCount++;
      }
    });

    const total = assignmentsToInsert.length || 1;
    const top3Percentage = Math.round((top3Count / total) * 100);
    const lowPicksPercentage = Math.round(((total - top3Count - fallbackCount) / total) * 100);

    const flaggedStudentIds = new Set(
      assignmentsToInsert.filter(a => a.pick_number === null).map(a => a.student_id)
    );

    return {
      success: true,
      totalAssigned: assignmentsToInsert.length,
      flaggedCount: flaggedStudentIds.size,
      top3Percentage,
      lowPicksPercentage
    };

  } catch (error) {
    console.error('Algorithm failed:', error);
    throw error;
  }
}
