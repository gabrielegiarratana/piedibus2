# Frozen Specification: Piedibus Shift Table Tool (Desktop & Android Mobile)
**Methodology:** Spec-Driven Development (SDD)  
**Status:** Frozen & Approved via `/grill-me` Interview  
**Target:** Desktop Browser & Android APK (Pure Responsive Web + Capacitor Scaffolding)  
**Language:** Italian (UI & WhatsApp Message)  

---

## 1. Executive Summary & Architecture

The **Piedibus Shift Table Tool** is an offline-first, zero-build responsive web application equipped with ready-to-build **Capacitor Android scaffolding** for one-command APK generation (`npx cap open android` / `npx cap build android`).

It solves the weekly volunteer allocation problem for walking school bus ("Piedibus") groups, ensuring fair distribution, handling variable school weeks, allowing interactive approval/reshuffling with day-pinning, and formatting ready-to-share WhatsApp announcements.

---

## 2. Detailed Functional Requirements (Derived from `/grill-me`)

### FR-1: Team Roster Management
- **1.1 Volunteer List:** Coordinator manages list of members (Name, optional phone number).
- **1.2 Sample Pre-Population:** First launch automatically pre-loads 6 realistic sample volunteers (e.g. *Marco Rossi, Anna Bianchi, Luca Verdi, Sofia Neri, Elena Fontana, Matteo Ferrari*) with diverse sample availabilities, plus a 1-click **"Azzera Volontari" (Clear Roster)** button.
- **1.3 Active Toggle:** Coordinator can toggle any member active/inactive (e.g. temporarily sick/away) without deleting them.
- **1.4 Persistence & In-Place Editing:** Volunteer names, active statuses, and availabilities are continuously saved in local storage. Once configured, custom volunteer names persist across browser sessions and cannot be overwritten by default sample data. Inline editing (✏️) allows changing volunteer names at any time.
- **1.5 File Export / Drive Portability:** A 1-click "Salva per Drive" button produces a standalone file embedding the user's active team roster as defaults, ensuring persistence when shared to Android devices via Google Drive even if local storage is restricted.

### FR-2: Availability Matrix (Monday – Friday)
- **2.1 Single Morning Shift:** Supports morning walk to school ("Andata").
- **2.2 Day Selection:** Each member has 5 independent toggles: Lunedì, Martedì, Mercoledì, Giovedì, Venerdì.
- **2.3 Responsive Controls:**
  - Desktop: Grid matrix view.
  - Mobile: Large touch buttons ($\ge 48\text{px}$) with active state indicators.

### FR-3: Week Days Configuration (Exclusion Filter)
- **3.1 Week Range Selection:** Sets the Monday date for the upcoming week.
- **3.2 Day Toggles:** Coordinator can toggle any day off (e.g. "Mercoledì chiuso per festività / sciopero").
- **3.3 Active Day Counter:** Shows total required shifts ($N_{\text{active days}} \times 2$).

### FR-4: Balanced Assignment Algorithm (The Solver)
- **4.1 Exact Requirement:** Exactly 2 members assigned per active day.
- **4.2 Most-Constrained First:** Members with fewer available days are assigned first to prevent dead ends.
- **4.3 Workload Equalization:** Remaining assignments are distributed such that every member's total weekly shifts are balanced ($\Delta \le 1$ shift whenever mathematically possible).
- **4.4 Partial-Fill Warning (`[CERCA VOLONTARIO]`):**
  - If a day has only 1 available volunteer, that volunteer is assigned and the second slot is marked as `⚠️ [CERCA VOLONTARIO]`.
  - If a day has 0 available volunteers, both slots are flagged as `⚠️ [CERCA VOLONTARIO]`.
  - Generation is **not blocked**; instead, clear alerts appear in the UI and the generated WhatsApp message explicitly highlights the missing slots to ask for volunteer help.

### FR-5: Proposal Review & Interactive Approval Workflow
- **5.1 Proposal Display:**
  - Clear table/card layout showing each active day and the two assigned members.
  - Summary badges showing how many shifts each member was allocated (e.g., *Marco: 2, Anna: 2, Luca: 2*).
