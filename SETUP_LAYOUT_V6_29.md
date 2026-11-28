V6.29 — Flight Setup layout and KMYF label

KMYF now displays as Montgomery in VFR/IFR setup and shared airport data. Recognition aliases are retained.

The setup grid uses shrinkable tracks and controls constrained to their parent width. Narrow IFR setup panels stack airport/arrival fields using a container query. Aircraft Type and Call Sign remain side by side. Setup headings can wrap instead of extending past the card.

Functional verification passed: KMYF airport and taxiway/frequency catalog tests, VFR flights with and without Flight Following to KMYF, and IFR radar-vector checks at all levels. Browser zoom/visual verification could not run: the browser executable is absent and its download was blocked. Check desktop zoom after upload.

Upload the package files to GitHub Pages. No Cloudflare Worker change is required.
