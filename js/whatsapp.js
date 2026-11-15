/**
 * WhatsApp Message Generator and Sharing Utilities
 * Formatted in Italian matching SPEC_PIEDIBUS.md
 */

import { WEEKDAYS, PLACEHOLDER_MISSING } from './solver.js';

/**
 * Calculates the Friday end date from a Monday start date string
 */
function getWeekDateRange(startDateStr) {
  if (!startDateStr) return { startFormatted: '', endFormatted: '' };
  try {
    const start = new Date(startDateStr);
    const end = new Date(start);
    end.setDate(start.getDate() + 4);

    const formatOptions = { day: '2-digit', month: '2-digit' };
    const startFormatted = start.toLocaleDateString('it-IT', formatOptions);
    const endFormatted = end.toLocaleDateString('it-IT', formatOptions);
    return { startFormatted, endFormatted };
  } catch (e) {
    return { startFormatted: startDateStr, endFormatted: '' };
  }
}

/**
 * Builds the formatted Italian WhatsApp text message
 *
 * @param {Object} params
 * @param {string} params.lineName
 * @param {string} params.weekStartDate
 * @param {Object} params.proposal - Output from solver
 * @param {Array<{id: string, name: string}>} params.members
 * @param {string} [params.customNote]
 * @returns {string} Ready-to-send WhatsApp Markdown text
 */
export function buildWhatsAppMessage({
  lineName = 'Piedibus',
  weekStartDate = '',
  proposal = null,
  members = [],
  customNote = ''
}) {
  if (!proposal || !proposal.shifts) {
    return 'Nessun turno programmato.';
  }

  const { startFormatted, endFormatted } = getWeekDateRange(weekStartDate);
  const memberMap = new Map(members.map(m => [m.id, m.name]));

  const lines = [];
  lines.push('🚶‍♂️ *PIEDIBUS - TURNI DELLA SETTIMANA* 🚶‍♀️');
  if (lineName) {
    lines.push(`🏫 *Linea*: ${lineName}`);
  }
  if (startFormatted && endFormatted) {
    lines.push(`📅 *Settimana dal ${startFormatted} al ${endFormatted}*`);
  }
  lines.push('');

  let hasMissing = false;

  for (const day of WEEKDAYS) {
    const shift = proposal.shifts[day.key];
    if (!shift) continue;

    if (shift.isExcluded) {
      lines.push(`• *${day.label}*: ⛔ *CHIUSURA (Nessun Piedibus)*`);
    } else {
      const vol1Name = shift.slots[0] ? memberMap.get(shift.slots[0]) || 'Volontario' : null;
      const vol2Name = shift.slots[1] ? memberMap.get(shift.slots[1]) || 'Volontario' : null;

      let pairText = '';
      if (vol1Name && vol2Name) {
        pairText = `${vol1Name} e ${vol2Name}`;
      } else if (vol1Name && !vol2Name) {
        pairText = `${vol1Name} e ⚠️ *${PLACEHOLDER_MISSING}*`;
        hasMissing = true;
      } else if (!vol1Name && vol2Name) {
        pairText = `⚠️ *${PLACEHOLDER_MISSING}* e ${vol2Name}`;
        hasMissing = true;
      } else {
        pairText = `⚠️ *2 VOLONTARI MANCANTI*`;
        hasMissing = true;
      }

      lines.push(`• *${day.label}*: ${pairText}`);
    }
  }

  lines.push('');

  if (hasMissing) {
    lines.push('🚨 *ATTENZIONE: Abbiamo ancora posti scoperti per alcuni turni! Chi fosse disponibile ad aggiungersi scriva qui nel gruppo. Grazie!* 🙏');
    lines.push('');
  }

  if (customNote && customNote.trim()) {
    lines.push(`📝 *Note*: ${customNote.trim()}`);
    lines.push('');
  }

  lines.push('⚠️ *In caso di imprevisti o impossibilità a coprire il turno, vi preghiamo di avvisare con anticipo o trovare un sostituto.*');
  lines.push('🌟 *Grazie mille di cuore a tutti i volontari!*');

  return lines.join('\n');
}

/**
 * Copies text to the system clipboard
 */
export async function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard writeText failed, trying fallback', err);
    }
  }

  // Fallback for older webviews
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (e) {
    console.error('All clipboard operations failed', e);
    return false;
  }
}

/**
 * Opens WhatsApp sharing link
 */
export function openWhatsAppDirect(text) {
  const encoded = encodeURIComponent(text);
  const url = `https://api.whatsapp.com/send?text=${encoded}`;
  window.open(url, '_blank');
}
