# V6.32 — Total usage time

The owner dashboard total summary, per-profile Total time column and CSV Total time column now use hh:mm:ss. For example, 3661 seconds displays 01:01:01. Hours can exceed 24 (no day wrap). VFR/IFR/Unclassified hours retain their existing decimal-hour format.

Upload website files to GitHub, including usage-dashboard.html, usage-dashboard.js, index.html, 404.html, analytics.js and service-worker.js. No new Cloudflare Worker or SQL update is needed. If the V6.30 backend upgrade is still pending, complete UPDATE_V6_30.md.

Verified formatter boundaries, long durations, dashboard summaries/rows and CSV, plus existing dashboard filter/export checks.
