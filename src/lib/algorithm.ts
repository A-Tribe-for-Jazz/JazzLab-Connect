import { supabase } from './supabase';
import { hasAnyStudentData } from './utils';

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

    // 1. Fetch labs, time slots, students, and organizations attending this camp day
    const [labsRes, slotsRes, studentsRes, orgsData] = await Promise.all([
      supabase.from('labs').select('*').order('name'),
      supabase.from('time_slots').select('*').order('start_time'),
      supabase.from('students').select('*').eq('camp_day_id', campDayId),
      (async () => {
        try {
          const { data, error } = await supabase.from('organizations').select('id, group_together');
          if (error) {
            const { data: fallbackData } = await supabase.from('organizations').select('id');
            return fallbackData || [];
          }
          return data || [];
        } catch {
          const { data: fallbackData } = await supabase.from('organizations').select('id');
          return fallbackData || [];
        }
      })()
    ]);

    const labs = labsRes.data;
    const timeSlotsData = slotsRes.data;
    const students = studentsRes.data;
    const orgs = orgsData;

    if (!labs || !timeSlotsData || !students) {
      throw new Error("Failed to fetch required core data for algorithm");
    }

    // Process organizations to find those with active cohort grouping
    const groupedOrgIds = new Set<string>();
    (orgs || []).forEach((org: any) => {
      const dbVal = org.group_together;
      const localFallback = localStorage.getItem(`group_together_fallback_${org.id}`) === 'true';
      if (dbVal || (dbVal === undefined && localFallback) || localFallback) {
        groupedOrgIds.add(org.id);
      }
    });

    const activeLabs = labs;
    const activeTimeSlots = timeSlotsData;

    // Filter students with any user data (same as frontend behavior)
    const activeStudents = students.filter(hasAnyStudentData);
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

      // Deduplicate and pad eligible labs to ensure at least k unique labs
      const uniqueEligible = eligible.filter((lab, index, self) =>
        self.findIndex(l => l.id === lab.id) === index
      );

      let studentEligible = [...uniqueEligible];
      if (studentEligible.length < k) {
        for (const lab of activeLabs) {
          if (!studentEligible.some(l => l.id === lab.id)) {
            studentEligible.push(lab);
            if (studentEligible.length >= k) break;
          }
        }
      }
      if (studentEligible.length < k) {
        studentEligible = activeLabs;
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

    // 4. Run Backtracking solver with Randomized Restarts and Capacity Slack Fallback
    const MAX_SLACK = 5; // Allow going up to +5 over capacity if absolutely necessary
    let finalAssignment: { [studentId: string]: string[] } | null = null;
    let capacitySlack = 0;
    let solved = false;

    for (let slack = 0; slack <= MAX_SLACK; slack++) {
      capacitySlack = slack;

      // Try strictness 2 (must get top 1 or 2 pick), then 1 (must get at least one choice), then 0 (no force/full fallback)
      for (const strictness of [2, 1, 0]) {
        // Run restarts to find a solution under this strictness/slack combination
        for (let restart = 0; restart < 15; restart++) {
          const studentTuples: { [studentId: string]: string[][] } = {};
          
          for (const student of sortedStudents) {
            const eligible = activeLabs.filter(lab => {
              if (lab.min_age == null) return true;
              return student.age >= lab.min_age && student.age <= (lab.max_age ?? 999);
            });

            // Deduplicate and pad eligible labs to ensure at least k unique labs
            const uniqueEligible = eligible.filter((lab, index, self) =>
              self.findIndex(l => l.id === lab.id) === index
            );

            let studentEligible = [...uniqueEligible];
            if (studentEligible.length < k) {
              for (const lab of activeLabs) {
                if (!studentEligible.some(l => l.id === lab.id)) {
                  studentEligible.push(lab);
                  if (studentEligible.length >= k) break;
                }
              }
            }
            if (studentEligible.length < k) {
              studentEligible = activeLabs;
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

          // Track same-organization student counts in each lab at each slot
          const sameOrgCapacities: { [orgId: string]: { [slotId: string]: { [labId: string]: number } } } = {};
          const activeOrgsList = [...new Set(sortedStudents.map(s => s.organization_id))];
          activeOrgsList.forEach(orgId => {
            if (orgId) {
              sameOrgCapacities[orgId] = {};
              activeTimeSlots.forEach(slot => {
                sameOrgCapacities[orgId][slot.id] = {};
                activeLabs.forEach(lab => {
                  sameOrgCapacities[orgId][slot.id][lab.id] = 0;
                });
              });
            }
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
              let isOverCapacity = false;
              let capCost = 0;
              let clusteringReward = 0;

              for (let slotIdx = 0; slotIdx < k; slotIdx++) {
                const labId = tuple[slotIdx];
                const slotId = activeTimeSlots[slotIdx].id;
                const cap = capacities[slotId]?.[labId] || 0;
                
                // Respect the specific capacity limit of the lab + slack, fallback to 20
                const lab = activeLabs.find(l => l.id === labId);
                const capLimit = (lab?.capacity_per_session ?? 20) + capacitySlack;

                if (cap >= capLimit) {
                  isOverCapacity = true;
                  break;
                }
                capCost += cap;

                if (student.organization_id && groupedOrgIds.has(student.organization_id)) {
                  const orgId = student.organization_id;
                  const sameOrgCount = sameOrgCapacities[orgId]?.[slotId]?.[labId] || 0;
                  // Add reward for keeping students of this organization together
                  clusteringReward += sameOrgCount * 50; 
                }
              }

              if (isOverCapacity) {
                return { tuple, val: -Infinity };
              }

              // Enforce preference satisfaction constraints
              const prefMap = studentPrefsMap[student.id] || {};
              // Filter preferences to only those that are age-eligible for this student
              const eligiblePrefIds = Object.keys(prefMap).filter(labId => {
                const lab = activeLabs.find(l => l.id === labId);
                if (!lab) return false;
                if (lab.min_age == null) return true;
                return student.age >= lab.min_age && student.age <= (lab.max_age ?? 999);
              });
              const hasEligiblePrefs = eligiblePrefIds.length > 0;

              if (hasEligiblePrefs) {
                const assignedRanks = tuple
                  .map(labId => prefMap[labId])
                  .filter(rank => rank !== undefined);

                if (strictness === 2) {
                  // Must get at least one of Top 1 or 2 picks (among their age-eligible preferences)
                  const hasAgeEligibleTop1Or2 = eligiblePrefIds.some(labId => prefMap[labId] === 1 || prefMap[labId] === 2);
                  if (hasAgeEligibleTop1Or2) {
                    const hasTop1Or2 = assignedRanks.some(r => r === 1 || r === 2);
                    if (!hasTop1Or2) {
                      return { tuple, val: -Infinity };
                    }
                  } else {
                    // Fall back to checking if they got at least one of their available age-eligible preferences
                    if (assignedRanks.length === 0) {
                      return { tuple, val: -Infinity };
                    }
                  }
                } else if (strictness === 1) {
                  // Must get at least one of their selected preferences
                  if (assignedRanks.length === 0) {
                    return { tuple, val: -Infinity };
                  }
                }
              }

              const key = tuple.join('_');
              const utility = studentPrefsScores[student.id]?.[key] || 0;
              // Subtract capacity cost penalty to prefer less loaded labs, add clustering reward
              const val = utility - 15 * capCost + clusteringReward;
              return { tuple, val };
            });

            const validTuples = scoredTuples
              .filter(x => x.val !== -Infinity)
              .sort((a, b) => b.val - a.val)
              .map(x => x.tuple);

            for (const tuple of validTuples) {
              // Assign
              assignment[student.id] = tuple;
              for (let slotIdx = 0; slotIdx < k; slotIdx++) {
                const labId = tuple[slotIdx];
                const slotId = activeTimeSlots[slotIdx].id;
                capacities[slotId][labId]++;
                if (student.organization_id && sameOrgCapacities[student.organization_id]) {
                  sameOrgCapacities[student.organization_id][slotId][labId]++;
                }
              }

              if (backtrack(index + 1)) return true;

              // Unassign
              delete assignment[student.id];
              for (let slotIdx = 0; slotIdx < k; slotIdx++) {
                const labId = tuple[slotIdx];
                const slotId = activeTimeSlots[slotIdx].id;
                capacities[slotId][labId]--;
                if (student.organization_id && sameOrgCapacities[student.organization_id]) {
                  sameOrgCapacities[student.organization_id][slotId][labId]--;
                }
              }
            }

            return false;
          }

          if (backtrack(0)) {
            finalAssignment = assignment;
            solved = true;
            break;
          }
        }
        if (solved) break;
      }
      if (solved) break;
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
