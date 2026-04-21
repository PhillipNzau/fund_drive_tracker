# Fund Drive Tracker

Static public tracker for a fundraiser campaign.

## What It Does

- Shows fundraiser progress against a target amount
- Lists recent and full contribution records
- Displays event details and M-Pesa payment information
- Pulls live data from a Google Apps Script endpoint
- Falls back to saved local data when live sync is unavailable

## File Layout

- `index.html` contains the page structure
- `styles.css` contains the UI styles
- `app.js` contains the client-side data loading and rendering logic

## Data Sources

The app expects a JSON response from the configured Google Apps Script endpoint with:

- `config`
- `contributions`

It also keeps a localStorage backup in:

- `fd_config`
- `fd_contribs`

## Public Viewer Note

This view is intended for all users, so the spreadsheet upload navigation stays hidden in the public UI.
The underlying import code remains in place as a fallback/admin-friendly path if needed later.
