# FK ATC COM Trainer — usage analytics setup (V6.06)

## Status

The trainer is configured with Measurement ID **G-BSZSTV58Y4**. Publish this build to activate automatic collection except for opted-out or privacy-blocked visitors. Live delivery to your GA4 property has not been verified. There is no central dashboard stored in this ZIP. Reports are private in your Google Analytics account. No account password or API secret is required in the app.

You already have Google Analytics for your website. Use that account and create a separate Web data stream for the trainer. If you prefer a fully separate reporting property, create that property in the same account instead. When using the existing property, filter reports by the trainer's Stream name/Stream ID to exclude your website's other traffic.

## Publish and verify this configured build

The Measurement ID is already entered. If this is the trainer's intended Web stream, skip the stream-creation steps below and publish all files, then follow the verification steps. Keep Enhanced measurement off for this stream to avoid duplicate or unwanted automatic events. Check **Admin → Property access management** (and inherited account access) to confirm who can view reports; this ZIP does not change Google Analytics permissions.

## Stream setup reference

1. Open https://analytics.google.com/ and select your property.
2. Go to **Admin → Data streams → Add stream → Web**.
3. Enter the trainer's actual public URL and name the stream **FK ATC COM Trainer**. Use its deployed URL, not a local `file:` URL.
4. **Turn Enhanced measurement OFF for this stream.** This integration sends its own page and training events. Automatic form, click, search and history measurement is not needed and can produce unwanted data or duplicate page views. Do not add a second Google tag to the trainer through your website builder or Google Tag Manager.
5. Copy the stream's **Measurement ID**, which begins with `G-` (not the numeric Stream ID).
6. Send that ID to FK's app maintainer to receive a connected build, or edit this one line in `analytics-config.js`:

   ```js
   measurementId: "G-YOURREALID",
   ```

7. Publish all app files, including `analytics.js`, `analytics-config.js`, `analytics.css`, `analytics-privacy.html` and the updated service worker. Keep these files beside `index.html`; do not upload only the index file. The same applies to the `404.html` fallback.
8. Keep Google signals, advertising personalization, advertising sharing and user-provided data collection off for this trainer stream. In the property's data-retention settings, choose the shortest period that meets your needs; 2 months is a reasonable initial setting. This is separate from the 180-day browser-cookie lifetime in the integration.

Only unblocked, online visitors who have not opted out can be counted. Analytics blockers, opt-outs and browser privacy signals reduce counts. Training works when analytics is unavailable. The integration makes no location-provider requests itself: geographic reporting comes from GA4's IP-based location.

## Test the connected build

1. Open the published trainer in a fresh browser profile, verify that analytics starts without opening a popup. Use **Analytics privacy** at the bottom of the trainer to disable or re-enable it.
2. In GA4 open **Reports → Realtime**. Look for the trainer stream's `page_view`.
3. Open VFR and IFR, tune to ATIS and select Monitor ATIS. Switch among app sections and practice for at least 30 seconds. Look for the events in the table below. Applying Setup alone is not counted as beginning training.
4. Complete a stage, then finish a training flight. Verify one stage-complete event for that stage and one training-complete event for the run. Previous/Next revisits should not duplicate completions.
5. To use **DebugView**, temporarily set `debug: true` in `analytics-config.js` and republish. Return it to `false` after verification.
6. Choose **Analytics privacy → No thanks**. Confirm no further collection requests are sent. Reload and verify that the Google tag is not loaded. Check that the trainer still works.
7. Test on a phone as well. Analytics preference controls wrap to fit narrow screens. The trainer never requests GPS permission.

The local QA verifies event generation with a mocked Google tag. It cannot prove delivery into your GA account. Realtime/DebugView verification must be done after the real Measurement ID is configured and published. Standard reports and new custom definitions can take 24–48 hours to populate.

## Event map

