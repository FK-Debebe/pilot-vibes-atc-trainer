# V6.26 first published departure module

Scope: KLGB ANAHEIM TWO (ANAHM2), assigned-route communication exercise. Default remains No published SID. Supports all KLGB runway headings in the chart; 8L/R and 12 use 125.35, 26L/R and 30 use 127.2 for this assigned-route exercise via Seal Beach. No Ventura transition is modeled. No RNAV SID, climb-via, ODP, trajectory, obstacle-clearance or climb-performance assessment is implemented.

Official FAA chart snapshots, cycle 2612 (Nov 26–Dec 24, 2026):
- https://www.faa.gov/aero_docs/dtpp/2612/00236ANAHEIM.PDF
- https://www.faa.gov/aero_docs/dtpp/2612/00236ANAHEIM_C.PDF

Both downloaded FAA PDFs are included in charts/ and linked from the briefing. RADAR required; top altitude assigned by ATC. Published initial headings to 800: 8L/R 076, 12 121, 26L/R 256, 30 301. Rwy26L: 225 ft/NM to2300;26R:230ft/NM to2300. The user must assess equipment and performance from current charts before any real flight; this app does not do so. This dataset does not update automatically; retain the snapshot date label and reverify against new FAA cycles before expanding the module.

Clearance adds Anaheim Two, vectors Seal Beach and onward route to existing initial/expected-altitude, departure-frequency and squawk assignments. Readback requires the procedure name/revision and Seal Beach/SLI at all levels. Takeoff readback must match the actual assigned initial heading. Separate departure handoff remains required. Non-KLGB airports cannot activate this module. Named transitions and advanced amendments are future work.

Tests: qa/ifr-departure-procedure.cjs; qa/ifr-full-flight.cjs; qa/ifr-stage-flow.cjs. No simulator integration or Cloudflare update is needed. Publish charts/ along with the app files to GitHub Pages.
