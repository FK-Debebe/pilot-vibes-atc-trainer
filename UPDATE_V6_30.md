# V6.30 Owner Usage Dashboard update

## What is included

- All time, Today, Last 7 days, Last 30 days, custom dates (inclusive UTC calendar days).
- Profile-name search; VFR/IFR/Unclassified mode; signed-in/historical-guest type; latest country code, region and city.
- Exclude your own profile, stable sorting by hours, last contact or name; Previous/Next pages.
- Filtered profile and active-hour summaries. Separate VFR, IFR and Unclassified columns.
- CSV export of every matching page, with protection against spreadsheet formula injection.
- Reset, refresh, last refreshed time, no-results state and explicit authorization/upgrade errors.
- Daily server-credited totals, with existing retry deduplication and server-time caps.

## Update order — existing Cloudflare database

1. Open Cloudflare → D1 SQLite Database → **fk-atc-usage** → Console.
2. Copy the complete contents of **FK_ATC_Usage_Migration_V6_30.sql** into the SQL input and execute it **once**. It adds the mode column, daily totals table, metadata and a credit trigger. It does not delete or recalculate existing lifetime totals. Do not substitute `schema.sql` for this migration on an existing database.
   - If it reports `duplicate column name: mode`, do not blindly rerun the file. Check that `usage_daily`, `usage_metadata` and `credit_daily_usage` exist before continuing. If the mode column already exists but the other objects do not, run only the statements after the ALTER TABLE statement.
3. Open Workers & Pages → **fk-atc-usage-api** → Edit code. Select the latest editable version. Replace **worker.js** with the full contents of **FK_ATC_Usage_Worker_V6_30.txt**, then Deploy.
   - Keep **DB**, **API_RATE_LIMITER**, **ALLOWED_ORIGINS**, **GOOGLE_CLIENT_ID** and the secret **OWNER_EMAILS** as configured. Never paste OWNER_EMAILS into public GitHub files. This release does not need new secrets or bindings.
   - Alternative CLI workflow from usage-backend: run the migration against the remote DB, then deploy worker.mjs with its included modules. The TXT is a combined version for dashboard copy/paste.
4. Upload the website files from this package to the existing GitHub Pages repository, retaining CNAME and the existing configuration. In particular replace usage-dashboard.html, usage-dashboard.js, usage-client.js, index.html, 404.html, analytics.js and service-worker.js. The backend folder and SQL/TXT are deployment sources, not browser scripts.
5. Return to the trainer. Sign out and sign in with your authorized owner Google account. Open Owner dashboard and Refresh. Owner verification still lasts one hour; the trainer login remains remembered separately.

## Verify after deployment

- All time should retain the existing lifetime totals. Previous usage appears as Unclassified.
- Practice VFR actively for at least a minute, then IFR for at least a minute. Allow the normal usage heartbeat to finish. Refresh the dashboard: new daily VFR and IFR time should appear if usage collection is enabled in that browser.
- Select Today, a mode, a location, and Exclude my activity. Use Apply filters. Try Reset filters and CSV export. Refresh uses the currently applied filters; Apply filters applies edits.
- A normal user must be denied owner data; a signed-out request must be denied. An expired owner verification should show a useful message rather than an empty result.

## How to interpret the numbers

- Dates use UTC, not local midnight. Usage batches are attributed to the UTC day the server receives them (normally a small periodic heartbeat). A batch crossing midnight may be credited to the next day.
- Daily/mode history starts at migration. Older raw batches are not used to invent a partial historical breakdown. All time keeps lifetime totals; daily filters include only the new daily records.
- Unclassified includes old usage and new activity on non-trainer sections. An all-time mode filter displays only usage classified with that mode. Totals and CSV reflect the applied filters.
- Profile/browser IDs are not verified individual people. All time can include sign-ins with no active usage. Date/mode filters include profiles with credited time matching those filters.
- Location is each profile's latest approximate location, not its location on every historical day. Last activity is the latest recorded contact across all dates, which may be a sign-in. No GPS, email, radio scripts or flight reports were added to collection.
- Browser opt-outs and privacy signals remain respected. Google Analytics is separate.
- Daily totals survive cleanup of the short-lived retry batches. Existing profile deletion cascades to its daily data. CSV exports are local downloaded copies and remain wherever you save them.
- CSV paginates through all matches. A concurrent login/usage update may affect ordering during an export; for a rapidly changing dataset, refresh and export again if needed. Rate-limit errors do not generate a partial CSV.

## Validation

Passed: existing backend auth/cryptographic verification and privacy checks; date boundaries and invalid dates; search/location/type/mode/self filters; safe SQL parameters; multi-page sorting; lifetime/daily reconciliation; daily deduplication; migration of an old populated schema; daily retention; UI filters/reset/pagination; CSV escaping and all-page export; expired-access and outdated-backend messages; client mode forwarding; sign-in/welcome; analytics regression. Browser visual inspection was unavailable in this environment; check the responsive dashboard on desktop and mobile after deployment.