| Event | Meaning |
|---|---|
| `page_view` | Initial app view and navigation to another section; same-section clicks are deduplicated |
| `trainer_active_time` | Active seconds, emitted about every 30 seconds and when context changes or the page is hidden |
| `trainer_training_start` | First tuned ATIS monitoring or transmission for a training run |
| `trainer_stage_start` | First practice/view of each stage in an active run |
| `trainer_stage_complete` | Stage completed; deduplicated per run, with separate circuit stages |
| `trainer_training_complete` | Final stage/practice completed; deduplicated per run |
| `trainer_training_abandon` | Setup applied/reset while an unfinished run exists |
| `trainer_pattern_choice` | More Pattern Work or End Practice selected |

Closing a tab is not called a definitive abandonment: delivery on exit is best-effort. Compare started versus completed runs to estimate unfinished training; `trainer_training_abandon` counts explicit resets only. Analytics sessions and training runs are different: one visit can contain several training runs. No persistent run ID is transmitted.

## Register dashboard dimensions and active time

Under **Admin → Custom definitions**, add these **event-scoped custom dimensions**:

| Display name | Event parameter |
|---|---|
| Trainer Section | `section` |
| Trainer Mode | `trainer_mode` |
| Flight Type | `flight_type` |
| Training Stage | `stage_id` |
| Pattern Action | `pattern_action` |
| Trainer Version | `app_version` |
| Activity Kind | `activity_kind` |

Add a **custom metric** named **Trainer Active Seconds**, event parameter **`active_seconds`**, unit **Seconds**. Do not create user IDs, callsign dimensions or raw IP dimensions.

## Build the owner dashboard in GA4

Use **Explore → Free form**, select the last 7 or 30 days, and filter to your trainer stream. Save these tabs:

| Tab | Rows/dimensions | Metrics/filter |
|---|---|---|
| Visitors and visits | Date | Total users, Sessions; stream filter |
| Location | Country, Region, City | Total users, Sessions |
| Most-used sections | Trainer Section | Views (page views) and Total users |
| Time by section | Trainer Section | Trainer Active Seconds; filter Event name = `trainer_active_time` |
| Flight types | Trainer Mode, Flight Type | Event count; filter Event name = `trainer_training_start` |
| Training completion | Event name, Trainer Mode, Flight Type | Event count; include training_start, training_complete and training_abandon |
| Practice stages | Training Stage, Trainer Mode | Event count; filter stage_start or stage_complete separately |

Country, Region and City are built-in dimensions; do not add custom location fields. Do not sum Total users across city/section rows to infer the overall unique-user total. To obtain average active practice time, divide the filtered active seconds by the matching training starts (same dates, stream, mode and flight type); the provider's standard engagement-time metric uses a different definition. General section time includes setup/reading. Filter Activity Kind = `practice` on `trainer_active_time` to isolate time during a started, unfinished training run. Activity Kind = `browsing` covers setup, reading and completed-run review.

Privacy note: these are pseudonymous browser/session measurements, not verified identities. They are not precise GPS or a list of named pilots. The footer privacy link opens enable/disable choices. No analytics popup opens automatically. First-time visitors are measured automatically unless their browser sends a supported privacy signal. Previously granted or declined preferences are preserved. It preserves the entire training experience when declined. This integration does not alter flight-report storage.

## Official references

- Stream setup and Measurement ID: https://support.google.com/analytics/answer/9304153
- Custom events and Realtime/DebugView: https://developers.google.com/analytics/devguides/collection/ga4/events
- Custom metrics: https://support.google.com/analytics/answer/14239619
- Geographic dimensions: https://support.google.com/analytics/answer/9268042
- Google Analytics privacy: https://support.google.com/analytics/answer/6004245


## V6.06 delivery reliability

The integration retries a failed Google tag load up to three times, with a short increasing delay. Reconnecting to the network triggers recovery. During initial tag loading or a detected offline period, up to 200 usage events are held in memory for up to 30 minutes and handed to the tag once available. They are not saved across page reloads. Delayed events may appear at reconnect time. Disabling analytics discards this queue and cancels scheduled retries.

The queue contains only the same enumerated section/stage/type and numeric timing fields. No audio or radio text is added. Page-hide and visibility changes flush active-time totals. These are best-effort delivery improvements, not a guarantee of Google receipt. Browser privacy signals, saved opt-outs and analytics blockers are not bypassed. No alternate tracking domain or fingerprinting is used.
