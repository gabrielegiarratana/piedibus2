/**
 * Main Controller for Piedibus Shift Table Tool
 * Connects UI, Store, Solver, and WhatsApp Formatter
 */

import { PiedibusStore } from './store.js';
import { WEEKDAYS, generateShiftProposal, getScheduleDiagnostics, PLACEHOLDER_MISSING } from './solver.js';
import { buildWhatsAppMessage, copyToClipboard, openWhatsAppDirect } from './whatsapp.js';

// Initialize Store
const store = new PiedibusStore();

// DOM Elements
const navTabs = document.querySelectorAll('.nav-tab');
const tabContents = document.querySelectorAll('.tab-content');
const badgeMembersCount = document.getElementById('badge-members-count');
const badgeActiveDays = document.getElementById('badge-active-days');

const inputLineName = document.getElementById('input-line-name');
const btnResetSample = document.getElementById('btn-reset-sample');
const btnClearRoster = document.getElementById('btn-clear-roster');

// Tab 1 Elements
const formAddMember = document.getElementById('form-add-member');
const inputNewMember = document.getElementById('input-new-member');
const matrixTbody = document.getElementById('matrix-tbody');
const mobileRosterList = document.getElementById('mobile-roster-list');

// Tab 2 Elements
const inputWeekDate = document.getElementById('input-week-date');
const weekDaysChips = document.getElementById('week-days-chips');
const btnGenerateProposal = document.getElementById('btn-generate-proposal');

// Tab 3 Elements
const proposalStatusBadge = document.getElementById('proposal-status-badge');
const scheduleCards = document.getElementById('schedule-cards');
const workloadSummaryList = document.getElementById('workload-summary-list');
const btnReshuffle = document.getElementById('btn-reshuffle');
const btnConfirmProposal = document.getElementById('btn-confirm-proposal');

// Tab 4 Elements
const whatsappPreviewText = document.getElementById('whatsapp-preview-text');
const inputCustomNote = document.getElementById('input-custom-note');
const btnCopyWhatsapp = document.getElementById('btn-copy-whatsapp');
const btnOpenWhatsapp = document.getElementById('btn-open-whatsapp');
const toast = document.getElementById('toast');

// --- Initialization ---
function init() {
  bindEvents();
  renderAll();
}

function bindEvents() {
  // Tab Switching
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Line Name change
  inputLineName.addEventListener('input', e => {
    store.setLineName(e.target.value);
    updateWhatsAppPreview();
  });

  // Week Date change
  inputWeekDate.addEventListener('change', e => {
    store.setWeekStartDate(e.target.value);
    updateWhatsAppPreview();
  });

  // Custom Note change
  inputCustomNote.addEventListener('input', e => {
    store.setCustomNote(e.target.value);
    updateWhatsAppPreview();
  });

  // Reset to Samples
  btnResetSample.addEventListener('click', () => {
    if (confirm('Vuoi ripristinare i dati di esempio dei volontari?')) {
      store.resetToDefaults();
      renderAll();
      showToast('Dati di esempio ripristinati');
    }
  });

  // Clear Roster
  btnClearRoster.addEventListener('click', () => {
    if (confirm('Vuoi davvero azzerare l\'elenco di tutti i volontari?')) {
      store.clearRoster();
      renderAll();
      showToast('Elenco volontari azzerato');
    }
  });

  // Add Member
  formAddMember.addEventListener('submit', e => {
    e.preventDefault();
    const name = inputNewMember.value.trim();
    if (!name) return;
    store.addMember(name);
    inputNewMember.value = '';
    renderTeamSection();
    showToast(`Aggiunto ${name}`);
  });

  // Generate Proposal Button (Tab 2)
  btnGenerateProposal.addEventListener('click', () => {
    runGeneration(0);
    switchTab('tab-proposal');
  });

  // Reshuffle Proposal Button (Tab 3)
  btnReshuffle.addEventListener('click', () => {
    store.state.attemptCount = (store.state.attemptCount || 0) + 1;
    runGeneration(store.state.attemptCount);
    showToast('Nuova combinazione generata');
  });

  // Confirm Proposal Button (Tab 3)
  btnConfirmProposal.addEventListener('click', () => {
    updateWhatsAppPreview();
    switchTab('tab-whatsapp');
  });

  // Copy WhatsApp Button (Tab 4)
  btnCopyWhatsapp.addEventListener('click', async () => {
    const text = getGeneratedWhatsAppText();
    const success = await copyToClipboard(text);
    if (success) {
      showToast('✅ Messaggio copiato negli appunti!');
    } else {
      showToast('⚠️ Impossibile copiare automaticamente. Seleziona il testo.');
    }
  });

  // Open Direct WhatsApp (Tab 4)
  btnOpenWhatsapp.addEventListener('click', () => {
    const text = getGeneratedWhatsAppText();
    openWhatsAppDirect(text);
  });
}

