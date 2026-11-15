/**
 * Piedibus Shift Allocation Solver
 * Spec-Driven Implementation conforming to SPEC_PIEDIBUS.md
 */

export const WEEKDAYS = [
  { key: 'monday', label: 'Lunedì', short: 'Lun' },
  { key: 'tuesday', label: 'Martedì', short: 'Mar' },
  { key: 'wednesday', label: 'Mercoledì', short: 'Mer' },
  { key: 'thursday', label: 'Giovedì', short: 'Gio' },
  { key: 'friday', label: 'Venerdì', short: 'Ven' }
];

export const PLACEHOLDER_MISSING = '[CERCA VOLONTARIO]';

/**
 * Generates a balanced shift assignment proposal for the active days.
 *
 * @param {Object} options
 * @param {Array<{id: string, name: string, active: boolean}>} options.members
 * @param {Record<string, string[]>} options.availabilities - Map memberId -> array of weekday keys
 * @param {string[]} options.activeDays - Array of active weekday keys (e.g. ['monday', 'tuesday', 'thursday', 'friday'])
 * @param {Record<string, Array<string|null>>} [options.pinnedDays={}] - Pinned assignments { dayKey: [id1, id2] }
 * @param {number} [options.attempt=0] - Seed / attempt number for generating alternative solutions
 * @returns {Object} Proposal object with shifts per day, workload counts, and diagnostics
 */
export function generateShiftProposal({
  members = [],
  availabilities = {},
  activeDays = [],
  pinnedDays = {},
  attempt = 0
}) {
  const activeMembers = members.filter(m => m.active !== false);
  const memberMap = new Map(activeMembers.map(m => [m.id, m]));

  const resultShifts = {};
  const workload = {};
  for (const m of activeMembers) {
    workload[m.id] = 0;
  }

  // Identify all active days that need assignment
  const targetDays = activeDays.filter(d => WEEKDAYS.some(w => w.key === d));

  // Initialize all days
  for (const day of WEEKDAYS) {
    const isExcluded = !targetDays.includes(day.key);
    resultShifts[day.key] = {
      day: day.key,
      label: day.label,
      isExcluded,
      isPinned: Boolean(pinnedDays[day.key]),
      slots: [null, null], // [memberId or null, memberId or null]
      hasMissingVolunteer: false
    };
  }

  // 1. First lock in pinned days
  for (const dayKey of targetDays) {
    if (pinnedDays[dayKey] && Array.isArray(pinnedDays[dayKey])) {
      const [m1, m2] = pinnedDays[dayKey];
      resultShifts[dayKey].slots = [m1 || null, m2 || null];
      resultShifts[dayKey].isPinned = true;
      if (m1 && workload[m1] !== undefined) workload[m1]++;
      if (m2 && workload[m2] !== undefined) workload[m2]++;
    }
  }

  // Days that still have open slots
  const daysToAssign = targetDays.filter(dayKey => {
    const slots = resultShifts[dayKey].slots;
    return slots[0] === null || slots[1] === null;
  });

  // Calculate each member's total availability across unpinned target days
  const memberAvailabilityCount = {};
  for (const m of activeMembers) {
    const daysAvail = (availabilities[m.id] || []).filter(d => targetDays.includes(d));
    memberAvailabilityCount[m.id] = daysAvail.length;
  }

  // Determine available members for each day
  const dailyCandidates = {};
  for (const dayKey of daysToAssign) {
    const available = activeMembers.filter(m => {
      const isAvail = (availabilities[m.id] || []).includes(dayKey);
      // Already pinned on this day?
      const alreadyInDay = resultShifts[dayKey].slots.includes(m.id);
      return isAvail && !alreadyInDay;
    });
    dailyCandidates[dayKey] = available;
  }

  // Sort days: days with FEWEST candidates first (most constrained days first)
  // Add mild pseudo-random shuffle based on attempt for alternative variations
  const sortedDays = [...daysToAssign].sort((a, b) => {
    const diff = dailyCandidates[a].length - dailyCandidates[b].length;
    if (diff !== 0) return diff;
    // Tie-breaker with attempt variation
    return ((a.charCodeAt(0) + attempt * 7) % 5) - ((b.charCodeAt(0) + attempt * 7) % 5);
  });

  // Assign open slots
  for (const dayKey of sortedDays) {
    const shift = resultShifts[dayKey];

    for (let slotIndex = 0; slotIndex < 2; slotIndex++) {
      if (shift.slots[slotIndex] !== null) continue; // already assigned or pinned

      // Eligible candidates for this slot:
      // - must be available on this day
      // - must not be already in the other slot of this day
      const eligible = activeMembers.filter(m => {
        const isAvail = (availabilities[m.id] || []).includes(dayKey);
        const alreadyInDay = shift.slots.includes(m.id);
        return isAvail && !alreadyInDay;
      });

      if (eligible.length === 0) {
        // Under-coverage: No member available for this slot!
        shift.slots[slotIndex] = null;
        shift.hasMissingVolunteer = true;
        continue;
      }

      // Prioritization rules (Spec FR-4):
      // 1. Lowest current workload across the week (workload balance)
      // 2. Most constrained member overall (fewer total available days -> prioritize first)
      // 3. Attempt-based permutation jitter for generating diverse alternatives
      eligible.sort((a, b) => {
        const loadA = workload[a.id];
        const loadB = workload[b.id];
        if (loadA !== loadB) return loadA - loadB;

        // Constrained first (fewest available days overall)
        const constrA = memberAvailabilityCount[a.id] || 0;
        const constrB = memberAvailabilityCount[b.id] || 0;
        if (constrA !== constrB) return constrA - constrB;

        // Alternative proposal jitter
        const hashA = (a.id.charCodeAt(0) + attempt * 13) % 17;
        const hashB = (b.id.charCodeAt(0) + attempt * 13) % 17;
        return hashA - hashB;
      });

      const selected = eligible[0];
      shift.slots[slotIndex] = selected.id;
      workload[selected.id]++;
    }

    if (shift.slots.includes(null)) {
      shift.hasMissingVolunteer = true;
    }
  }

  // Workload analysis
  const activeCount = targetDays.length;
  const totalSlotsNeeded = activeCount * 2;
  const assignedSlots = Object.values(resultShifts)
    .filter(s => !s.isExcluded)
    .flatMap(s => s.slots)
    .filter(Boolean).length;
  const missingSlotsCount = totalSlotsNeeded - assignedSlots;

  return {
    shifts: resultShifts,
    workload,
    targetDays,
    totalSlotsNeeded,
    assignedSlots,
    missingSlotsCount,
    isFullyCovered: missingSlotsCount === 0,
    attempt
  };
}

/**
 * Returns user-friendly diagnostics of the schedule.
 */
export function getScheduleDiagnostics(proposal, members) {
  const memberMap = new Map(members.map(m => [m.id, m]));
  const missingDays = [];

  for (const day of WEEKDAYS) {
    const shift = proposal.shifts[day.key];
    if (!shift || shift.isExcluded) continue;
    const missingInDay = shift.slots.filter(s => !s).length;
    if (missingInDay > 0) {
      missingDays.push({
        day: day.label,
        missingCount: missingInDay
      });
    }
  }

  return {
    isComplete: proposal.isFullyCovered,
    missingDays,
    summaryText: proposal.isFullyCovered
      ? 'Tutti i turni sono coperti regolarmente!'
      : `Attenzione: ci sono ${proposal.missingSlotsCount} posti vacanti da coprire.`
  };
}
