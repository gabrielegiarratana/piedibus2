/**
 * LocalStorage State Management for Piedibus Shift Table Tool
 */

const STORAGE_KEY = 'piedibus_data_v2';
const LEGACY_STORAGE_KEY = 'piedibus_data_v1';

export const DEFAULT_MEMBERS = [
  { id: 'm1', name: 'Marco Rossi', active: true },
  { id: 'm2', name: 'Anna Bianchi', active: true },
  { id: 'm3', name: 'Luca Verdi', active: true },
  { id: 'm4', name: 'Sofia Neri', active: true },
  { id: 'm5', name: 'Elena Fontana', active: true },
  { id: 'm6', name: 'Matteo Ferrari', active: true }
];

export const DEFAULT_AVAILABILITIES = {
  m1: ['monday', 'tuesday', 'thursday'],
  m2: ['monday', 'wednesday', 'friday'],
  m3: ['tuesday', 'wednesday', 'friday'],
  m4: ['monday', 'wednesday', 'thursday', 'friday'],
  m5: ['tuesday', 'thursday', 'friday'],
  m6: ['monday', 'tuesday', 'wednesday', 'thursday']
};

export const DEFAULT_WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

export class PiedibusStore {
  constructor() {
    this.state = this.loadState();
  }

  loadState() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (serialized) {
        const parsed = JSON.parse(serialized);
        if (parsed && typeof parsed === 'object') {
          const defaults = this.getDefaults();
          return {
            ...defaults,
            ...parsed,
            members: Array.isArray(parsed.members) ? parsed.members : defaults.members,
            availabilities: (parsed.availabilities && typeof parsed.availabilities === 'object')
              ? parsed.availabilities
              : defaults.availabilities
          };
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using defaults', e);
    }

    return this.getDefaults();
  }

  getDefaults() {
    // Determine upcoming Monday's date
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = (8 - dayOfWeek) % 7 || 7;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + (dayOfWeek === 1 ? 0 : diffToMonday));
    const mondayStr = nextMonday.toISOString().split('T')[0];

    return {
      lineName: 'Linea Piedibus Centro',
      weekStartDate: mondayStr,
      members: [...DEFAULT_MEMBERS],
      availabilities: { ...DEFAULT_AVAILABILITIES },
      activeDays: [...DEFAULT_WEEK_DAYS],
      pinnedDays: {},
      currentProposal: null,
      customNote: '',
      attemptCount: 0
    };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  }

  resetToDefaults() {
    this.state = this.getDefaults();
    this.save();
    return this.state;
  }

  clearRoster() {
    this.state.members = [];
    this.state.availabilities = {};
    this.state.pinnedDays = {};
    this.state.currentProposal = null;
    this.save();
    return this.state;
  }

  addMember(name) {
    if (!name || !name.trim()) return null;
    const id = 'm_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const newMember = { id, name: name.trim(), active: true };
    this.state.members.push(newMember);
    this.state.availabilities[id] = [...DEFAULT_WEEK_DAYS]; // default all days
    this.save();
    return newMember;
  }

  editMember(id, newName) {
    if (!newName || !newName.trim()) return false;
    const member = this.state.members.find(m => m.id === id);
    if (member) {
      member.name = newName.trim();
      this.save();
      return true;
    }
    return false;
  }

  resetProposal() {
    this.state.pinnedDays = {};
    this.state.currentProposal = null;
    this.state.attemptCount = 0;
    this.save();
    return this.state;
  }

  removeMember(id) {
    this.state.members = this.state.members.filter(m => m.id !== id);
    delete this.state.availabilities[id];
    // Remove from pinned if present
    for (const [day, slots] of Object.entries(this.state.pinnedDays)) {
      this.state.pinnedDays[day] = slots.map(s => (s === id ? null : s));
    }
    this.save();
  }

  toggleMemberActive(id) {
    const member = this.state.members.find(m => m.id === id);
    if (member) {
      member.active = !member.active;
      this.save();
    }
  }

  toggleAvailability(memberId, dayKey) {
    const current = this.state.availabilities[memberId] || [];
    if (current.includes(dayKey)) {
      this.state.availabilities[memberId] = current.filter(d => d !== dayKey);
    } else {
      this.state.availabilities[memberId] = [...current, dayKey];
    }
    this.save();
  }

  toggleActiveDay(dayKey) {
    if (this.state.activeDays.includes(dayKey)) {
      this.state.activeDays = this.state.activeDays.filter(d => d !== dayKey);
    } else {
      this.state.activeDays = [...this.state.activeDays, dayKey];
    }
    this.save();
  }

  setWeekStartDate(dateStr) {
    this.state.weekStartDate = dateStr;
    this.save();
  }

  setLineName(name) {
    this.state.lineName = name;
    this.save();
  }

  setCustomNote(note) {
    this.state.customNote = note;
    this.save();
  }

  togglePinDay(dayKey, slots) {
    if (this.state.pinnedDays[dayKey]) {
      delete this.state.pinnedDays[dayKey];
    } else {
      this.state.pinnedDays[dayKey] = [...slots];
    }
    this.save();
  }

  setProposal(proposal) {
    this.state.currentProposal = proposal;
    this.save();
  }
}
