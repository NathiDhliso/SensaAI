# Capture Real Interactive Screenshots

This guide will help you capture actual screenshots of your app in action, not just the library page.

## Quick Start

### Step 1: Find Your AZ-104 Subject ID

1. Make sure your dev server is running:
   ```powershell
   npm run dev
   ```

2. Open your browser and go to: `http://localhost:5173/library`

3. Find the **AZ-104 (Azure Administrator)** card

4. Click the **"View"** button

5. Copy the subject ID from the URL:
   ```
   Example URL: http://localhost:5173/launchpad/abc123xyz456
   Subject ID:  abc123xyz456
   ```

### Step 2: Set the Subject ID

Run the setup script:

```powershell
.\SET_SUBJECT_ID.ps1
```

When prompted, paste your subject ID.

### Step 3: Capture Screenshots

Run the interactive screenshot tests:

```powershell
npx playwright test tests/capture-interactive.spec.ts --project=chromium
```

## What Gets Captured

The test will capture 10 real screenshots:

1. **Library Page** - Your saved learning systems
2. **Launchpad** - Analytics and readiness dashboard (after clicking "View")
3. **Study Overview Tab** - Subject overview and progress
4. **Learn Tab (Before Session)** - The learning interface before starting
5. **Session Config Modal** - Goal selection and duration settings
6. **Active Session - ULC Matrix** - The actual learning matrix with concepts
7. **Blueprint Drawer** - What appears when you click a concept cell
8. **Concept Map** - The interactive concept map (Structure tab)
9. **Home Page** - Landing page
10. **Login Page** - Authentication page

## Screenshots Location

All screenshots will be saved to: `./screenshots/real-*.png`

- `real-01-library.png`
- `real-02-launchpad.png`
- `real-03-study-overview.png`
- `real-04-learn-tab-before-session.png`
- `real-05-session-config-modal.png`
- `real-06-ulc-matrix-active.png`
- `real-07-blueprint-drawer.png`
- `real-08-concept-map.png`
- `real-09-home.png`
- `real-10-login.png`

## Troubleshooting

### "No subject ID found"
- Make sure you have AZ-104 content in your library
- Try generating AZ-104 content first from the home page

### "Start session button not found"
- The button might have a different label
- Check the screenshot to see what's actually on the page

### "Concept cells not visible"
- The session might not have started properly
- Try manually starting a session first to see the flow

## Manual Alternative

If the automated tests don't work, you can manually capture screenshots:

1. Open your app in the browser
2. Navigate through the flow:
   - Library → Click "View" on AZ-104
   - Click "Learn" button
   - Start a session
   - Click on concept cells
3. Use your browser's screenshot tool or Windows Snipping Tool

## Next Steps

After capturing, you can:

1. View the screenshots in the `screenshots` folder
2. Open `screenshots/index.html` to see them in a gallery
3. Share them or use them for documentation
