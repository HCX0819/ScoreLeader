# LiveScore Enhancements Task List

## Completed ✅

- [x] **5. Score Breakdown & Tracking (PRIORITY)**
    - [x] Refactor `ScoreboardData` schema (Board -> Activity -> Game).
    - [x] Implement "Direct Edit" logic for Activities with no games.
    - [x] Implement "Sum of Sums" logic for nested Activities.
    - [x] Update `ControllerPage` with Summary + Sub-Table UI.
    - [x] Add "Round Total" sum row to sub-game table.
    - [x] Add vertical separator lines to sub-game table.
    - [x] Make activity columns expand to fill space when few activities.
    - [x] Make activity name always editable (with or without sub-games).

- [x] **6. Customization**
    - [x] Allow user to change the background color (via Settings modal).

- [x] **3. Logo & Board Identity**
    - [x] Add logo upload in the header (click on logo area).
    - [x] Add board name editing (click on title).
    - [x] Ensure name/logo consistency in all UI entry points.

- [x] **Classic Visual Customization** (from previous session)
    - [x] Refine Panel glassmorphism for ultra-transparent "Glass" look.
    - [x] Debug and fix View Page table glassmorphism.
    - [x] Achieve seamless row UI (removed box effect from sticky columns).
    - [x] Eliminate "Dark Line" seams (unified backgrounds & removed borders).
    - [x] Add logo error handling for broken images.
    - [x] Ensure background color column updates reliably.

- [x] **Dashboard Enhancements** (from previous session)
    - [x] Create Info Edit Modal on Dashboard.
    - [x] Implement Title editing logic.
    - [x] Implement Logo editing/upload logic.

---

## In Progress 🔄

- [x] **4. Score Editing & Flexibility**
    - [x] Retain double-click manual score editing.
    - [x] Quick action buttons (Configurable).
    - [x] Implement configurable score denomination (custom increment/decrement values).
    - [x] Restore default increments ([5, 7, 10]).

---

## Pending ⏳

- [x] **1. UI & Wording Clarity**
    - [x] Rename "Share" and "View Board" buttons for better clarity.
    - [x] Add visual indicators for "Edit Mode" vs "View-only Mode".

- [x] **2. Sharing & Access Control**
    - [x] Enable sharing for view-only mode.
    - [x] Distinguish between Staff (edit) and Participants (view).

---

## Future Enhancements 💡

- [ ] Mobile-specific optimizations for controller page
- [ ] Export scoreboard data to CSV/PDF
- [ ] Real-time collaboration indicators
- [ ] Undo/redo for score changes