function switchTab(tabId) {
  navTabs.forEach(t => {
    if (t.getAttribute('data-tab') === tabId) {
      t.classList.add('active');
    } else {
      t.classList.remove('active');
    }
  });

  tabContents.forEach(c => {
    if (c.id === tabId) {
      c.style.display = 'block';
    } else {
      c.style.display = 'none';
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// --- Render Logic ---
function renderAll() {
  inputLineName.value = store.state.lineName || '';
  inputWeekDate.value = store.state.weekStartDate || '';
  inputCustomNote.value = store.state.customNote || '';

  renderTeamSection();
  renderWeekSection();

  if (store.state.currentProposal) {
    renderProposalSection();
    updateWhatsAppPreview();
  }
}

function renderTeamSection() {
  const members = store.state.members || [];
  const availabilities = store.state.availabilities || {};

  badgeMembersCount.textContent = members.length;

  // Render Desktop Matrix Table
  matrixTbody.innerHTML = '';
  if (members.length === 0) {
    matrixTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">Nessun volontario registrato. Aggiungine uno con il modulo sopra!</td></tr>`;
  }

  members.forEach(member => {
    const memberAvails = availabilities[member.id] || [];
    const tr = document.createElement('tr');
    if (!member.active) tr.style.opacity = '0.5';

    const avatarInitial = member.name.charAt(0).toUpperCase();

    tr.innerHTML = `
      <td>
        <div class="member-name-cell">
          <span class="member-avatar">${avatarInitial}</span>
          <div>
            <div style="font-weight: 700;">${escapeHtml(member.name)}</div>
            <small style="color: var(--text-muted); cursor: pointer;" class="btn-toggle-active">
              ${member.active ? '● Attivo' : '○ Inattivo'}
            </small>
          </div>
        </div>
      </td>
      ${WEEKDAYS.map(day => {
        const isSelected = memberAvails.includes(day.key);
        return `
          <td style="text-align: center;">
            <button type="button" class="day-toggle-btn ${isSelected ? 'active' : ''}" data-member="${member.id}" data-day="${day.key}">
              ${isSelected ? '✓' : '-'}
            </button>
          </td>
        `;
      }).join('')}
      <td style="text-align: center;">
        <button type="button" class="btn btn-danger-outline btn-sm btn-delete-member" data-id="${member.id}" title="Elimina volontario">
          🗑️
        </button>
      </td>
    `;
    matrixTbody.appendChild(tr);
  });

  // Render Mobile Cards
  mobileRosterList.innerHTML = '';
  members.forEach(member => {
    const memberAvails = availabilities[member.id] || [];
    const card = document.createElement('div');
    card.className = 'mobile-member-card';

    card.innerHTML = `
      <div class="mobile-card-header">
        <div>
          <strong style="font-size: 1.05rem;">${escapeHtml(member.name)}</strong>
          <span style="font-size: 0.8rem; margin-left: 6px; color: ${member.active ? 'var(--primary)' : 'var(--text-muted)'};">
            ${member.active ? '● Attivo' : '○ Inattivo'}
          </span>
        </div>
        <button type="button" class="btn btn-danger-outline btn-sm btn-delete-member" data-id="${member.id}">
          🗑️
        </button>
      </div>
      <div class="mobile-day-buttons">
        ${WEEKDAYS.map(day => {
          const isSelected = memberAvails.includes(day.key);
          return `
            <button type="button" class="day-toggle-btn ${isSelected ? 'active' : ''}" data-member="${member.id}" data-day="${day.key}">
              ${day.short} ${isSelected ? '✓' : ''}
            </button>
          `;
        }).join('')}
      </div>
    `;
    mobileRosterList.appendChild(card);
  });

  // Attach dynamic button events for both Desktop table and Mobile cards
  document.querySelectorAll('.day-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const memberId = btn.getAttribute('data-member');
      const dayKey = btn.getAttribute('data-day');
      store.toggleAvailability(memberId, dayKey);
      renderTeamSection();
    });
  });

  document.querySelectorAll('.btn-delete-member').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      store.removeMember(id);
      renderTeamSection();
      showToast('Volontario rimosso');
    });
  });

  document.querySelectorAll('.btn-toggle-active').forEach(span => {
    span.addEventListener('click', () => {
      const tr = span.closest('tr');
      const delBtn = tr ? tr.querySelector('.btn-delete-member') : null;
      if (delBtn) {
        const id = delBtn.getAttribute('data-id');
        store.toggleMemberActive(id);
        renderTeamSection();
      }
    });
  });
}

function renderWeekSection() {
  const activeDays = store.state.activeDays || [];
  badgeActiveDays.textContent = `${activeDays.length} gg`;

  weekDaysChips.innerHTML = '';
  WEEKDAYS.forEach(day => {
    const isActive = activeDays.includes(day.key);
    const chip = document.createElement('div');
    chip.className = `day-chip ${isActive ? 'active' : 'excluded'}`;
    chip.innerHTML = `
      <span class="day-chip-name">${day.label}</span>
      <span class="day-chip-status">${isActive ? '✅ Piedibus Attivo' : '⛔ Chiuso / Festivo'}</span>
    `;
    chip.addEventListener('click', () => {
      store.toggleActiveDay(day.key);
      renderWeekSection();
    });
    weekDaysChips.appendChild(chip);
  });
}

