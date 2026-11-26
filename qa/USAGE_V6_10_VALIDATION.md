# V6.10 usage-system validation

Passed local checks:

- Real in-memory SQLite schema, triggers, cumulative totals and idempotent heartbeats.
- Seconds cannot be credited faster than elapsed server time for a shared guest session.
- Unknown origin, missing session and non-owner access are denied.
- Login challenges are one-time, guest time merges into the matching member once, session tokens rotate, and owner credentials expire.
- Actual RSA signatures are verified with generated test keys; altered tokens, wrong audiences/issuers/nonces and expired tokens fail.
- Owner-only dashboard responses contain usage fields, not credentials, Google subject IDs or emails.
- Self-deletion removes associated sessions/usage batches without deleting other profiles.
- Missing configuration, opt-outs and supported privacy signals prevent client collection.
- The client only uploads a batch UUID and numeric seconds, never report/transcript/audio fields.
- Existing VFR flight-following, no-flight-following, traffic-pattern and IFR full-flight/report flows pass.
- Existing GA analytics and recovery tests pass.
- Script syntax checks pass; index/404 copies match and custom-domain CNAME is preserved.

Not verified live: Cloudflare deployment/bindings/rate limiter, real Google OAuth, real edge location data, Google/Cloudflare delivery, or rendered desktop/mobile layout. The new usage API/sign-in are disconnected by default until configured. Read START_HERE_USAGE.md before publishing and connecting the backend.
