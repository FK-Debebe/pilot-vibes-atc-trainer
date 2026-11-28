# V6.27 startup order

Login or validate a remembered Google session, show the welcome popup, then open Flight Setup. Guest access remains removed. Upload departure-procedures.js with the app. No Cloudflare changes. See V6_27_CHANGES.md for KMYF and the departure library scope.

---

# V6.24 — Google sign-in required

Guest access has been removed from the public trainer interface. Mobile phones show the welcome popup and then Google sign-in. Desktop users see Google sign-in immediately. Only a server-verified member session opens the trainer. Saved Google sessions remain valid for up to 30 days on the same browser; sign-out removes them. Analytics opt-out, GPC and Do Not Track do not block sign-in or enable usage tracking.

Publish the V6.24 app files to GitHub Pages, keeping CNAME. No Worker or SQL change is needed. Old guest browser credentials are discarded. The backend still uses a short-lived, location-free pre-login session to issue and verify the Google nonce; this is not guest training access. Historical guest records are retained. Training code is still distributed as a static web app: this sign-in requirement is interface-level gating, not backend protection of the training source.

Automated tests cover mandatory entry, Google verification, returning login, mobile order, privacy settings, sign-out, network/login failure and expiry. Real Google UI/provider availability should be checked after deployment.

---

# FK ATC COM Trainer V6.10 — profile and guest usage system

## What is built, and what is not live yet

This package contains the trainer integration, optional Google sign-in, a private owner dashboard, a Cloudflare Worker API, a SQL database schema, and local automated checks. It has **not been deployed** to your Cloudflare or Google account. The new usage API and sign-in are inactive until `usage-config.js` is configured. Existing Google Analytics G-BSZSTV58Y4 continues with its existing settings.

The trainer remains at https://atc.fwdskillzone.com on GitHub Pages. The database runs separately on Cloudflare D1, with the API on a `workers.dev` address. **You do not need to move your domain or change your working Weebly DNS.**

The custom usage database stores only a random profile ID, a hashed Google account identifier for members, a display name, guest/member status, last approximate country/region/city, accumulated active seconds, and creation/last-activity times. It also has expiring hashed session credentials, temporary login challenges and short-lived idempotency batches. It receives no flight reports, radio text, audio, flight routes or callsigns. Emails are checked transiently for owner authorization, not stored. No password database is created.

## What you need to supply

1. A Cloudflare account that you own. https://dash.cloudflare.com/sign-up
2. A Google Cloud project and Web OAuth client ID for optional Google sign-in. This is different from your GA4 G-... ID. https://console.cloud.google.com/
3. Your own **Gmail address** as a private backend owner-allowlist setting. Only verified Gmail accounts listed there can read all profiles. No owner account is pre-selected in this package. Ordinary Google accounts can sign in but receive no owner-report access.

Do not send passwords, Cloudflare API tokens or Google client secrets in chat. Only the public deployed API URL and Web OAuth client ID belong in the trainer's public configuration.

## Deploy the backend

The `usage-backend` folder is a separate backend project, not a GitHub Pages folder to browse. Run these commands in a terminal with Node.js installed:

```sh
cd usage-backend
npm install
npx wrangler login
npx wrangler d1 create fk-atc-usage
```

Copy the returned database ID into the `database_id` field in `wrangler.jsonc`, replacing `REPLACE_WITH_D1_DATABASE_ID`. Keep `binding` as `DB` and the database name as `fk-atc-usage`.

Create the database tables:

```sh
npx wrangler d1 execute fk-atc-usage --remote --file=schema.sql
```

Create a **Web application** OAuth client in Google Cloud using Google Identity Services. Set the authorized JavaScript origin to **https://atc.fwdskillzone.com**. Configure the Google consent/branding screen with the app's name and support details; publish it as appropriate for your intended audience. This uses the Google button/popup callback and an ID token, not an app password or an OAuth client secret in the browser.

Set `GOOGLE_CLIENT_ID` in the Worker's `wrangler.jsonc` to that client ID. It normally ends with `.apps.googleusercontent.com`. Keep `ALLOWED_ORIGINS` restricted to the trainer's exact origin. Do not use `*`. Only add another origin if you actually intend to serve the app there.

Set the owner allowlist privately:

```sh
npx wrangler secret put OWNER_EMAILS
```

At the prompt, enter the Gmail address you will use to sign in as the owner. Multiple owner Gmail addresses can be comma-separated, but leave this as your address only if nobody else should see reports. Do not put this setting in `usage-config.js` or the public GitHub repository.

Publish:

```sh
npx wrangler deploy
```

The Worker configuration includes a rate limiter, 30-day signed-in sessions with one-hour owner-report authorization, daily cleanup and disabled application request logging. Keep the rate-limiter binding enabled; the service deliberately fails closed without it. Rate limiting is per Cloudflare location and does not guarantee protection from all automated traffic. Review Cloudflare's current service quotas/pricing in your own account before deployment.

## Connect the trainer

Edit **usage-config.js**:

```js
window.FK_USAGE_CONFIG=Object.freeze({
  apiBase: "https://YOUR-DEPLOYED-WORKER.YOUR-SUBDOMAIN.workers.dev",
  googleClientId: "YOUR-WEB-CLIENT-ID.apps.googleusercontent.com"
});
```

You can connect guest tracking before configuring optional Google sign-in by leaving `googleClientId` blank. The backend still needs the owner Google client configuration to let you view the dashboard. A dashboard HTML page by itself does not authorize anyone to read records.

