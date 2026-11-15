/**
 * Automated Verification Suite for Piedibus Solver
 * Spec-Driven Development: Validating against SPEC_PIEDIBUS.md
 */

// Mock localStorage for Node environment testing of store persistence
const mockStorage = new Map();
global.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear()
};

import { generateShiftProposal, WEEKDAYS, PLACEHOLDER_MISSING } from '../js/solver.js';
import { buildWhatsAppMessage } from '../js/whatsapp.js';
import { PiedibusStore } from '../js/store.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('--- RUNNING SPEC VERIFICATION TESTS ---\n');

// Sample Team Setup
const members = [
  { id: 'm1', name: 'Marco Rossi', active: true },
  { id: 'm2', name: 'Anna Bianchi', active: true },
  { id: 'm3', name: 'Luca Verdi', active: true },
  { id: 'm4', name: 'Sofia Neri', active: true },
  { id: 'm5', name: 'Elena Fontana', active: true },
  { id: 'm6', name: 'Matteo Ferrari', active: true }
];

const sampleAvailabilities = {
  m1: ['monday', 'tuesday', 'thursday'],
  m2: ['monday', 'wednesday', 'friday'],
  m3: ['tuesday', 'wednesday', 'friday'],
  m4: ['monday', 'wednesday', 'thursday', 'friday'],
  m5: ['tuesday', 'thursday', 'friday'],
  m6: ['monday', 'tuesday', 'wednesday', 'thursday']
};

// ----------------------------------------------------
// TEST 1: Full 5-day week assignment & exactly 2 volunteers per day
// ----------------------------------------------------
console.log('Test 1: Full 5-Day Week (10 slots needed)');
const fullWeekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const res1 = generateShiftProposal({
  members,
  availabilities: sampleAvailabilities,
  activeDays: fullWeekDays
});

assert(res1.isFullyCovered === true, 'All 10 slots are filled');
assert(res1.assignedSlots === 10, 'Assigned slots equal 10');
for (const day of fullWeekDays) {
  const shift = res1.shifts[day];
  assert(!shift.isExcluded, `${day} is not excluded`);
  assert(shift.slots[0] !== null && shift.slots[1] !== null, `${day} has 2 assigned members`);
  assert(shift.slots[0] !== shift.slots[1], `${day} has two DIFFERENT members`);
}

// Workload balance check: with 10 slots and 6 members, average is 10/6 = 1.66
// Every member should have either 1 or 2 shifts (max difference <= 1)
const loads1 = Object.values(res1.workload);
const maxLoad = Math.max(...loads1);
const minLoad = Math.min(...loads1);
assert(maxLoad - minLoad <= 1, `Workload is balanced (max: ${maxLoad}, min: ${minLoad}, delta <= 1)`);

// ----------------------------------------------------
// TEST 2: Day Exclusion (e.g. Wednesday holiday)
// ----------------------------------------------------
console.log('\nTest 2: Excluded Day (Wednesday holiday)');
const fourDays = ['monday', 'tuesday', 'thursday', 'friday'];
const res2 = generateShiftProposal({
  members,
  availabilities: sampleAvailabilities,
  activeDays: fourDays
});

assert(res2.shifts.wednesday.isExcluded === true, 'Wednesday is marked as excluded');
assert(res2.shifts.wednesday.slots[0] === null, 'Wednesday has no volunteers assigned');
assert(res2.totalSlotsNeeded === 8, 'Total slots needed is 8 for 4 active days');
assert(res2.assignedSlots === 8, 'Assigned slots is 8');

// ----------------------------------------------------
// TEST 3: Constrained-First Assignment
// Member m_rare only available on Monday
// ----------------------------------------------------
console.log('\nTest 3: Constrained Volunteer Priority');
const constrainedAvail = {
  ...sampleAvailabilities,
  m1: ['monday'] // m1 is ONLY available on Monday
};
const res3 = generateShiftProposal({
  members,
  availabilities: constrainedAvail,
  activeDays: fullWeekDays
});
assert(res3.shifts.monday.slots.includes('m1'), 'Constrained volunteer m1 was prioritized and assigned on Monday');

// ----------------------------------------------------
// TEST 4: Partial-Fill & Under-Coverage Warning
// Friday has only 1 available volunteer
// ----------------------------------------------------
console.log('\nTest 4: Under-Coverage Warning');
const tightAvail = {
  m1: ['monday'],
  m2: ['monday'],
  m3: ['tuesday'],
  m4: ['tuesday'],
  m5: ['wednesday'],
  m6: ['friday'] // Only m6 available on Friday!
};
const res4 = generateShiftProposal({
  members,
  availabilities: tightAvail,
  activeDays: ['monday', 'tuesday', 'friday']
});

