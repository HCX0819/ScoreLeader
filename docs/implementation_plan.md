# Implementation Plan - LiveScore Enhancements

This plan outlines the enhancements to the LiveScore application, focusing on UI clarity, flexible sharing, and improved score tracking.

## Proposed Changes

### UI & Wording Clarity
- **Button Labels**: Update "Share" -> "Invite Staff" (on control page) and "View Board" -> "Open Public Link".
- **Mode Indicators**: Add a clear status badge (e.g., "Editing" vs "Live View") at the top of the board.

### Sharing & Access Control
- **Public Sharing**: Ensure the `view` route is easily shareable from the control page.
- **Role Separation**: Define "Staff" (Edit) and "Participants" (View) explicitly in the wording and navigation.

### Logo & Board Identity
- **Three-Dot Menu**: Enhance the dropdown menu on the dashboard and board pages to include:
  - **Edit Name**: Modal or inline edit for the board title.
  - **Change Logo**: Simple upload or URL input for the board logo.
- **Consistency**: Pass the logo and name correctly through the `useScoreboard` hook to all relevant components.

### Score Editing & Flexibility
- **Denomination Setting**: Add a "Settings" section for each score column or board-wide to set increment/decrement values (e.g., +1, +5, +10).
- **Manual Input**: Keep the double-click event listener on score cells to allow direct numeric input.

### Score Breakdown & Tracking
- **Nested Table**: Instead of just total scores, allow drilling down into score history or categories (e.g., Round 1, Round 2) using a nested layout.
- **Change Log**: Store a history of score changes in the database to allow "tracking/reviewing" changes.

### Customization
- **Background Color**: Add a color picker in the settings menu to update the `background_color` field in the database.

## Most Important Task: **Score Breakdown & Tracking (5)**
I recommend starting with **Score Breakdown & Tracking** because it's the core functional improvement for tracking scores accurately. However, if you prefer focusing on usability first, we can start with **UI & Wording Clarity (1)** and **Sharing & Access Control (2)**.

## User Review Required
> [!IMPORTANT]
> - Do you have a preferred layout for the "nested table" (e.g., expanding rows or a separate side panel)?
> - For logo upload, do you want to upload actual files (requires Supabase Storage) or just use image URLs?