Upload the trainer files to the GitHub Pages publishing folder. Include the new `usage-config.js`, `usage-client.js`, `usage-dashboard.html`, `usage-dashboard.js` and updated privacy page and service worker. Keep the included `CNAME` file. Backend source files do not need to be published on GitHub Pages; deploy them to Cloudflare instead. None of these files contains owner secrets.

## Startup sign-in and private dashboard (V6.14)

Mobile: welcome popup, then entry page. Other devices: entry page immediately. Valid returning Google sessions continue directly to Flight Setup. Google sign-in and Continue as Guest open Flight Setup. Guest remains available when sign-in or usage tracking is unavailable.

Signed-in users have Sign out; authorized owners also have Owner dashboard. Profile and usage, Close and Delete my usage data controls have been removed. Backend deletion remains supported. Analytics privacy and browser privacy protections remain in effect.

Sign in using the Gmail address stored privately in OWNER_EMAILS, then select Owner dashboard. Other users cannot read the owner API. Upload this version to GitHub Pages before testing real Google sign-in and mobile rendering.

## Measurement and privacy details

- Active time reuses the existing analytics timer: visible app time, capped after 60 seconds without interaction. The separate database receives only seconds, not training events or text.
- Location is read by the backend from Cloudflare's request metadata, not GPS or a client-supplied city. Only country, region and city are retained, with the last location replacing the previous one. Country/region/city can be empty or inaccurate, especially with VPNs or mobile connections. No raw IP, precise coordinates, postal code or device fingerprint is stored by this code. Cloudflare/Google still process requests under their own service policies.
- Guest credentials are stored in that browser for up to 90 days. Signed-in credentials are saved in this browser's local storage for up to 30 days, with a session-storage fallback. Returning visits validate the credential with the server before entering the trainer. Sign out revokes and clears it. Owner report authorization expires after one hour; sign out and sign in again to reverify owner access. Clearing browser storage, expiry, or using another browser produces a different guest ID. Cross-device member usage joins after sign-in.
- A heartbeat is a browser estimate, not proof a human practiced. The server limits credited seconds to elapsed server time and deduplicates batch IDs. Two tabs sharing a guest credential cannot credit time faster than wall-clock time. Separate signed-in device sessions can accumulate concurrently.
- During a short network problem, up to 20 usage batches are held in memory. Reconnect delivery is best-effort; server elapsed-time caps can undercount offline bursts. Nothing is queued persistently across reloads. Old GA4 usage is not imported or linked to named profiles.
- The Analytics privacy opt-out and browser Do Not Track/GPC settings apply to the new system. They are not bypassed. Google sign-in remains available while usage is off. Authentication-only requests carry X-FK-Usage: off: they create a short-lived sign-in challenge session and store no new location or usage time. Signed-in profile identity and sign-in timestamps are still used to provide account access. Existing location and usage totals are retained, not updated by a privacy-disabled login. Guest entry without tracking makes no usage-session requests.
- The public deletion button is removed in V6.13; authenticated backend deletion remains available for data deletion requests.
- Daily cleanup removes expired sessions, usage batch rows older than two days, and guest profiles inactive for 180 days. Member profiles and their accumulated totals remain until deleted. Platform backups may follow separate retention policies.

## Verification before calling it live

Run the local checks:

```sh
node usage-backend/test.mjs
node qa/usage-client.cjs
node qa/analytics.cjs
node qa/ifr-full-flight.cjs
```

Then test on the deployed app:

1. Guest: practice for 1–2 minutes; confirm a guest profile and approximate location appear in the owner dashboard with increasing hours.
2. Sign in as an ordinary pilot: verify the display name and accumulated guest time join the member profile; verify the owner URL cannot retrieve other users' records.
3. Owner: sign in as your allowlisted verified Gmail; verify dashboard access. Test that access expires and requires reauthentication.
4. Opt out and enable GPC in a separate browser profile: confirm no new usage requests are sent, while training still works.
5. Delete a test user's usage data and confirm the profile disappears and its old session stops working.
6. Test mobile Google sign-in, slow/offline connections, reloads and signing out on a shared device.

Local tests use a real in-memory SQLite database and generated RSA keys, with mocked provider identities and edge metadata. They do not demonstrate real Google OAuth, real IP geolocation, Cloudflare deployment, quota behavior or rendered mobile/desktop appearance. Those remain deployment checks.

## Official references

- Cloudflare D1 setup: https://developers.cloudflare.com/d1/get-started/
- Worker location metadata: https://developers.cloudflare.com/workers/runtime-apis/request/
- Rate-limit binding: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Google Web client ID setup: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
- Google ID token validation: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token

## V6.14 deployment

Replace the deployed Worker code with FK_ATC_Usage_Worker_V6_14.txt and deploy. Keep DB, API_RATE_LIMITER, ALLOWED_ORIGINS, GOOGLE_CLIENT_ID and the secret OWNER_EMAILS. No database schema change is required. Then publish the V6.14 app files to GitHub Pages. Test real Google sign-in with tracking enabled and disabled, plus owner dashboard access. Local tests mock Google UI; they verify real token validation separately but cannot confirm browser/provider settings.

## V6.19 deployment and remembered login

Replace worker.js with FK_ATC_Usage_Worker_V6_19.txt, then deploy. Keep the existing bindings and secret variables. No SQL migration is needed. Upload the V6.19 app files to GitHub Pages, keeping CNAME. Existing short-lived logins need a new Google sign-in to receive a 30-day session. Login persists only in the same browser/profile while its storage is retained. Private browsing, cleared site data, expired/revoked sessions or blocked storage may require sign-in again. Owner-report access requires fresh verification after an hour, independently of the remembered trainer login. Tracking privacy settings remain separate from authentication. The new eChecklist navigation and guide links open its verified Google Play listing in a new tab.