assert(res4.shifts.friday.hasMissingVolunteer === true, 'Friday is flagged with hasMissingVolunteer');
assert(res4.shifts.friday.slots[0] === 'm6', 'Friday has m6 assigned');
assert(res4.shifts.friday.slots[1] === null, 'Friday slot 2 is null ([CERCA VOLONTARIO])');
assert(res4.isFullyCovered === false, 'Proposal is flagged as not fully covered');
assert(res4.missingSlotsCount === 1, 'Missing slots count is 1');

// ----------------------------------------------------
// TEST 5: Day Pinning & Alternative Reshuffling
// ----------------------------------------------------
console.log('\nTest 5: Pinning Monday and Reshuffling Alternatives');
const initialProposal = generateShiftProposal({
  members,
  availabilities: sampleAvailabilities,
  activeDays: fullWeekDays,
  attempt: 0
});
const pinnedMonday = initialProposal.shifts.monday.slots;

// Pin Monday, generate proposal with attempt = 2
const altProposal = generateShiftProposal({
  members,
  availabilities: sampleAvailabilities,
  activeDays: fullWeekDays,
  pinnedDays: { monday: pinnedMonday },
  attempt: 2
});

assert(
  altProposal.shifts.monday.slots[0] === pinnedMonday[0] &&
  altProposal.shifts.monday.slots[1] === pinnedMonday[1],
  'Monday pinned slots were perfectly preserved in alternative proposal'
);
assert(altProposal.shifts.monday.isPinned === true, 'Monday is marked isPinned = true');

// ----------------------------------------------------
// TEST 6: WhatsApp Message Formatting
// ----------------------------------------------------
console.log('\nTest 6: Formatted WhatsApp Message Builder');
const waMsg = buildWhatsAppMessage({
  lineName: 'Linea Verde Montessori',
  weekStartDate: '2026-11-16',
  proposal: res2, // Wednesday excluded
  members,
  customNote: 'Portare gilet catarifrangenti!'
});

assert(waMsg.includes('Linea Verde Montessori'), 'Includes Linea name');
assert(waMsg.includes('Lunedì'), 'Includes Lunedì');
assert(waMsg.includes('Mercoledì*: ⛔ *CHIUSURA'), 'Correctly marks Mercoledì as Chiusura');
assert(waMsg.includes('Portare gilet catarifrangenti!'), 'Includes custom note');
assert(waMsg.includes('PIEDIBUS - TURNI DELLA SETTIMANA'), 'Includes official header');

// Test missing volunteer WhatsApp warning
const waMsgMissing = buildWhatsAppMessage({
  lineName: 'Linea Verde Montessori',
  weekStartDate: '2026-11-16',
  proposal: res4, // Friday has missing volunteer
  members
});
assert(waMsgMissing.includes(PLACEHOLDER_MISSING), 'Highlights missing volunteer placeholder');
assert(waMsgMissing.includes('ATTENZIONE: Abbiamo ancora posti scoperti'), 'Includes plea for help in message');

// ----------------------------------------------------
// TEST 7: Store Persistence, Volunteer Editing & Shift Isolation (FR-1.4, Test-8, Test-9)
// ----------------------------------------------------
console.log('\nTest 7: Store Volunteer Editing & Isolation');
const store1 = new PiedibusStore();
assert(store1.state.members.length === 6, 'Store loads initial sample members');

// Edit a volunteer name
const editOk = store1.editMember('m1', 'Marco Rossi Modificato');
assert(editOk === true, 'Member name was successfully edited');
assert(store1.state.members.find(m => m.id === 'm1').name === 'Marco Rossi Modificato', 'Member state has updated name');

// Add a custom volunteer
const customVol = store1.addMember('Volontario Personalizzato');
assert(customVol !== null, 'Custom volunteer added successfully');
assert(store1.state.availabilities[customVol.id].length === 5, 'Custom volunteer has default 5 days availability');

// Simulate page reload by creating a new store instance from localStorage
const storeReloaded = new PiedibusStore();
assert(
  storeReloaded.state.members.find(m => m.id === 'm1').name === 'Marco Rossi Modificato',
  'Edited volunteer name persisted across reloads'
);
assert(
  storeReloaded.state.members.some(m => m.name === 'Volontario Personalizzato'),
  'Newly added custom volunteer persisted across reloads'
);

// Assign shifts and verify resetProposal isolates shift clearing from roster
storeReloaded.state.currentProposal = { dummy: true };
storeReloaded.state.pinnedDays = { monday: ['m1', 'm2'] };
storeReloaded.resetProposal();
assert(storeReloaded.state.currentProposal === null, 'Shift proposal is cleared');
assert(Object.keys(storeReloaded.state.pinnedDays).length === 0, 'Pinned days are cleared');
assert(
  storeReloaded.state.members.some(m => m.name === 'Volontario Personalizzato'),
  'Volunteer roster remained 100% intact after resetting weekly shifts'
);

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log(`\n========================================`);
console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