function runGeneration(attempt = 0) {
  const proposal = generateShiftProposal({
    members: store.state.members,
    availabilities: store.state.availabilities,
    activeDays: store.state.activeDays,
    pinnedDays: store.state.pinnedDays,
    attempt
  });

  store.setProposal(proposal);
  renderProposalSection();
  updateWhatsAppPreview();
}

function renderProposalSection() {
  const proposal = store.state.currentProposal;
  if (!proposal) return;

  const diagnostics = getScheduleDiagnostics(proposal, store.state.members);
  const memberMap = new Map(store.state.members.map(m => [m.id, m]));

  if (proposal.isFullyCovered) {
    proposalStatusBadge.className = 'volunteer-pill';
    proposalStatusBadge.style.background = 'var(--primary-light)';
    proposalStatusBadge.style.color = 'var(--primary-dark)';
    proposalStatusBadge.textContent = '✅ Copertura Completa (2/2)';
  } else {
    proposalStatusBadge.className = 'volunteer-pill missing';
    proposalStatusBadge.textContent = `⚠️ Posti mancanti: ${proposal.missingSlotsCount}`;
  }

  // Render Shift Cards per Day
  scheduleCards.innerHTML = '';
  WEEKDAYS.forEach(day => {
    const shift = proposal.shifts[day.key];
    if (!shift) return;

    const card = document.createElement('div');
    let cardClass = 'shift-card';
    if (shift.isExcluded) cardClass += ' excluded';
    else if (shift.isPinned) cardClass += ' pinned';
    else if (shift.hasMissingVolunteer) cardClass += ' missing';

    card.className = cardClass;

    const vol1Name = shift.slots[0] ? memberMap.get(shift.slots[0])?.name || 'Volontario' : null;
    const vol2Name = shift.slots[1] ? memberMap.get(shift.slots[1])?.name || 'Volontario' : null;

    let membersContent = '';
    if (shift.isExcluded) {
      membersContent = `<span style="color: var(--text-muted); font-style: italic;">⛔ Nessun turno previsto (Scuola Chiusa)</span>`;
    } else {
      membersContent = `
        <div class="volunteer-pill ${!vol1Name ? 'missing' : ''}">
          👤 ${vol1Name ? escapeHtml(vol1Name) : PLACEHOLDER_MISSING}
        </div>
        <div class="volunteer-pill ${!vol2Name ? 'missing' : ''}">
          👤 ${vol2Name ? escapeHtml(vol2Name) : PLACEHOLDER_MISSING}
        </div>
      `;
    }

    const pinButtonHtml = shift.isExcluded ? '' : `
      <button type="button" class="pin-btn ${shift.isPinned ? 'pinned' : ''}" data-day="${day.key}" title="${shift.isPinned ? 'Sblocca giorno' : 'Blocca questo giorno'}">
        ${shift.isPinned ? '📌' : '📍'}
      </button>
    `;

    card.innerHTML = `
      <div class="shift-day-info">
        <span class="shift-day-title">${day.label}</span>
        <span class="shift-day-badge">${shift.isExcluded ? 'Escluso' : '2 Volontari'}</span>
      </div>
      <div class="shift-members-box">
        ${membersContent}
      </div>
      ${pinButtonHtml}
    `;

    scheduleCards.appendChild(card);
  });

  // Attach Pin Button Handlers
  document.querySelectorAll('.pin-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dayKey = btn.getAttribute('data-day');
      const shift = proposal.shifts[dayKey];
      if (shift && !shift.isExcluded) {
        store.togglePinDay(dayKey, shift.slots);
        // Refresh proposal with current pin state
        runGeneration(store.state.attemptCount || 0);
      }
    });
  });

  // Render Workload Summary List
  workloadSummaryList.innerHTML = '';
  store.state.members.filter(m => m.active !== false).forEach(m => {
    const count = proposal.workload[m.id] || 0;
    const item = document.createElement('div');
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';
    item.style.padding = '8px 12px';
    item.style.background = 'white';
    item.style.border = '1px solid var(--border)';
    item.style.borderRadius = 'var(--radius-sm)';

    item.innerHTML = `
      <span style="font-weight: 600;">${escapeHtml(m.name)}</span>
      <span class="tab-badge" style="background: var(--primary-light); color: var(--primary-dark); font-weight: 700; font-size: 0.85rem;">
        ${count} ${count === 1 ? 'turno' : 'turni'}
      </span>
    `;
    workloadSummaryList.appendChild(item);
  });
}

function getGeneratedWhatsAppText() {
  return buildWhatsAppMessage({
    lineName: store.state.lineName,
    weekStartDate: store.state.weekStartDate,
    proposal: store.state.currentProposal,
    members: store.state.members,
    customNote: store.state.customNote
  });
}

function updateWhatsAppPreview() {
  const text = getGeneratedWhatsAppText();
  whatsappPreviewText.textContent = text;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// Start application
document.addEventListener('DOMContentLoaded', init);
