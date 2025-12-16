Reports page cleanup and fixes
================================

Summary:
- Added diagnostics logging of API payloads for debugging raw server data.
- Sanitized numeric inputs and formatted numbers using Intl.NumberFormat('en-IN').
- Re-styled the Reports page: control bar, KPI cards, sticky table header, right-aligned numeric columns, skeleton, and empty-state.
- Disabled Export buttons until results present; added aria attributes for accessibility.
- Added a basic RTL unit test to exercise generate -> enable export -> formatting.

Notes:
- If you find concatenated or malformed numbers in the debug logs (see console output from `console.debug('reports raw', ...)`), this indicates server-side data issues and should be raised as a backend ticket.
- This frontend will defensively sanitize incoming values to avoid display concatenation and ensure numeric totals are computed correctly.

Files changed/added:
- `client/src/pages/Reports.jsx` (major)
- `client/src/pages/reports.css` (new)
- `client/src/pages/reportsMock.js` (added earlier)
- `client/src/pages/__tests__/Reports.test.jsx` (new)
