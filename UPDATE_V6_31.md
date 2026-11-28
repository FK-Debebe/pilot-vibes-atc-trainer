# V6.31 — Welcome scroll fix

After the welcome popup closes on desktop, focus stays on Training Level without scrolling, and the page scrolls to the top after layout and focus restoration. Mobile continues to position Flight Setup in view.

Upload the website files to GitHub, especially index.html, 404.html, usage-client.js, analytics.js and service-worker.js. No additional Worker or SQL update is needed if V6.30 has already been deployed. If you have not deployed V6.30, follow UPDATE_V6_30.md for its required database migration and Worker deployment.

Automated welcome scroll, welcome dialog and sign-in checks passed. Live desktop visual verification remains pending.