- **5.2 Day Pinning (Locking):**
  - Coordinator can click a **Pin/Lock icon** on any day they like.
- **5.3 Decision Gate:**
  - Prompt: **"Questa proposta va bene?"**
  - **Button [Proponi un'altra combinazione] (Reject / Reshuffle):** Generates an alternative valid permutation while **keeping pinned days fixed**.
  - **Button [Conferma e Prepara WhatsApp] (Approve):** Locks the schedule and navigates to the WhatsApp sharing view.
  - **Manual Override:** Coordinator can click any slot to swap or choose an alternative available volunteer directly.

### FR-6: WhatsApp Formatted Output
- **6.1 Italian Template:**
  ```text
  🚶‍♂️ *PIEDIBUS - TURNI DELLA SETTIMANA* 🚶‍♀️
  🏫 *Linea*: {Nome Linea / Scuola}
  📅 *Settimana dal {DataInizio} al {DataFine}*

  • *Lunedì*: {Membro 1} e {Membro 2}
  • *Martedì*: {Membro 1} e ⚠️ *[CERCA VOLONTARIO]*
  • *Mercoledì*: ⛔ *CHIUSURA (Scuola Chiusa)*
  • *Giovedì*: {Membro 1} e {Membro 2}
  • *Venerdì*: {Membro 1} e {Membro 2}

  {NotaPersonalizzata}

  ⚠️ *In caso di imprevisti o impossibilità a coprire il turno, vi preghiamo di avvisare con anticipo o trovare un sostituto. Grazie mille a tutti i volontari!* 🌟
  ```
- **6.2 Editable Note:** Custom note box allows adding specific reminders before copying.
- **6.3 One-Click Actions:**
  - **"Copia per WhatsApp"** (copies formatted markdown text to clipboard with toast notification).
  - **"Apri WhatsApp"** (`https://wa.me/?text=...` URI intent for direct sharing on mobile or desktop).

---

## 3. Platform & Packaging Architecture

1. **Zero-Build Local Web App:**
   - Standalone application using standard HTML5/CSS3/ES6 Modules (`index.html`, `styles.css`, `app.js`, `solver.js`, `store.js`).
   - Runs instantly in any desktop or mobile browser without requiring node or compilation.
2. **Capacitor Android APK Packaging:**
   - Pre-configured `capacitor.config.json` with package ID `it.piedibus.shifttable`.
   - Android asset directory scaffolded.
   - Script in `package.json` for:
     * `npm run open:android`: Launches Android Studio.
     * `npm run build:apk`: Builds debug APK via Gradle wrapper.

---

## 4. Verification Scenarios (Test Plan)

1. **Test-1 (Sample Roster & Availability):** Verify that default volunteers load and availability can be toggled per day.
2. **Test-2 (Week Filtering):** Toggle Wednesday off; ensure Wednesday is marked as closed and only 8 slots are scheduled across 4 days.
3. **Test-3 (Constrained Allocation & Balance):** Run solver with member having 1-day availability; ensure they are prioritized on that day and workload across all members is balanced.
4. **Test-4 (Partial Coverage Warning):** Test a scenario where Friday has only 1 available volunteer; verify `[CERCA VOLONTARIO]` is flagged and included in WhatsApp text.
5. **Test-5 (Pinning & Reshuffling):** Pin Monday's assignment, click "Proponi un'altra", verify Monday stays identical while Tuesday-Friday reshuffle.
6. **Test-6 (WhatsApp Export):** Verify clipboard copying, proper text formatting, and Italian phrasing.
7. **Test-7 (Mobile & Desktop Responsiveness):** Test rendering at 360px (mobile) and 1280px (desktop), verifying touch target sizes $\ge 48\text{px}$.
8. **Test-8 (Name Persistence & Editing):** Verify renaming a volunteer updates state, persists through storage, and propagates to shift cards and WhatsApp message.
9. **Test-9 (Shift Reset Isolation):** Verify resetting weekly shift proposals clears allocations and pinned days while leaving team member names and availabilities 100% intact.
