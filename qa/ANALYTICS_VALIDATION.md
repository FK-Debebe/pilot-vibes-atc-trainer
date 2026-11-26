# V6.05 validation

Automated local checks passed:

- Disabled/unconfigured analytics makes no provider-script requests.
- Opt-out preferences and browser privacy signals control loading; withdrawal stops event generation and clears analytics cookies.
- Active time excludes hidden tabs and caps idle time at 60 seconds after the last interaction.
- Section navigation, VFR/IFR modes and flight types produce enumerated parameters.
- Training starts, stages, circuit choices and completions are deduplicated within a run.
- Event payloads exclude callsigns, audio, transcripts, report contents and URL query strings.
- VFR and IFR evaluator hooks were exercised using a telemetry spy.
- Existing flight-following, no-flight-following, traffic-pattern and Ground ATIS flows still pass.
- Inline app JavaScript, analytics module and service-worker syntax checks passed.

Run from the parent of this app folder:

```sh
node standalone-v605/qa/analytics.cjs
node standalone-v605/qa/session-flows.cjs
node standalone-v605/qa/ground-atis.cjs
node standalone-v605/qa/pattern-options.cjs
```

Limitations: Measurement ID G-BSZSTV58Y4 is configured. Delivery to Google Analytics and owner dashboard reports have not been verified; no test traffic was sent to the live property. Browser-level/mobile visual verification remains to be performed on the published app; the local browser executable was unavailable. Local tests mock the Google tag and send no analytics data externally. Follow ANALYTICS_SETUP.md to connect and verify the deployed stream.

V6.05 also verifies that no analytics panel opens automatically, the footer link opens preferences, new visitors are tracked automatically unless opted out or privacy-blocked, and saved choices still apply.

V6.05 recovery checks passed for failed-tag retries, offline buffering, expiry and queue limits, exactly-once queue draining, and cancellation/discard on opt-out. These checks mock the Google tag; they do not verify server receipt.
